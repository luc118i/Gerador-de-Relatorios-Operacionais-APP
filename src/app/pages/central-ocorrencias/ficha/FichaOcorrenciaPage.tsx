import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  Copy,
  FileText,
  Home,
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
  onHome: () => void;
  onEditar: (id: string) => void;
  onGerarRelatorio: (id: string) => void;
};

const htmlText = (h?: string | null) => (h ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const H2 = "text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500";
const LABEL = "text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500";
const BTN =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

function Cell({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={className}>
      <p className={LABEL}>{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-200/70 pt-8 first:border-t-0 first:pt-0 dark:border-gray-800">
      <h2 className={H2}>{title}</h2>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

export function FichaOcorrenciaPage({ occurrenceId, onVoltar, onHome, onEditar, onGerarRelatorio }: Props) {
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
      <Shell onVoltar={onVoltar} onHome={onHome}>
        <p className="py-24 text-center text-sm text-gray-400">Carregando ficha…</p>
      </Shell>
    );
  }
  if (q.isError || !o || !d) {
    return (
      <Shell onVoltar={onVoltar} onHome={onHome}>
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
  const tratada = o.workflowStatus === "TRATADA";

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
          <span className="hidden sm:inline">Abrir relatório</span>
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

  return (
    <Shell onVoltar={onVoltar} onHome={onHome} right={actions}>
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

      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <header className="pb-8">
        <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-gray-900 dark:text-gray-50">
          {d.titulo}
        </h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px]">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.badge}`}>
            {statusCfg.label}
          </span>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${prioCfg.dot}`} />
            Gravidade {prioCfg.label.toLowerCase()}
          </span>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <span className="tabular-nums text-gray-500 dark:text-gray-400">
            {fmtDateBR(o.eventDate)}
            {d.hora ? ` · ${d.hora}` : ""}
          </span>
          {isRecentlyCreated(o.createdAt) && (
            <span className="rounded bg-blue-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              Novo
            </span>
          )}
        </div>
        <p className="mt-2 font-mono text-[11px] text-gray-400 dark:text-gray-600">#{o.id.slice(0, 8)}</p>
      </header>

      {/* ── Conteúdo + sidebar ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_272px]">
        {/* Sidebar — consulta rápida (abaixo no mobile, sticky no desktop) */}
        <aside className="order-last lg:order-2 lg:sticky lg:top-[68px] lg:self-start lg:border-l lg:border-gray-200/70 lg:pl-6 dark:lg:border-gray-800">
          <h2 className={`${H2} lg:mb-0`}>Resumo da ocorrência</h2>
          <dl className="mt-3.5 flex flex-wrap gap-x-8 gap-y-4 lg:flex-col lg:gap-y-5">
            <div className="lg:w-full">
              <p className={LABEL}>Status</p>
              <div className="mt-1.5 max-w-[220px]">
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
            <div>
              <p className={LABEL}>Gravidade</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                <span className={`inline-block h-2 w-2 rounded-full ${prioCfg.dot}`} />
                {prioCfg.label}
              </p>
            </div>
            <Cell label="Prefixo" value={o.vehicleNumber} />
            <Cell label="Motorista" value={d.d1?.name || "—"} />
            <Cell label="Operador" value={o.ccoOperator || "—"} />
            <Cell label="ID" value={<span className="font-mono">#{o.id.slice(0, 8)}</span>} />
          </dl>
        </aside>

        {/* Coluna principal */}
        <div className="order-first min-w-0 space-y-8 lg:order-1">
          <Sec title="Resumo">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <Cell
                label="Situação"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    {tratada && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    {statusCfg.label}
                  </span>
                }
              />
              <Cell label="Local" value={o.place || d.linha} />
              <Cell label="Operador CCO" value={o.ccoOperator} />
              <Cell
                label="Quando"
                value={`${fmtDateBR(o.eventDate)}${d.hora ? ` · ${d.hora}` : ""}`}
              />
            </div>
            {d.semRelatorio && (
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                Linha, horário, motorista e tratativa são preenchidos ao gerar o relatório.
              </p>
            )}
          </Sec>

          {(d.linha || d.d1 || o.vehicleNumber) && (
            <Sec title="Dados da viagem">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                <Cell label="Linha" value={d.linha} className="col-span-2 sm:col-span-2 lg:col-span-2" />
                <Cell label="Sentido" value={o.tripDirection} />
                <Cell label="Prefixo" value={o.vehicleNumber} />
                <Cell
                  label="Motorista"
                  value={d.d1 ? `${d.d1.registry ? d.d1.registry + " · " : ""}${d.d1.name}` : ""}
                />
                {d.d2 && (
                  <Cell
                    label="Motorista 2"
                    value={`${d.d2.registry ? d.d2.registry + " · " : ""}${d.d2.name}`}
                  />
                )}
                {o.vehicleKm ? <Cell label="KM" value={`${o.vehicleKm} km`} /> : null}
                <Cell label="Base" value={d.base} />
              </div>
            </Sec>
          )}

          <Sec title="Relato">
            {d.relato ? (
              <>
                <div
                  className={`relative ${
                    relatoLongo && !relatoOpen ? "max-h-[420px] overflow-hidden" : ""
                  }`}
                >
                  <div
                    className="prose prose-sm max-w-none text-[15px] leading-[1.75] text-gray-800 [&_p]:my-3 dark:prose-invert dark:text-gray-200"
                    dangerouslySetInnerHTML={{ __html: o.relatoHtml ?? "" }}
                  />
                  {relatoLongo && !relatoOpen && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-950" />
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
              <p className="text-sm text-gray-400 dark:text-gray-500">
                O relato detalhado é preenchido no relatório.
              </p>
            )}

            {d.devolutiva && (
              <div className="mt-5 rounded-lg border border-gray-200/80 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
                <p className={LABEL}>
                  Devolutiva / complementos
                  {o.devolutivaStatus ? ` · ${o.devolutivaStatus}` : ""}
                </p>
                <div
                  className="prose prose-sm mt-2 max-w-none text-gray-700 [&_p]:my-2.5 dark:prose-invert dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: o.devolutivaHtml ?? "" }}
                />
              </div>
            )}
          </Sec>

          <div className="border-t border-gray-200/70 pt-8 dark:border-gray-800">
            <FichaEvidencias
              evidences={ev.data ?? []}
              loading={ev.isLoading}
              driveWebViewLink={o.driveWebViewLink}
            />
          </div>

          <section className="border-t border-gray-200/70 pt-8 dark:border-gray-800">
            <h2 className={H2}>Tratativa</h2>
            {d.semTratativa ? (
              <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">
                {d.semRelatorio
                  ? "Responsável e tratativa são definidos ao gerar o relatório."
                  : "Sem tratamento registrado ainda."}
              </p>
            ) : (
              <div className="mt-3.5 rounded-lg border border-gray-200/80 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                  <Cell
                    label="Situação atual"
                    value={tratada ? "Encerrada" : "Em acompanhamento"}
                  />
                  <Cell label="Responsável" value={o.analisadoPor} />
                  <Cell label="Aberta em" value={fmtDateBR(o.createdAt?.slice(0, 10))} />
                  {o.tratativa && (
                    <Cell label="Ação" value={TRATATIVA_LABEL[o.tratativa] ?? o.tratativa} />
                  )}
                  {o.tratativa === "SUSPEICAO" && o.suspensao && (
                    <Cell
                      label="Suspensão"
                      value={`${o.suspensao.dias} dia(s) · a partir de ${fmtDateBR(o.suspensao.dataInicio)}`}
                    />
                  )}
                  {o.tratativa === "ADVERTENCIA" && <Cell label="Advertência" value="Aplicada" />}
                  {o.rizerRegistered && (
                    <Cell label="RIZER" value={o.solucionado ? "Solucionado" : "Registrado"} />
                  )}
                  {(o as any).justificativaRegistro && (
                    <Cell
                      label="Observações"
                      className="col-span-2 sm:col-span-3"
                      value={(o as any).justificativaRegistro}
                    />
                  )}
                </div>
              </div>
            )}
            <p className="mt-2.5 text-[11px] text-gray-400 dark:text-gray-500">
              A edição da tratativa é feita em “Editar ocorrência”.
            </p>
          </section>

          <section className="border-t border-gray-200/70 pt-8 dark:border-gray-800">
            <h2 className={H2}>Histórico da ocorrência</h2>
            <div className="mt-3.5">
              <FichaTimeline bare entries={history.data} loading={history.isLoading} />
            </div>
          </section>
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
  onHome,
  right,
  children,
}: {
  onVoltar: () => void;
  onHome: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="sticky top-0 z-20 border-b border-gray-200/70 bg-gray-50/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex h-12 max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            onClick={onVoltar}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-gray-200 pl-1.5 pr-2.5 text-[13px] font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
          <button
            onClick={onHome}
            title="Ir para a tela inicial"
            aria-label="Ir para a tela inicial"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Home className="h-4 w-4" />
          </button>
          <span className="hidden text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 sm:block">
            Ficha de ocorrência
          </span>
          {right && <div className="ml-auto">{right}</div>}
        </div>
      </div>
      <div className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">{children}</div>
    </div>
  );
}
