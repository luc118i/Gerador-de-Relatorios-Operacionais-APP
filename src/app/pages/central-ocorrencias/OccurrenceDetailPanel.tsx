import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileText, History, Pencil, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { OccurrencePreviewModal } from "../occurrences/preview/OccurrencePreviewModal";
import type {
  OccurrenceDTO,
  OccurrenceHistoryEntry,
  Prioridade,
  WorkflowStatus,
} from "../../../domain/occurrences";
import {
  PRIORIDADES,
  STATUS_NEEDS_CONFIRM,
  WORKFLOW_STATUSES,
  getPrioridadeConfig,
  getWorkflowStatusConfig,
  isRecentlyCreated,
} from "../../config/occurrenceWorkflow";
import { getOccurrenceTypeConfig } from "../../config/occurrenceTypes";
import {
  useDeleteOccurrence,
  useOccurrenceHistory,
  usePatchPrioridade,
  usePatchStatus,
} from "../../../features/occurrences/queries/occurrences.queries";
import { PickSelect } from "./ui/PickSelect";

const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO: "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE: "Vale",
  REGISTRO: "Só o registro",
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(code: string | null): string {
  return code ? getWorkflowStatusConfig(code).label : "—";
}

function historyLine(h: OccurrenceHistoryEntry): string {
  switch (h.action) {
    case "CRIADA":
      return "Ocorrência criada";
    case "STATUS":
      return `Status: ${statusLabel(h.fromValue)} → ${statusLabel(h.toValue)}`;
    case "PRIORIDADE":
      return `Prioridade: ${getPrioridadeConfig(h.fromValue).label} → ${getPrioridadeConfig(h.toValue).label}`;
    case "TRATATIVA":
      return `Tratativa: ${TRATATIVA_LABEL[h.toValue ?? ""] ?? h.toValue ?? "—"}`;
    case "RELATORIO":
      return "Relatório gerado";
    case "NOTA":
      return h.note ?? "Anotação";
    default:
      return h.action;
  }
}

type Actor = { actorUserId?: string | null; actorNome?: string | null };

type Props = {
  occurrence: OccurrenceDTO | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  /** "Gerar relatório" — abre o formulário limpo (não a edição). */
  onGerarRelatorio: (id: string) => void;
  actor: Actor;
};

