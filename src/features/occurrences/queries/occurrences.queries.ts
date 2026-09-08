import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { occurrencesApi } from "../../../api/occurrences.api";
import type {
  BoardFilters,
  CreateOccurrenceInput,
  OccurrenceDTO,
  Prioridade,
  WorkflowStatus,
} from "../../../domain/occurrences";
import {
  getPrioridadeConfig,
  getWorkflowStatusConfig,
} from "../../../app/config/occurrenceWorkflow";
import { occurrencesKeys } from "./occurrences.keys";

const BOARD_QUERY_PREFIX = ["occurrences", "board"] as const;

/** Aplica `patch` na ocorrência `id` em todas as listas de board em cache
 *  (otimista). Devolve os snapshots pra rollback. */
function patchBoardCaches(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<OccurrenceDTO>,
) {
  const snapshots = qc.getQueriesData<OccurrenceDTO[]>({ queryKey: BOARD_QUERY_PREFIX });
  for (const [key, data] of snapshots) {
    if (!data) continue;
    qc.setQueryData<OccurrenceDTO[]>(
      key,
      data.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );
  }
  return snapshots;
}

function restoreBoardCaches(
  qc: ReturnType<typeof useQueryClient>,
  snapshots: [readonly unknown[], OccurrenceDTO[] | undefined][],
) {
  for (const [key, data] of snapshots) qc.setQueryData(key, data);
}

export function useCreateOccurrence() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOccurrenceInput) =>
      occurrencesApi.createOccurrence(input),

    onSuccess: (_created, variables) => {
      qc.invalidateQueries({ queryKey: occurrencesKeys.all });

      // invalidar o dia do evento (eventDate)
      if (variables.eventDate) {
        qc.invalidateQueries({
          queryKey: occurrencesKeys.byDate(variables.eventDate),
        });
      }
    },
  });
}

export function useUpdateOccurrence() {
  const qc = useQueryClient();

  return useMutation({
    // Recebe um objeto contendo o id e os dados (input)
    mutationFn: ({ id, input }: { id: string; input: CreateOccurrenceInput }) =>
      occurrencesApi.updateOccurrence(id, input),

    onSuccess: (_updated, variables) => {
      // 1. Limpa o cache geral
      qc.invalidateQueries({ queryKey: occurrencesKeys.all });

      // 2. Limpa o cache da data específica para atualizar a lista
      if (variables.input.eventDate) {
        qc.invalidateQueries({
          queryKey: occurrencesKeys.byDate(variables.input.eventDate),
        });
      }

      // 3. Limpa o cache do detalhe desta ocorrência específica (se você tiver uma key para detalhe)
      qc.invalidateQueries({ queryKey: ["occurrence", variables.id] });
    },
  });
}

// ── Central de Ocorrências ─────────────────────────────────────────────────

type Actor = { actorUserId?: string | null; actorNome?: string | null };

export function useBoardOccurrences(filters: BoardFilters) {
  return useQuery({
    queryKey: occurrencesKeys.board(filters),
    queryFn: () => occurrencesApi.listBoard(filters),
    staleTime: 30_000,
  });
}

export function useOccurrenceHistory(id: string | null | undefined) {
  return useQuery({
    queryKey: occurrencesKeys.history(id ?? "—"),
    queryFn: () => occurrencesApi.getHistory(id as string),
    enabled: !!id,
    staleTime: 15_000,
  });
}

type PatchStatusVars = { id: string; status: WorkflowStatus; actor?: Actor; note?: string | null };
type PatchPrioridadeVars = { id: string; prioridade: Prioridade; actor?: Actor };

/** Troca o status com atualização OTIMISTA: o card muda de coluna na hora, a
 *  gravação no banco acontece em segundo plano (rollback + toast em caso de erro). */
export function usePatchStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, actor, note }: PatchStatusVars) =>
      occurrencesApi.patchStatus(id, status, { ...actor, note }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: BOARD_QUERY_PREFIX });
      const snapshots = patchBoardCaches(qc, id, { workflowStatus: status });
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.snapshots) restoreBoardCaches(qc, ctx.snapshots);
      toast.error("Não foi possível mudar o status.");
    },
    onSuccess: (_r, { status }) => {
      toast.success(`Movida para "${getWorkflowStatusConfig(status).label}".`);
    },
    onSettled: (_r, _e, { id }) => {
      qc.invalidateQueries({ queryKey: occurrencesKeys.all });
      qc.invalidateQueries({ queryKey: occurrencesKeys.history(id) });
    },
  });
}

export function useDeleteOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => occurrencesApi.deleteOccurrence(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: occurrencesKeys.all });
    },
  });
}

export function useImportPassagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof occurrencesApi.importPassagem>[0]) =>
      occurrencesApi.importPassagem(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: occurrencesKeys.all });
    },
  });
}

export function usePatchPrioridade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, prioridade, actor }: PatchPrioridadeVars) =>
      occurrencesApi.patchPrioridade(id, prioridade, actor ?? {}),
    onMutate: async ({ id, prioridade }) => {
      await qc.cancelQueries({ queryKey: BOARD_QUERY_PREFIX });
      const snapshots = patchBoardCaches(qc, id, { prioridade });
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.snapshots) restoreBoardCaches(qc, ctx.snapshots);
      toast.error("Não foi possível mudar a prioridade.");
    },
    onSuccess: (_r, { prioridade }) => {
      toast.success(`Prioridade: ${getPrioridadeConfig(prioridade).label}.`);
    },
    onSettled: (_r, _e, { id }) => {
      qc.invalidateQueries({ queryKey: occurrencesKeys.all });
      qc.invalidateQueries({ queryKey: occurrencesKeys.history(id) });
    },
  });
}
