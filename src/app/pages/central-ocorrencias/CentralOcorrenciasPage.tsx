import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type {
  BoardFilters,
  OccurrenceDTO,
  Prioridade,
  WorkflowStatus,
} from "../../../domain/occurrences";
import { occurrencesApi } from "../../../api/occurrences.api";
import { dtoToOcorrencia } from "../../../utils/occurrenceMapper";
import { normalizeText } from "../../../utils/occurrenceVisibility";
import { getLocalDateString } from "../../../utils/dateUtils";
import { useAuth } from "../../context/AuthContext";
import {
  useBoardOccurrences,
  usePatchStatus,
} from "../../../features/occurrences/queries/occurrences.queries";
import { occurrencesKeys } from "../../../features/occurrences/queries/occurrences.keys";
import {
  BOARD_COLUMNS,
  STATUS_NEEDS_CONFIRM,
  getWorkflowStatusConfig,
  nextBoardStatus,
} from "../../config/occurrenceWorkflow";
import type { Ocorrencia } from "../../types";
import { NovaOcorrencia } from "../nova-ocorrencia";
import { ConfirmActionModal } from "../home/ConfirmActionModal";
import { QuickOccurrenceModal } from "./QuickOccurrenceModal";
import { BoardColumn } from "./BoardColumn";
import { BoardFilters as BoardFiltersBar, emptyBoardFilters, type BoardUiFilters } from "./BoardFilters";
import { BoardIndicators, type IndicatorFilter } from "./BoardIndicators";
import { OccurrenceDetailPanel } from "./OccurrenceDetailPanel";

interface Props {
  onVoltar: () => void;
}

const EMPTY_LIST: OccurrenceDTO[] = [];