export function OccurrenceDetailPanel({
  occurrence: o,
  open,
  onClose,
  onEdit,
  onGerarRelatorio,
  actor,
}: Props) {
  const [showReport, setShowReport] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<WorkflowStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = useDeleteOccurrence();

  const history = useOccurrenceHistory(open && o ? o.id : null);
  const patchStatus = usePatchStatus();
  const patchPrioridade = usePatchPrioridade();

  if (!o) return null;

  const statusCfg = getWorkflowStatusConfig(o.workflowStatus);
  const prioCfg = getPrioridadeConfig(o.prioridade);
  const typeTitle =
    o.typeCode === "GENERICO" ? o.reportTitle || o.typeTitle : getOccurrenceTypeConfig(o.typeCode).title;
  const d1 = o.drivers?.find((d) => d.position === 1);
  const d2 = o.drivers?.find((d) => d.position === 2);
  const hasReport = !!o.driveWebViewLink || !!o.rizerRegistered;
  // Ocorrência cadastrada só na Central (importação / cadastro rápido) e que
  // ainda não virou relatório: não existe relatório pra abrir.
  const semRelatorio = o.origin === "CENTRAL" && !hasReport;
  // Horário só quando é real (import entra com 00:00 placeholder).
  const hora =
    o.startTime && o.startTime !== "00:00"
      ? o.endTime && o.endTime !== o.startTime
        ? `${o.startTime}–${o.endTime}`
        : o.startTime
      : "";
  const semTratamento = !o.analisadoPor && !o.tratativa && !o.justificativaRegistro;

  // toasts + rollback otimista ficam nos hooks usePatchStatus/usePatchPrioridade
  const applyStatus = (next: WorkflowStatus) => {
    patchStatus.mutate({ id: o.id, status: next, actor });
  };

  const onStatusSelect = (next: WorkflowStatus) => {
    if (next === o.workflowStatus) return;
    if (STATUS_NEEDS_CONFIRM.includes(next)) setPendingStatus(next);
    else applyStatus(next);
  };

  const onPrioSelect = (next: Prioridade) => {
    if (next === o.prioridade) return;
    patchPrioridade.mutate({ id: o.id, prioridade: next, actor });
  };

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-200">{value || "—"}</p>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {o.vehicleNumber}
              </span>
              {isRecentlyCreated(o.createdAt) && (
                <span className="rounded-full bg-blue-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  Novo
                </span>
              )}
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.badge}`}>
                {statusCfg.label}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${prioCfg.dot}`} />
                {prioCfg.label}
              </span>
            </div>
            <SheetTitle className="text-base leading-snug">{typeTitle}</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 px-4 py-4">
            {/* Controles de estado */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-gray-400">Status</span>
                <PickSelect
                  size="md"
                  ariaLabel="Status"
                  disabled={patchStatus.isPending}
                  value={o.workflowStatus ?? "PENDENTE"}
                  onChange={(v) => onStatusSelect(v as WorkflowStatus)}
                  options={WORKFLOW_STATUSES.map((s) => ({ value: s.code, label: s.label, dot: s.dot }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-gray-400">Prioridade</span>
                <PickSelect
                  size="md"
                  ariaLabel="Prioridade"
                  disabled={patchPrioridade.isPending}
                  value={o.prioridade ?? "MEDIA"}
                  onChange={(v) => onPrioSelect(v as Prioridade)}
                  options={PRIORIDADES.map((p) => ({ value: p.code, label: p.label, dot: p.dot }))}
                />
              </label>
            </div>

            {/* Confirmação inline da mudança de status — dentro do painel,
                logo abaixo do seletor, em vez de um modal no centro da tela. */}
            {pendingStatus && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/30 animate-in fade-in slide-in-from-top-1 duration-150">
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

            {/* Dados da ocorrência — só os campos com conteúdo real. O resto
                entra quando o relatório é gerado. */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Dados da ocorrência
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Data" value={o.eventDate?.split("-").reverse().join("/")} />
                {o.baseCode && o.baseCode !== "GENERICO" && <Field label="Base" value={o.baseCode} />}
                {hora && <Field label="Horário" value={hora} />}
                {(o.lineLabel || o.tripLineName) && (
                  <Field label="Linha" value={o.lineLabel || o.tripLineName} />
                )}
                {o.place && <Field label="Local" value={o.place} />}
                {d1?.name && (
                  <Field label="Motorista" value={`${d1.registry ? d1.registry + " · " : ""}${d1.name}`} />
                )}
                {d2?.name && (
                  <Field label="Motorista 2" value={`${d2.registry ? d2.registry + " · " : ""}${d2.name}`} />
                )}
              </div>
              {semRelatorio && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Linha, horário, motorista e tratativa são preenchidos ao gerar o relatório.
                </p>
              )}
            </section>

            {/* Relatório */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Relatório
              </h3>
              {semRelatorio ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onGerarRelatorio(o.id)}
                    className="inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Gerar relatório
                  </button>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Nenhum relatório gerado ainda.
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowReport(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Abrir relatório
                  </button>
                  {o.driveWebViewLink && (
                    <a
                      href={o.driveWebViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir no Drive
                    </a>
                  )}
                  <span className="inline-flex items-center text-xs text-gray-400 dark:text-gray-500">
                    {hasReport ? "Relatório gerado" : "Ainda sem relatório"}
                  </span>
                </div>
              )}
            </section>

            {/* Tratamento (read-only na Fase 1) */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Tratamento
              </h3>
              {semTratamento ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {semRelatorio
                    ? "Responsável e tratativa são definidos ao gerar o relatório."
                    : "Sem tratamento registrado ainda."}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {o.analisadoPor && <Field label="Responsável" value={o.analisadoPor} />}
                    {o.tratativa && (
                      <Field
                        label="Tratativa"
                        value={TRATATIVA_LABEL[o.tratativa] ?? o.tratativa}
                      />
                    )}
                    {o.justificativaRegistro && (
                      <div className="col-span-2">
                        <Field label="Observações" value={o.justificativaRegistro} />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    A edição completa do tratamento chega na próxima fase.
                  </p>
                </>
              )}
            </section>

            {/* Histórico */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <History className="w-3.5 h-3.5" />
                Histórico
              </h3>
              {history.isLoading ? (
                <p className="text-xs text-gray-400">Carregando…</p>
              ) : (history.data?.length ?? 0) === 0 ? (
                <p className="text-xs text-gray-400">Sem registros.</p>
              ) : (
                <ol className="space-y-3 border-l border-gray-200 dark:border-gray-800 pl-4">
                  {history.data!.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                      <p className="text-sm text-gray-800 dark:text-gray-200">{historyLine(h)}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        {fmtDateTime(h.createdAt)}
                        {h.actorNome ? ` · ${h.actorNome}` : ""}
                      </p>
                      {h.note && h.action !== "NOTA" && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{h.note}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className="pt-2">
              {confirmDelete ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800/60 dark:bg-red-950/30 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    Excluir a ocorrência do veículo <strong>{o.vehicleNumber}</strong>{" "}
                    ({typeTitle})? Esta ação não pode ser desfeita.
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
                            setConfirmDelete(false);
                            onClose();
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
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => onEdit(o.id)}
                    className="inline-flex cursor-pointer items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 hover:opacity-90"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar ocorrência
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <OccurrencePreviewModal
        occurrenceId={showReport ? o.id : null}
        open={showReport}
        onClose={() => setShowReport(false)}
      />
    </>
  );
}
