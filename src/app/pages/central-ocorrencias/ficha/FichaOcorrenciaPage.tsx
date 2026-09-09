import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  Copy,
  FileText,
  MapPin,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  User,
} from "lucide-react";

import { occurrencesApi } from "../../../../api/occurrences.api";
import type {
  OccurrenceDetailDTO,
  Prioridade,
  WorkflowStatus,
} from "../../../../domain/occurrences";
import {
  PRIORIDADES,
  STATUS_NEEDS_CONFIRM,
  WORKFLOW_STATUSES,
  getPrioridadeConfig,
  getWorkflowStatusConfig,
  isRecentlyCreated,
} from "../../../config/occurrenceWorkflow";
import { getOccurrenceTypeConfig } from "../../../config/occurrenceTypes";
import { resolveBaseSigla } from "../../../../utils/base";
import { avatarColor, initialsOf } from "../../../../utils/avatar";
import { useAuth } from "../../../context/AuthContext";
import {
  useDeleteOccurrence,
  useDuplicateOccurrence,
  useOccurrenceHistory,
  usePatchPrioridade,
  usePatchStatus,
} from "../../../../features/occurrences/queries/occurrences.queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { OccurrencePreviewModal } from "../../occurrences/preview/OccurrencePreviewModal";
import { PickSelect } from "../ui/PickSelect";
import { FichaTimeline } from "./FichaTimeline";
import { FichaEvidencias } from "./FichaEvidencias";
import { CompartilharDialog } from "./CompartilharDialog";
import { TRATATIVA_LABEL, Field, fmtDateBR } from "./fichaHelpers";

type Props = {
  occurrenceId: string;
  onVoltar: () => void;
  onEditar: (id: string) => void;
  onGerarRelatorio: (id: string) => void;
};