export function CentralOcorrenciasPage({ onVoltar }: Props) {
  const queryClient = useQueryClient();
  const { profileName, user } = useAuth();

  // Tela diária: por padrão carrega só o dia de hoje. O período é ajustável
  // nos filtros (De / Até) pra puxar dias anteriores quando precisar.
  const [filters, setFilters] = useState<BoardUiFilters>(() => {
    const today = getLocalDateString(new Date());
    return emptyBoardFilters(today, today);
  });
  const [indicator, setIndicator] = useState<IndicatorFilter>({ kind: "all" });
  // Guarda só o id — o objeto do painel é sempre derivado da lista viva, pra
  // refletir na hora mudanças feitas pelo próprio painel (status, prioridade).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editando, setEditando] = useState<Ocorrencia | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ id: string; to: WorkflowStatus } | null>(null);

  // ── Drag-and-drop nativo (HTML5) — sem react-dnd ─────────────────────────
  const [drag, setDrag] = useState<{ id: string; from: WorkflowStatus } | null>(null);
  const dragRef = useRef<{ id: string; from: WorkflowStatus } | null>(null);
  dragRef.current = drag;
  const [overStatus, setOverStatus] = useState<WorkflowStatus | null>(null);

  const patchStatus = usePatchStatus();

  // Só o período vai ao servidor; o resto é filtrado em memória sobre a
  // janela retornada (volume da Fase 1 comporta).
  const apiFilters: BoardFilters = useMemo(
    () => ({ from: filters.from, to: filters.to }),
    [filters.from, filters.to],
  );
  const { data, isLoading, isError, refetch, isFetching } = useBoardOccurrences(apiFilters);

  // Objeto do painel de detalhe — sempre a versão atual da lista.
  const selected = useMemo(
    () => (selectedId ? (data ?? []).find((o) => o.id === selectedId) ?? null : null),
    [data, selectedId],
  );

  const actor = useMemo(
    () => ({ actorUserId: user?.id ?? null, actorNome: profileName || null }),
    [user?.id, profileName],
  );

  // A Central é compartilhada: todo usuário vê todas as ocorrências do
  // período (diferente da Home, que filtra por analista). Sem gating de admin.
  const visible = data ?? EMPTY_LIST;

  // Filtros locais (tudo menos o período).
  const filtered = useMemo(() => {
    const q = normalizeText(filters.search);
    const terms = q ? q.split(/\s+/).filter(Boolean) : [];
    const typeSet = new Set(filters.typeCodes);
    const prioSet = new Set<Prioridade>(filters.prioridades);

    return visible.filter((o) => {
      if (typeSet.size && !typeSet.has(o.typeCode)) return false;
      if (prioSet.size && !prioSet.has((o.prioridade ?? "MEDIA") as Prioridade)) return false;
      if (filters.hasReport) {
        const has = !!o.driveWebViewLink || !!o.rizerRegistered;
        if (filters.hasReport === "true" && !has) return false;
        if (filters.hasReport === "false" && has) return false;
      }
      if (indicator.kind === "status" && o.workflowStatus !== indicator.status) return false;
      if (
        indicator.kind === "priority" &&
        !indicator.priorities.includes((o.prioridade ?? "MEDIA") as Prioridade)
      )
        return false;
      if (terms.length) {
        const hay = normalizeText(
          [
            o.vehicleNumber,
            o.lineLabel ?? "",
            o.tripLineName ?? "",
            o.typeTitle ?? "",
            o.reportTitle ?? "",
            o.occurrenceName ?? "",
            o.place ?? "",
            o.baseCode ?? "",
            o.analisadoPor ?? "",
            o.id,
            ...(o.drivers ?? []).flatMap((d) => [d.registry, d.name, d.baseCode]),
          ].join(" "),
        );
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [visible, filters, indicator]);

  const byStatus = useMemo(() => {
    const map = new Map<string, OccurrenceDTO[]>();
    for (const s of BOARD_COLUMNS) map.set(s, []);
    for (const o of filtered) {
      const s = o.workflowStatus ?? "PENDENTE";
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(o);
    }
    return map;
  }, [filtered]);

  async function handleEditar(id: string) {
    try {
      const [full, signed] = await Promise.all([
        occurrencesApi.getOccurrenceById(id),
        occurrencesApi.getEvidenceSignedUrls(id).catch(() => []),
      ]);
      setSelectedId(null);
      setEditando(dtoToOcorrencia(full as any, signed));
    } catch {
      toast.error("Erro ao carregar ocorrência.");
    }
  }

  function afterSave() {
    setEditando(null);
    queryClient.invalidateQueries({ queryKey: occurrencesKeys.all });
    toast.success("Ocorrência salva.");
  }

  // id da última ocorrência movida — dispara a animação de entrada no card
  // quando ele remonta na coluna nova.
  const [movedId, setMovedId] = useState<string | null>(null);
  const movedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyMove = useCallback(
    (id: string, to: WorkflowStatus) => {
      setMovedId(id);
      if (movedTimer.current) clearTimeout(movedTimer.current);
      movedTimer.current = setTimeout(
        () => setMovedId((cur) => (cur === id ? null : cur)),
        450,
      );
      // toasts + rollback ficam no hook (atualização otimista)
      patchStatus.mutate({ id, status: to, actor });
    },
    [patchStatus, actor],
  );

  // Clicar num card pra ver detalhe: abre o painel e descarta qualquer
  // confirmação de mudança de status pendente (evita os dois na tela juntos).
  const handleCardClick = useCallback((o: OccurrenceDTO) => {
    setPendingMove(null);
    setSelectedId(o.id);
  }, []);

  const onCardDragStart = useCallback((o: OccurrenceDTO) => {
    // começar a arrastar não é "inspecionar" — fecha o painel de detalhe.
    setSelectedId(null);
    setDrag({ id: o.id, from: (o.workflowStatus ?? "PENDENTE") as WorkflowStatus });
  }, []);

  const onCardDragEnd = useCallback(() => {
    setDrag(null);
    setOverStatus(null);
  }, []);

  const onHover = useCallback((s: WorkflowStatus | null) => {
    setOverStatus((prev) => (prev === s ? prev : s));
  }, []);

  const onDropHere = useCallback(
    (to: WorkflowStatus) => {
      const item = dragRef.current;
      setOverStatus(null);
      setDrag(null);
      if (!item || item.from === to) return;
      if (STATUS_NEEDS_CONFIRM.includes(to)) setPendingMove({ id: item.id, to });
      else applyMove(item.id, to);
    },
    [applyMove],
  );

  const onCardAdvance = useCallback(
    (o: OccurrenceDTO) => {
      const to = nextBoardStatus(o.workflowStatus);
      if (!to) return;
      if (STATUS_NEEDS_CONFIRM.includes(to)) setPendingMove({ id: o.id, to });
      else applyMove(o.id, to);
    },
    [applyMove],
  );

  if (editando) {
    return (
      <NovaOcorrencia
        edicao={editando}
        onVoltar={() => setEditando(null)}
        onSaved={afterSave}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="cursor-pointer p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center">
            <img src="/logo.png" alt="" className="h-full w-full object-contain dark:hidden" />
            <img src="/favicon-dark.png" alt="" className="hidden h-full w-full object-contain dark:block" />
          </span>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Central de Ocorrências</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <button
              onClick={() => setQuickOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova ocorrência
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 space-y-4">
        <BoardIndicators occurrences={visible} active={indicator} onPick={setIndicator} />
        <BoardFiltersBar
          value={filters}
          onChange={setFilters}
          onReset={() => {
            setFilters(emptyBoardFilters(filters.from, filters.to));
            setIndicator({ kind: "all" });
          }}
          resultCount={filtered.length}
        />

        {isError ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Não foi possível carregar o quadro.
            </p>
            <button
              onClick={() => refetch()}
              className="cursor-pointer px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white text-sm font-medium transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando quadro…</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {BOARD_COLUMNS.map((s) => (
              <BoardColumn
                key={s}
                status={s}
                occurrences={byStatus.get(s) ?? []}
                onCardClick={handleCardClick}
                onCardDragStart={onCardDragStart}
                onCardDragEnd={onCardDragEnd}
                onCardAdvance={onCardAdvance}
                onHover={onHover}
                onDropHere={onDropHere}
                dragFrom={drag?.from ?? null}
                draggingId={drag?.id ?? null}
                justMovedId={movedId}
                over={overStatus === s}
              />
            ))}
          </div>
        )}
      </div>

      <QuickOccurrenceModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={(id, opts) => {
          queryClient.invalidateQueries({ queryKey: occurrencesKeys.all });
          if (opts?.openReport) handleEditar(id);
        }}
      />

      <OccurrenceDetailPanel
        occurrence={selected}
        open={!!selected}
        onClose={() => setSelectedId(null)}
        onEdit={handleEditar}
        actor={actor}
      />

      {pendingMove && (
        <ConfirmActionModal
          title="Confirmar mudança de status"
          confirmLabel={`Mover para ${getWorkflowStatusConfig(pendingMove.to).label}`}
          confirmClassName="bg-emerald-600 hover:bg-emerald-700"
          onCancel={() => setPendingMove(null)}
          onConfirm={() => {
            applyMove(pendingMove.id, pendingMove.to);
            setPendingMove(null);
          }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {pendingMove.to === "TRATADA"
              ? "Tem certeza que deseja marcar esta ocorrência como tratada? A mudança fica registrada no histórico."
              : "Tem certeza que deseja mover esta ocorrência? A mudança fica registrada no histórico."}
          </p>
        </ConfirmActionModal>
      )}
    </div>
  );
}
