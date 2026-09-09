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
import { TRATATIVA_LABEL, fmtDateBR } from "./fichaHelpers";

type Props = {
  occurrenceId: string;
  onVoltar: () => void;
  onEditar: (id: string) => void;
  onGerarRelatorio: (id: string) => void;
};

const htmlText = (h?: string | null) => (h ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const LABEL = "text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500";
const H2 = "text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
const BTN =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

function Cell({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={className}>
      <p className={LABEL}>{label}</p>
      <p className="mt-0.5 text-sm text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  );
}

export function FichaOcorrenciaPage({ occurrenceId, onVoltar, onEditar, onGerarRelatorio }: Props) {
  const { profileName, user } = useAuth();
  const qc = useQueryClient();
  const actor = useMemo(
    () => ({ actorUserId: user?.id ?? null, actorNome: profileName || null }),
    [user?.id, profileName],
  );
  const refreshFicha = () => qc.invalidateQueries({ queryKey: ["occurrence", occurrenceId] });

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
  const [relatoOpen, setRelatoOpen] = useState(false);

  const o = q.data as unknown as OccurrenceDetailDTO | undefined;

  const d = useMemo(() => {
    if (!o) return null;
    const isGenerico = o.typeCode === "GENERICO";
    const titulo = isGenerico
      ? o.reportTitle || o.typeTitle || "Ocorrência"
      : o.occurrenceName || getOccurrenceTypeConfig(o.typeCode).title || o.typeTitle || "Ocorrência";
    const d1 = o.drivers?.find((x) => x.position === 1) ?? null;
    const d2 = o.drivers?.find((x) => x.position === 2) ?? null;
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
    const semTratativa = !o.analisadoPor && !o.tratativa && !(o as any).justificativaRegistro;
    return { isGenerico, titulo, d1, d2, hasReport, semRelatorio, hora, linha, base, relato, devolutiva, semTratativa };
  }, [o]);

  if (q.isLoading) {
    return (
      <Shell onVoltar={onVoltar}>
        <p className="py-24 text-center text-sm text-gray-400">Carregando ficha…</p>
      </Shell>
    );
  }
  if (q.isError || !o || !d) {
    return (
      <Shell onVoltar={onVoltar}>
        <div className="py-24 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">Não foi possível carregar a ocorrência.</p>
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
  const relatoLongo = d.relato.length > 1100;

  const applyStatus = (next: WorkflowStatus) =>
    patchStatus.mutate({ id: o.id, status: next, actor }, { onSuccess: refreshFicha });
  const onStatusSelect = (next: WorkflowStatus) => {
    if (next === o.workflowStatus) return;
    if (STATUS_NEEDS_CONFIRM.includes(next)) setPendingStatus(next);
    else applyStatus(next);
  };

  const actions = (
    <div className="flex items-center gap-2">
      {d.semRelatorio ? (
        <button
          onClick={() => onGerarRelatorio(o.id)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <FileText className="h-3.5 w-3.5" />
          Gerar relatório
        </button>
      ) : (
        <button onClick={() => setShowReport(true)} className={BTN}>
          <FileText className="h-3.5 w-3.5" />
          Abrir relatório
        </button>
      )}
      <button onClick={() => onEditar(o.id)} className={BTN}>
        <Pencil className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Editar</span>
      </button>
      <button onClick={() => setShareOpen(true)} className={BTN}>
        <Share2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Compartilhar</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Mais ações"
            className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
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
  );

  const drivers = [d.d1, d.d2].filter(Boolean) as NonNullable<typeof d.d1>[];

  return (
    <Shell onVoltar={onVoltar} right={actions}>
      {pendingStatus && (
        <Callout tone="amber">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {pendingStatus === "TRATADA"
              ? "Marcar esta ocorrência como tratada?"
              : `Mover para "${getWorkflowStatusConfig(pendingStatus).label}"?`}{" "}
            A mudança fica registrada no histórico.
          </p>
          <div className="mt-2.5 flex justify-end gap-2">
            <button
              onClick={() => setPendingStatus(null)}
              className="cursor-pointer rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/50"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                applyStatus(pendingStatus);
                setPendingStatus(null);
              }}
              className="cursor-pointer rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Confirmar
            </button>
          </div>
        </Callout>
      )}
      {confirmDelete && (
        <Callout tone="red">
          <p className="text-sm text-red-800 dark:text-red-300">
            Excluir a ocorrência do veículo <strong>{o.vehicleNumber}</strong> ({d.titulo})? Esta
            ação não pode ser desfeita.
          </p>
          <div className="mt-2.5 flex justify-end gap-2">
            <button
              disabled={del.isPending}
              onClick={() => setConfirmDelete(false)}
              className="cursor-pointer rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              Cancelar
            </button>
            <button
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
        </Callout>
      )}

      {/* ── Cabeçalho: identificação da ocorrência ─────────────────── */}
      <header className="mb-6 border-b border-gray-200/80 pb-6 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.badge}`}>
            {statusCfg.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${prioCfg.dot}`} />
            Gravidade {prioCfg.label.toLowerCase()}
          </span>
          {isRecentlyCreated(o.createdAt) && (
            <span className="rounded bg-blue-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              Novo
            </span>
          )}
        </div>

        <h1 className="mt-3 text-[1.7rem] font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-50">
          {d.titulo}
        </h1>

        <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <Cell label="Prefixo" value={o.vehicleNumber} />
          <Cell
            label="Data / hora"
            value={`${fmtDateBR(o.eventDate)}${d.hora ? ` — ${d.hora}` : ""}`}
          />
          <Cell label="Linha / viagem" value={d.linha} className="col-span-2 lg:col-span-2" />
          <Cell label="Local" value={o.place} />
          <Cell label="Base" value={d.base} />
        </dl>

        {drivers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {drivers.map((dr) => (
              <span
                key={dr.position}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 py-0.5 pl-0.5 pr-2.5 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${avatarColor(dr.name)}`}
                >
                  {initialsOf(dr.name)}
                </span>
                {dr.registry ? `${dr.registry} · ` : ""}
                {dr.name}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* ── Corpo: 3 colunas ─────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 divide-y divide-gray-200/70 lg:grid-cols-[236px_minmax(0,1fr)_300px] lg:divide-x lg:divide-y-0 dark:divide-gray-800">
          {/* Esquerda — Resumo / metadados */}
          <aside className="p-5 lg:p-6">
            <h2 className={H2}>Resumo</h2>
            <div className="mt-4 space-y-4">
              <Cell label="O que aconteceu" value={d.titulo} />
              <Cell
                label="Quando"
                value={`${fmtDateBR(o.eventDate)}${d.hora ? ` — ${d.hora}` : ""}`}
              />
              <Cell label="Onde" value={o.place || d.linha} />
              <Cell label="Quem" value={drivers.map((x) => x.name).join(" · ")} />
              <Cell
                label="Veículo"
                value={`${o.vehicleNumber}${o.vehicleKm ? ` · ${o.vehicleKm} km` : ""}`}
              />
              <Cell label="Linha / viagem" value={d.linha} />
              <Cell label="Operador CCO" value={o.ccoOperator} />
              <Cell label="Situação atual" value={statusCfg.label} />
            </div>
            {d.semRelatorio && (
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                Linha, horário, motorista e tratativa são preenchidos ao gerar o relatório.
              </p>
            )}
          </aside>

          {/* Centro — relato + evidências + tratativa */}
          <div className="min-w-0 space-y-8 p-5 lg:p-7">
            <section>
              <h2 className={H2}>Relato completo</h2>
              {d.relato ? (
                <>
                  <div
                    className={`relative mt-3 ${
                      relatoLongo && !relatoOpen ? "max-h-[360px] overflow-hidden" : ""
                    }`}
                  >
                    <div
                      className="prose prose-sm max-w-[74ch] text-[15px] leading-relaxed text-gray-800 dark:prose-invert dark:text-gray-200"
                      dangerouslySetInnerHTML={{ __html: o.relatoHtml ?? "" }}
                    />
                    {relatoLongo && !relatoOpen && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent dark:from-gray-900" />
                    )}
                  </div>
                  {relatoLongo && (
                    <button
                      onClick={() => setRelatoOpen((v) => !v)}
                      className="mt-2 cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {relatoOpen ? "Recolher" : "Ler mais"}
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                  O relato detalhado é preenchido no relatório.
                </p>
              )}

              {d.devolutiva && (
                <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                  <p className={LABEL}>
                    Devolutiva / complementos
                    {o.devolutivaStatus ? ` · ${o.devolutivaStatus}` : ""}
                  </p>
                  <div
                    className="prose prose-sm mt-2 max-w-[74ch] text-gray-700 dark:prose-invert dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: o.devolutivaHtml ?? "" }}
                  />
                </div>
              )}
            </section>

            <FichaEvidencias
              evidences={ev.data ?? []}
              loading={ev.isLoading}
              driveWebViewLink={o.driveWebViewLink}
            />

            <section>
              <h2 className={H2}>Tratativa</h2>
              {d.semTratativa ? (
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                  {d.semRelatorio
                    ? "Responsável e tratativa são definidos ao gerar o relatório."
                    : "Sem tratamento registrado ainda."}
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <Cell label="Responsável" value={o.analisadoPor} />
                  <Cell label="Aberta em" value={fmtDateBR(o.createdAt?.slice(0, 10))} />
                  {o.tratativa && (
                    <Cell label="Tratativa" value={TRATATIVA_LABEL[o.tratativa] ?? o.tratativa} />
                  )}
                  {o.tratativa === "SUSPEICAO" && o.suspensao && (
                    <Cell
                      label="Suspensão"
                      value={`${o.suspensao.dias} dia(s) · a partir de ${fmtDateBR(o.suspensao.dataInicio)}`}
                    />
                  )}
                  {o.tratativa === "ADVERTENCIA" && <Cell label="Advertência" value="Aplicada" />}
                  {(o as any).justificativaRegistro && (
                    <Cell
                      label="Observações"
                      className="col-span-2 sm:col-span-3"
                      value={(o as any).justificativaRegistro}
                    />
                  )}
                  <Cell
                    label="Situação"
                    value={o.workflowStatus === "TRATADA" ? "Encerrada" : "Em acompanhamento"}
                  />
                  {o.rizerRegistered && (
                    <Cell label="RIZER" value={o.solucionado ? "Solucionado" : "Registrado"} />
                  )}
                </div>
              )}
              <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                A edição da tratativa é feita em “Editar ocorrência”.
              </p>
            </section>
          </div>

          {/* Direita — informações complementares */}
          <aside className="space-y-5 bg-gray-50/60 p-5 dark:bg-gray-900/40 lg:p-6">
            <div>
              <p className={LABEL}>Status</p>
              <div className="mt-1.5">
                <PickSelect
                  size="sm"
                  ariaLabel="Alterar status"
                  disabled={patchStatus.isPending}
                  value={o.workflowStatus ?? "PENDENTE"}
                  onChange={(v) => onStatusSelect(v as WorkflowStatus)}
                  options={WORKFLOW_STATUSES.map((s) => ({ value: s.code, label: s.label, dot: s.dot }))}
                />
              </div>
            </div>

            <div className="border-t border-gray-200/70 pt-4 dark:border-gray-800">
              <p className={LABEL}>Classificação</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200">
                <span className={`inline-block h-2 w-2 rounded-full ${prioCfg.dot}`} />
                {prioCfg.label}
              </p>
            </div>

            <div className="border-t border-gray-200/70 pt-4 dark:border-gray-800">
              <Cell label="Responsável" value={o.analisadoPor || "—"} />
            </div>

            <div className="border-t border-gray-200/70 pt-4 dark:border-gray-800">
              <p className={LABEL}>Identificação</p>
              <dl className="mt-1.5 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-400">ID</dt>
                  <dd className="tabular-nums text-gray-700 dark:text-gray-300">#{o.id.slice(0, 8)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-400">Prefixo</dt>
                  <dd className="text-gray-700 dark:text-gray-300">{o.vehicleNumber}</dd>
                </div>
                {d.linha && (
                  <div className="flex justify-between gap-2">
                    <dt className="shrink-0 text-gray-400">Linha</dt>
                    <dd className="truncate text-right text-gray-700 dark:text-gray-300">{d.linha}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="border-t border-gray-200/70 pt-4 dark:border-gray-800">
              <FichaTimeline entries={history.data} loading={history.isLoading} />
            </div>
          </aside>
        </div>
      </div>

      <OccurrencePreviewModal
        occurrenceId={showReport ? o.id : null}
        open={showReport}
        onClose={() => setShowReport(false)}
      />
      <CompartilharDialog occurrenceId={o.id} open={shareOpen} onOpenChange={setShareOpen} />
    </Shell>
  );
}

function Callout({ tone, children }: { tone: "amber" | "red"; children: React.ReactNode }) {
  const cls =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30"
      : "border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-950/30";
  return <div className={`mb-6 rounded-lg border p-3 ${cls}`}>{children}</div>;
}

function Shell({
  onVoltar,
  right,
  children,
}: {
  onVoltar: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-gray-50/95 backdrop-blur dark:border-gray-900 dark:bg-gray-950/95">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            onClick={onVoltar}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-gray-200 pl-1.5 pr-2.5 text-[13px] font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
          <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 sm:flex">
            <MapPin className="h-3.5 w-3.5" />
            Ficha de ocorrência
          </span>
          {right && <div className="ml-auto">{right}</div>}
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
    </div>
  );
}