const htmlText = (h?: string | null) => (h ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function FichaOcorrenciaPage({
  occurrenceId,
  onVoltar,
  onEditar,
  onGerarRelatorio,
}: Props) {
  const { profileName, user } = useAuth();
  const qc = useQueryClient();
  const actor = useMemo(
    () => ({ actorUserId: user?.id ?? null, actorNome: profileName || null }),
    [user?.id, profileName],
  );
  const refreshFicha = () =>
    qc.invalidateQueries({ queryKey: ["occurrence", occurrenceId] });

  const q = useQuery({
    queryKey: ["occurrence", occurrenceId],
    queryFn: () => occurrencesApi.getOccurrenceById(occurrenceId),
  });
  const ev = useQuery({
    queryKey: ["occurrence", occurrenceId, "evidences"],
    queryFn: () => occurrencesApi.getEvidenceSignedUrls(occurrenceId),
  });
  const history = useOccurrenceHistory(occurrenceId);

  const patchStatus = usePatchStatus();
  const patchPrioridade = usePatchPrioridade();
  const del = useDeleteOccurrence();
  const dup = useDuplicateOccurrence();

  const [pendingStatus, setPendingStatus] = useState<WorkflowStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const o = q.data as unknown as OccurrenceDetailDTO | undefined;

  const derived = useMemo(() => {
    if (!o) return null;
    const isGenerico = o.typeCode === "GENERICO";
    const titulo = isGenerico
      ? o.reportTitle || o.typeTitle || "Ocorrência"
      : o.occurrenceName || getOccurrenceTypeConfig(o.typeCode).title || o.typeTitle || "Ocorrência";
    const d1 = o.drivers?.find((d) => d.position === 1) ?? null;
    const d2 = o.drivers?.find((d) => d.position === 2) ?? null;
    const hasReport = !!o.driveWebViewLink || !!o.rizerRegistered;
    const semRelatorio = o.origin === "CENTRAL" && !hasReport;
    const hora =
      o.startTime && o.startTime !== "00:00"
        ? o.endTime && o.endTime !== o.startTime
          ? `${o.startTime}–${o.endTime}`
          : o.startTime
        : "";
    const linha = o.lineLabel || o.tripLineName || "";
    const base = o.baseCode && o.baseCode !== "GENERICO" ? resolveBaseSigla(o.baseCode) : "";
    const relato = htmlText(o.relatoHtml);
    const devolutiva = htmlText(o.devolutivaHtml);
    const semTratativa =
      !o.analisadoPor && !o.tratativa && !(o as any).justificativaRegistro;
    return { isGenerico, titulo, d1, d2, hasReport, semRelatorio, hora, linha, base, relato, devolutiva, semTratativa };
  }, [o]);

  if (q.isLoading) {
    return (
      <Shell onVoltar={onVoltar}>
        <p className="py-24 text-center text-sm text-gray-400">Carregando ficha…</p>
      </Shell>
    );
  }
  if (q.isError || !o || !derived) {
    return (
      <Shell onVoltar={onVoltar}>
        <div className="py-24 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Não foi possível carregar a ocorrência.
          </p>
          <button
            onClick={() => q.refetch()}
            className="mt-3 cursor-pointer rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900"
          >
            Tentar novamente
          </button>
        </div>
      </Shell>
    );
  }

  const statusCfg = getWorkflowStatusConfig(o.workflowStatus);
  const prioCfg = getPrioridadeConfig(o.prioridade);

  const applyStatus = (next: WorkflowStatus) =>
    patchStatus.mutate(
      { id: o.id, status: next, actor },
      { onSuccess: refreshFicha },
    );
  const onStatusSelect = (next: WorkflowStatus) => {
    if (next === o.workflowStatus) return;
    if (STATUS_NEEDS_CONFIRM.includes(next)) setPendingStatus(next);
    else applyStatus(next);
  };

  return (
    <Shell onVoltar={onVoltar}>
      {/* Barra de ações */}
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        <PickSelect
          size="sm"
          ariaLabel="Alterar status"
          disabled={patchStatus.isPending}
          value={o.workflowStatus ?? "PENDENTE"}
          onChange={(v) => onStatusSelect(v as WorkflowStatus)}
          options={WORKFLOW_STATUSES.map((s) => ({ value: s.code, label: s.label, dot: s.dot }))}
        />

        {derived.semRelatorio ? (
          <button
            onClick={() => onGerarRelatorio(o.id)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <FileText className="h-3.5 w-3.5" />
            Gerar relatório
          </button>
        ) : (
          <button
            onClick={() => setShowReport(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FileText className="h-3.5 w-3.5" />
            Abrir relatório
          </button>
        )}

        <button
          onClick={() => onEditar(o.id)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>

        <button
          onClick={() => setShareOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Share2 className="h-3.5 w-3.5" />
          Compartilhar
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Mais ações"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Prioridade</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {PRIORIDADES.map((p) => (
                  <DropdownMenuItem
                    key={p.code}
                    onSelect={() =>
                      p.code !== o.prioridade &&
                      patchPrioridade.mutate(
                        { id: o.id, prioridade: p.code as Prioridade, actor },
                        { onSuccess: refreshFicha },
                      )
                    }
                    className={p.code === o.prioridade ? "text-blue-600 dark:text-blue-400" : ""}
                  >
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${p.dot}`} />
                    {p.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              onSelect={() =>
                dup.mutate(o.id, {
                  onSuccess: () => toast.success("Ocorrência duplicada."),
                  onError: () => toast.error("Não foi possível duplicar."),
                })
              }
            >
              <Copy className="h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {pendingStatus && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {pendingStatus === "TRATADA"
              ? "Marcar esta ocorrência como tratada?"
              : `Mover para "${getWorkflowStatusConfig(pendingStatus).label}"?`}{" "}
            A mudança fica registrada no histórico.
          </p>
          <div className="mt-2.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingStatus(null)}
              className="cursor-pointer rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                applyStatus(pendingStatus);
                setPendingStatus(null);
              }}
              className="cursor-pointer rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800/60 dark:bg-red-950/30">
          <p className="text-sm text-red-800 dark:text-red-300">
            Excluir a ocorrência do veículo <strong>{o.vehicleNumber}</strong> ({derived.titulo})?
            Esta ação não pode ser desfeita.
          </p>
          <div className="mt-2.5 flex justify-end gap-2">
            <button
              type="button"
              disabled={del.isPending}
              onClick={() => setConfirmDelete(false)}
              className="cursor-pointer rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={del.isPending}
              onClick={() =>
                del.mutate(o.id, {
                  onSuccess: () => {
                    toast.success("Ocorrência excluída.");
                    onVoltar();
                  },
                  onError: () => toast.error("Não foi possível excluir."),
                })
              }
              className="cursor-pointer rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {del.isPending ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </div>
      )}

      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 pb-6 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.badge}`}>
            {statusCfg.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${prioCfg.dot}`} />
            {prioCfg.label}
          </span>
          {isRecentlyCreated(o.createdAt) && (
            <span className="rounded bg-blue-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              Novo
            </span>
          )}
          <span className="ml-auto text-[11px] tabular-nums text-gray-400 dark:text-gray-600">
            #{o.id.slice(0, 8)}
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-50">
          {derived.titulo}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            Prefixo {o.vehicleNumber}
          </span>
          <span>·</span>
          <span>
            {fmtDateBR(o.eventDate)}
            {derived.hora ? ` — ${derived.hora}` : ""}
          </span>
          {derived.linha && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {derived.linha}
              </span>
            </>
          )}
          {derived.base && (
            <>
              <span>·</span>
              <span>{derived.base}</span>
            </>
          )}
        </p>

        {(derived.d1 || derived.d2) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[derived.d1, derived.d2].filter(Boolean).map((d) => (
              <span
                key={d!.position}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 py-0.5 pl-0.5 pr-2.5 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${avatarColor(d!.name)}`}
                >
                  {initialsOf(d!.name)}
                </span>
                {d!.registry ? `${d!.registry} · ` : ""}
                {d!.name}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="space-y-8 pt-6">
        {/* ── Resumo ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Resumo
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="O que" value={derived.titulo} />
            <Field
              label="Quando"
              value={`${fmtDateBR(o.eventDate)}${derived.hora ? ` — ${derived.hora}` : ""}`}
            />
            {(o.place || derived.linha) && (
              <Field label="Onde" value={o.place || derived.linha} />
            )}
            {(derived.d1 || derived.d2) && (
              <Field
                label="Quem"
                value={[derived.d1?.name, derived.d2?.name].filter(Boolean).join(" · ")}
              />
            )}
            <Field
              label="Veículo"
              value={`${o.vehicleNumber}${o.vehicleKm ? ` · ${o.vehicleKm} km` : ""}`}
            />
            {derived.linha && <Field label="Linha / viagem" value={derived.linha} />}
            {o.ccoOperator && <Field label="Operador CCO" value={o.ccoOperator} />}
            <Field label="Situação atual" value={statusCfg.label} />
          </div>
          {derived.semRelatorio && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              Linha, horário, motorista e tratativa são preenchidos ao gerar o relatório.
            </p>
          )}
        </section>

        {/* ── Relato completo ────────────────────────────────────── */}
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Relato completo
          </h2>
          {derived.relato ? (
            <div
              className="prose prose-sm mt-3 max-w-[68ch] text-[15px] leading-relaxed text-gray-800 dark:prose-invert dark:text-gray-200"
              dangerouslySetInnerHTML={{ __html: o.relatoHtml ?? "" }}
            />
          ) : (
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              O relato detalhado é preenchido no relatório.
            </p>
          )}

          {derived.devolutiva && (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Devolutiva / complementos
                {o.devolutivaStatus ? ` · ${o.devolutivaStatus}` : ""}
              </p>
              <div
                className="prose prose-sm mt-2 max-w-[68ch] text-gray-700 dark:prose-invert dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: o.devolutivaHtml ?? "" }}
              />
            </div>
          )}
        </section>

        {/* ── Tratativa ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Tratativa
          </h2>
          {derived.semTratativa ? (
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              {derived.semRelatorio
                ? "Responsável e tratativa são definidos ao gerar o relatório."
                : "Sem tratamento registrado ainda."}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {o.analisadoPor && <Field label="Responsável" value={o.analisadoPor} />}
              <Field label="Aberta em" value={fmtDateBR(o.createdAt?.slice(0, 10))} />
              {o.tratativa && (
                <Field label="Tratativa" value={TRATATIVA_LABEL[o.tratativa] ?? o.tratativa} />
              )}
              {o.tratativa === "SUSPEICAO" && o.suspensao && (
                <Field
                  label="Suspensão"
                  value={`${o.suspensao.dias} dia(s) · a partir de ${fmtDateBR(o.suspensao.dataInicio)}`}
                />
              )}
              {o.tratativa === "ADVERTENCIA" && (
                <Field label="Advertência" value="Aplicada" />
              )}
              {(o as any).justificativaRegistro && (
                <Field
                  label="Observações"
                  className="col-span-2 sm:col-span-3"
                  value={(o as any).justificativaRegistro}
                />
              )}
              <Field
                label="Situação"
                value={o.workflowStatus === "TRATADA" ? "Encerrada" : "Em acompanhamento"}
              />
              {o.rizerRegistered && (
                <Field label="RIZER" value={o.solucionado ? "Solucionado" : "Registrado"} />
              )}
            </div>
          )}
          <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
            A edição da tratativa é feita em “Editar ocorrência”.
          </p>
        </section>

        {/* ── Linha do tempo ─────────────────────────────────────── */}
        <FichaTimeline entries={history.data} loading={history.isLoading} />

        {/* ── Evidências ─────────────────────────────────────────── */}
        <FichaEvidencias
          evidences={ev.data ?? []}
          loading={ev.isLoading}
          driveWebViewLink={o.driveWebViewLink}
        />
      </div>

      <OccurrencePreviewModal
        occurrenceId={showReport ? o.id : null}
        open={showReport}
        onClose={() => setShowReport(false)}
      />

      <CompartilharDialog
        occurrenceId={o.id}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </Shell>
  );
}

function Shell({ onVoltar, children }: { onVoltar: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-gray-50/95 backdrop-blur dark:border-gray-900 dark:bg-gray-950/95">
        <div className="mx-auto flex h-11 max-w-3xl items-center px-4 sm:px-6">
          <button
            onClick={onVoltar}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-gray-200 pl-1.5 pr-2.5 text-[13px] font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
          <span className="ml-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            <User className="h-3.5 w-3.5" />
            Ficha de ocorrência
          </span>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}
