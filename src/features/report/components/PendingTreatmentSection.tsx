import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  ClipboardCheck,
  RefreshCw,
  ExternalLink,
  CircleCheck,
  CircleAlert,
  CircleHelp,
  CircleDashed,
  FilePlus2,
} from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import type { OccurrenceDTO } from "../../../domain/occurrences";
import { useReport } from "../ReportContext";
import { Panel } from "./primitives";
import { occDisplayName, primaryDriver, firstName } from "../occ-helpers";
import {
  syncRizerSolucionado,
  registerRizerPendentes,
  type RizerRegisterPendentesResult,
} from "../../../api/rizerSolucionado.api";
import { useAgentStatus } from "../../../hooks/useAgentStatus";
import { useAutomationFolders, type AutomationFolders } from "../../../hooks/useAutomationFolders";
import { AutomationFoldersModal } from "../../../app/components/AutomationFoldersModal";

// Origem do RIZER pro deep-link "abrir no RIZER". Valor fixo (o domínio da
// Viação Catedral é estável e a automação no backend já usa esse mesmo host
// via RIZER_DISCIPLINARY_URL). `VITE_RIZER_BASE_URL` é só um override opcional
// caso o domínio mude — não precisa ser configurado.
const RIZER_BASE_URL = (
  (import.meta.env.VITE_RIZER_BASE_URL as string | undefined) ||
  "https://viacaocatedralocorrencias.rizerapps.com"
).replace(/\/$/, "");

const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO: "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE: "Vale",
  REGISTRO: "Registro",
};

function medidaLabel(o: OccurrenceDTO): string {
  if (o.tratativa) return TRATATIVA_LABEL[o.tratativa] ?? o.tratativa;
  if (o.suspensao) return "Suspensão";
  if (o.advertencia) return "Advertência";
  return "—";
}

function rizerEditUrl(rizerId: string): string {
  return `${RIZER_BASE_URL}/ocorrencias_disciplinares/${rizerId}/edit`;
}

function verificadoLabel(iso: string | null | undefined): string {
  if (!iso) return "nunca verificado";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `verificado ${formatDistanceToNow(d, { addSuffix: true, locale: ptBR })}`;
}

// "Registro" (tratativa === REGISTRO) = "apenas registrar", sem medida
// disciplinar — já está resolvida do nosso lado, mesmo que o RIZER nunca
// receba o status "Solucionado". Conta como tratada.
export function isTratada(o: OccurrenceDTO): boolean {
  return Boolean(o.solucionado) || o.tratativa === "REGISTRO";
}

type RowStatus = "solucionada" | "registro" | "pendente-verificada" | "nao-verificada";

function rowStatus(o: OccurrenceDTO): RowStatus {
  if (o.solucionado) return "solucionada";
  if (o.tratativa === "REGISTRO") return "registro";
  return o.solucionadoVerificadoEm ? "pendente-verificada" : "nao-verificada";
}

const STATUS_META: Record<
  RowStatus,
  { Icon: typeof CircleCheck; cls: string; label: string }
> = {
  solucionada: {
    Icon: CircleCheck,
    cls: "text-emerald-500 dark:text-emerald-400",
    label: "Solucionada no RIZER",
  },
  registro: {
    Icon: ClipboardCheck,
    cls: "text-emerald-500 dark:text-emerald-400",
    label: "Registro — tratada no nosso sistema (sem medida disciplinar)",
  },
  "pendente-verificada": {
    Icon: CircleAlert,
    cls: "text-amber-500 dark:text-amber-400",
    label: "Pendente de tratamento (verificada)",
  },
  "nao-verificada": {
    Icon: CircleDashed,
    cls: "text-gray-300 dark:text-gray-600",
    label: "Ainda não verificada no RIZER",
  },
};

const PAGE_SIZE = 25;

// Cursor da verificação persistido — permite retomar de onde parou se a aba
// for fechada/recarregada no meio (mesma ideia da fila de lote da Home).
const SYNC_CURSOR_KEY = "rizer_sync_cursor_v1";
type SyncCursor = { from: string; to: string; afterId: string; done: number; total: number };

function loadSyncCursor(): SyncCursor | null {
  try {
    const raw = localStorage.getItem(SYNC_CURSOR_KEY);
    return raw ? (JSON.parse(raw) as SyncCursor) : null;
  } catch {
    return null;
  }
}
function saveSyncCursor(c: SyncCursor | null) {
  try {
    if (c) localStorage.setItem(SYNC_CURSOR_KEY, JSON.stringify(c));
    else localStorage.removeItem(SYNC_CURSOR_KEY);
  } catch {
    /* ignore */
  }
}

export function PendingTreatmentSection() {
  const { all, period, periodLabel } = useReport();
  const queryClient = useQueryClient();
  const agentAvailable = useAgentStatus();
  const automationFolders = useAutomationFolders();
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  // `running` cobre a rodada inteira (vários lotes encadeados); `sync.isPending`
  // é só o lote atual. `loteAtual` é só pro rótulo do progresso.
  const [running, setRunning] = useState(false);
  const [loteAtual, setLoteAtual] = useState(0);
  const autoRuns = useRef(0);
  // Cursor de paginação entre lotes encadeados (id da última ocorrência lida).
  const afterIdRef = useRef<string | undefined>(undefined);
  // Acumula os números da rodada inteira (o agente devolve só por lote).
  const syncAcc = useRef({ verificadas: 0, solucionadas: 0, naoVerificaveis: 0 });
  // Cursor salvo de uma rodada interrompida (para "Retomar").
  const [savedCursor, setSavedCursor] = useState<SyncCursor | null>(() => loadSyncCursor());
  const resumable =
    savedCursor && savedCursor.from === period.start && savedCursor.to === period.end && savedCursor.afterId
      ? savedCursor
      : null;

  // Progresso das rodadas (verificação/registro) — barra no cabeçalho.
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    kind: "verify" | "register";
  } | null>(null);
  const progTotalRef = useRef(0);
  const progDoneRef = useRef(0);

  // ── Registro em lote das "Fora do RIZER" ──────────────────────────────────
  const [showFoldersModal, setShowFoldersModal] = useState(false);
  const [regRunning, setRegRunning] = useState(false);
  const [regLote, setRegLote] = useState(0);
  const regAutoRuns = useRef(0);
  const regAfterIdRef = useRef<string | undefined>(undefined);
  const regAcc = useRef({ registradas: 0, falhas: 0 });
  const foldersRef = useRef<AutomationFolders | null>(automationFolders.config);
  const [regResult, setRegResult] = useState<{
    registradas: number;
    falharam: RizerRegisterPendentesResult["falharam"];
    precisamDecisao: number;
  } | null>(null);
  useEffect(() => {
    foldersRef.current = automationFolders.config;
  }, [automationFolders.config]);

  const invalidateDays = () =>
    queryClient.invalidateQueries({
      predicate: (q) => q.queryKey[0] === "report" && q.queryKey[1] === "day",
    });

  // Enquanto uma rodada (verificação ou registro) está em andamento, recarrega
  // os dias do período a cada 8s — o agente grava no banco ocorrência por
  // ocorrência, então a tela vai refletindo o progresso sem esperar o lote.
  useEffect(() => {
    if (!running && !regRunning) return;
    const t = setInterval(invalidateDays, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, regRunning]);

  // A auditoria olha o período inteiro, independente do filtro global do
  // painel — "somente o período selecionado", como pedido.
  const { registradas, rows, pendentes, tratadas, foraDoRizer, semId, naoVerificadas, verificaveis } =
    useMemo(() => {
      const byDateTime = (a: OccurrenceDTO, b: OccurrenceDTO) =>
        (a.eventDate + (a.startTime ?? "")).localeCompare(b.eventDate + (b.startTime ?? ""));
      const registradas = all.filter((o) => o.rizerRegistered);
      const pendentes = registradas.filter((o) => !isTratada(o)).sort(byDateTime);
      const tratadas = registradas.filter(isTratada).sort(byDateTime);
      // "Registro" não precisa de leitura no RIZER — só as demais são "verificáveis".
      const verificaveis = registradas.filter((o) => o.tratativa !== "REGISTRO");
      return {
        registradas,
        // Pendentes primeiro (é o que exige ação); tratadas ao fim, esmaecidas.
        rows: [...pendentes, ...tratadas],
        pendentes,
        tratadas,
        verificaveis,
        foraDoRizer: all.filter((o) => !o.rizerRegistered),
        semId: pendentes.filter((o) => !o.rizerId),
        naoVerificadas: verificaveis.filter((o) => !o.solucionadoVerificadoEm).length,
      };
    }, [all]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  useEffect(() => setPage(0), [period.start, period.end]);

  // Teto de lotes encadeados por rodada (40 × 60 = 2400 ocorrências) — trava de
  // segurança contra loop infinito caso `restantes` nunca zere.
  const MAX_LOTES = 40;

  const sync = useMutation({
    mutationFn: () =>
      syncRizerSolucionado(period.start, period.end, {
        useAgent: agentAvailable,
        afterId: afterIdRef.current,
        max: 15,
      }),
    onSuccess: (r) => {
      setLastRun(r.verificadoEm);
      invalidateDays();
      afterIdRef.current = r.lastId ?? afterIdRef.current;
      syncAcc.current.verificadas += r.verificadas;
      syncAcc.current.solucionadas += r.solucionadas;
      syncAcc.current.naoVerificaveis += r.naoVerificaveis;

      // Progresso: total = processado até agora + restantes (fixado no 1º lote).
      progDoneRef.current += r.verificadas + r.naoVerificaveis;
      if (progTotalRef.current === 0) progTotalRef.current = progDoneRef.current + r.restantes;
      setProgress({
        done: progDoneRef.current,
        total: Math.max(progTotalRef.current, progDoneRef.current),
        kind: "verify",
      });

      const acc = syncAcc.current;
      const partes = [
        `${acc.verificadas} verificada${acc.verificadas !== 1 ? "s" : ""}`,
        `${acc.solucionadas} solucionada${acc.solucionadas !== 1 ? "s" : ""}`,
      ];
      if (acc.naoVerificaveis > 0) partes.push(`${acc.naoVerificaveis} não verificável(is)`);

      // Salva o cursor pra permitir retomar se a aba fechar no meio.
      if (r.restantes > 0 && afterIdRef.current) {
        const cur: SyncCursor = {
          from: period.start,
          to: period.end,
          afterId: afterIdRef.current,
          done: progDoneRef.current,
          total: Math.max(progTotalRef.current, progDoneRef.current),
        };
        saveSyncCursor(cur);
        setSavedCursor(cur);
      }

      if (r.restantes > 0 && autoRuns.current < MAX_LOTES) {
        autoRuns.current += 1;
        setLoteAtual(autoRuns.current + 1);
        toast.message(`RIZER: ${partes.join(" · ")} — continuando (${r.restantes} restantes)…`);
        sync.mutate();
      } else {
        setRunning(false);
        autoRuns.current = 0;
        setLoteAtual(0);
        setProgress(null);
        if (r.restantes > 0) {
          toast.warning(`RIZER: ${partes.join(" · ")} — ${r.restantes} restantes, clique em "Retomar"`);
        } else {
          saveSyncCursor(null);
          setSavedCursor(null);
          toast.success(`RIZER: ${partes.join(" · ")}`);
        }
      }
    },
    onError: (e) => {
      setRunning(false);
      autoRuns.current = 0;
      setLoteAtual(0);
      setProgress(null);
      // cursor fica salvo — dá pra retomar depois
      toast.error(`Falha ao verificar no RIZER: ${(e as Error)?.message ?? "erro desconhecido"}`);
    },
  });

  function startSync(resume = false) {
    autoRuns.current = 0;
    syncAcc.current = { verificadas: 0, solucionadas: 0, naoVerificaveis: 0 };
    if (resume && resumable) {
      afterIdRef.current = resumable.afterId;
      progDoneRef.current = resumable.done;
      progTotalRef.current = resumable.total;
      setProgress({ done: resumable.done, total: resumable.total, kind: "verify" });
    } else {
      afterIdRef.current = undefined;
      progDoneRef.current = 0;
      progTotalRef.current = 0;
      saveSyncCursor(null);
      setSavedCursor(null);
      setProgress({ done: 0, total: Math.max(1, pendentes.length), kind: "verify" });
    }
    setLoteAtual(1);
    setRunning(true);
    sync.mutate();
  }

  const registerMut = useMutation({
    mutationFn: () =>
      registerRizerPendentes(
        period.start,
        period.end,
        {
          relatoriosFolderId: foldersRef.current?.relatoriosFolderId,
          medidasFolderId: foldersRef.current?.medidasFolderId,
        },
        { useAgent: agentAvailable, afterId: regAfterIdRef.current, max: 8 },
      ),
    onSuccess: (r) => {
      setLastRun(r.verificadoEm);
      invalidateDays();
      regAfterIdRef.current = r.lastId ?? regAfterIdRef.current;
      regAcc.current.registradas += r.registradas;
      regAcc.current.falhas += r.falharam.length;

      progDoneRef.current += r.registradas + r.falharam.length;
      if (progTotalRef.current === 0) progTotalRef.current = progDoneRef.current + r.restantes;
      setProgress({
        done: progDoneRef.current,
        total: Math.max(progTotalRef.current, progDoneRef.current),
        kind: "register",
      });

      setRegResult((prev) => ({
        registradas: (prev?.registradas ?? 0) + r.registradas,
        falharam: [...(prev?.falharam ?? []), ...r.falharam],
        precisamDecisao: r.precisamDecisao,
      }));

      if (r.restantes > 0 && regAutoRuns.current < MAX_LOTES) {
        regAutoRuns.current += 1;
        setRegLote(regAutoRuns.current + 1);
        toast.message(
          `RIZER: ${regAcc.current.registradas} registrada(s) — continuando (${r.restantes} restantes)…`,
        );
        registerMut.mutate();
      } else {
        setRegRunning(false);
        regAutoRuns.current = 0;
        setRegLote(0);
        setProgress(null);
        const { registradas: ok, falhas } = regAcc.current;
        const extra: string[] = [];
        if (falhas > 0) extra.push(`${falhas} falharam`);
        if (r.precisamDecisao > 0) extra.push(`${r.precisamDecisao} sem tratativa (defina na Home)`);
        const suffix = extra.length ? ` · ${extra.join(" · ")}` : "";
        if (ok > 0 && falhas === 0) toast.success(`RIZER: ${ok} registrada(s)${suffix}`);
        else if (ok === 0) toast.warning(`RIZER: nada registrado${suffix || "."}`);
        else toast.warning(`RIZER: ${ok} registrada(s)${suffix}`);
      }
    },
    onError: (e) => {
      setRegRunning(false);
      regAutoRuns.current = 0;
      setRegLote(0);
      setProgress(null);
      toast.error(`Falha ao registrar no RIZER: ${(e as Error)?.message ?? "erro desconhecido"}`);
    },
  });

  function startRegister() {
    if (!foldersRef.current) {
      setShowFoldersModal(true);
      return;
    }
    regAutoRuns.current = 0;
    regAfterIdRef.current = undefined;
    regAcc.current = { registradas: 0, falhas: 0 };
    progDoneRef.current = 0;
    progTotalRef.current = 0;
    setProgress({ done: 0, total: Math.max(1, foraDoRizer.length), kind: "register" });
    setRegResult(null);
    setRegLote(1);
    setRegRunning(true);
    registerMut.mutate();
  }

  const busy = running || regRunning;
  const canSync = agentAvailable && !busy && registradas.length > 0;
  const canRegister = agentAvailable && !busy && foraDoRizer.length > 0;

  if (all.length === 0) return null;

  return (
    <Panel as="section" className="overflow-hidden scroll-mt-24">
      <div id="pendentes-tratamento" />
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
          <ClipboardCheck className="w-3.5 h-3.5 text-gray-400" />
          Ocorrências pendentes de tratamento
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">{periodLabel}</span>

        <div className="ml-auto flex items-center gap-2">
          {!agentAvailable && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 hidden sm:inline">
              RIZER Agent offline
            </span>
          )}
          {agentAvailable && !running && lastRun && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:inline">
              {verificadoLabel(lastRun)}
            </span>
          )}
          {progress && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[11px] whitespace-nowrap tabular-nums",
                  progress.kind === "verify"
                    ? "text-orange-500 dark:text-orange-400"
                    : "text-blue-500 dark:text-blue-400",
                )}
              >
                {progress.kind === "verify" ? "verificando" : "registrando"} {progress.done}/{progress.total}
                {(progress.kind === "verify" ? loteAtual : regLote) > 1 &&
                  ` · lote ${progress.kind === "verify" ? loteAtual : regLote}`}
              </span>
              <div className="w-24 sm:w-32 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progress.kind === "verify" ? "bg-orange-500" : "bg-blue-500",
                    (sync.isPending || registerMut.isPending) && "animate-pulse",
                  )}
                  style={{
                    width: `${Math.max(
                      3,
                      Math.min(100, Math.round((progress.done / Math.max(1, progress.total)) * 100)),
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
          <button
            onClick={startRegister}
            disabled={!canRegister}
            className={cn(
              "cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors",
              !canRegister
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700",
            )}
            title={
              !agentAvailable
                ? "Abra o RIZER Agent para registrar as ocorrências"
                : "Registra no RIZER as ocorrências do período ainda não registradas (medida derivada da tratativa; sem tratativa é pulada)"
            }
          >
            <FilePlus2 className={cn("w-3.5 h-3.5", regRunning && "animate-pulse")} />
            {regRunning ? "Registrando…" : `Registrar pendentes${foraDoRizer.length ? ` (${foraDoRizer.length})` : ""}`}
          </button>
          {!running && resumable && (
            <button
              onClick={() => startSync(false)}
              disabled={!canSync}
              className="cursor-pointer text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-40"
              title="Descartar o progresso salvo e verificar tudo de novo"
            >
              do zero
            </button>
          )}
          <button
            onClick={() => startSync(!!resumable)}
            disabled={!canSync}
            className={cn(
              "cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors",
              !canSync
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-orange-500 text-white hover:bg-orange-600",
            )}
            title={
              !agentAvailable
                ? "Abra o RIZER Agent para verificar o Status das ocorrências"
                : resumable
                  ? `Retoma a verificação de onde parou (${resumable.done}/${resumable.total})`
                  : "Abre o RIZER e lê o Status de cada ocorrência registrada no período"
            }
          >
            <RefreshCw className={cn("w-3.5 h-3.5", running && "animate-spin")} />
            {running
              ? "Verificando…"
              : resumable
                ? `Retomar (${resumable.done}/${resumable.total})`
                : "Verificar no RIZER"}
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-800">
        <SummaryTile
          icon={<ClipboardCheck className="w-4 h-4" />}
          label="Registradas no RIZER"
          value={registradas.length}
          tone="neutral"
        />
        <SummaryTile
          icon={<CircleCheck className="w-4 h-4" />}
          label="Tratadas"
          value={tratadas.length}
          tone="emerald"
        />
        <SummaryTile
          icon={<CircleAlert className="w-4 h-4" />}
          label="Pendentes de tratamento"
          value={pendentes.length}
          tone="amber"
        />
        <SummaryTile
          icon={<CircleHelp className="w-4 h-4" />}
          label="Fora do RIZER"
          value={foraDoRizer.length}
          tone="neutral"
        />
      </div>

      {/* Legenda dos ícones da coluna "Situação" */}
      <div className="px-5 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
        <LegendItem status="nao-verificada" />
        <LegendItem status="pendente-verificada" />
        <LegendItem status="solucionada" />
        <LegendItem status="registro" />
        {naoVerificadas > 0 && (
          <span className="ml-auto text-gray-400 dark:text-gray-500">
            {naoVerificadas} de {verificaveis.length} nunca verificada
            {naoVerificadas !== 1 ? "s" : ""} no RIZER
          </span>
        )}
      </div>

      {regResult && (
        <div className="px-5 py-2.5 text-[11px] text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-blue-50/40 dark:bg-blue-950/20">
          <span className="font-medium text-gray-700 dark:text-gray-300">Registro em lote:</span>{" "}
          {regResult.registradas} registrada{regResult.registradas !== 1 ? "s" : ""}
          {regResult.precisamDecisao > 0 &&
            ` · ${regResult.precisamDecisao} sem tratativa (defina na Home antes de registrar)`}
          {regResult.falharam.length > 0 && ` · ${regResult.falharam.length} falharam:`}
          {regResult.falharam.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {regResult.falharam.slice(0, 10).map((f) => (
                <li key={f.id} className="text-gray-500 dark:text-gray-500">
                  • {f.motorista ?? f.id.slice(0, 8)} — {f.motivo}
                </li>
              ))}
              {regResult.falharam.length > 10 && (
                <li className="text-gray-400 dark:text-gray-500">
                  … e mais {regResult.falharam.length - 10}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {semId.length > 0 && (
        <div className="px-5 py-2 text-[11px] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-amber-50/50 dark:bg-amber-950/20">
          {semId.length} pendente{semId.length !== 1 ? "s" : ""} sem ID do RIZER salvo — a verificação tenta
          localizar por matrícula + tipo; até lá, não há link direto para o registro.
        </div>
      )}

      {registradas.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhuma ocorrência registrada no RIZER neste período.
        </div>
      ) : (
        <>
          {pendentes.length === 0 && (
            <div className="px-5 py-2.5 text-center text-xs text-emerald-600 dark:text-emerald-400 border-b border-gray-100 dark:border-gray-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              Todas as {registradas.length} ocorrências registradas no RIZER estão tratadas.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed min-w-[900px]">
              <colgroup>
                <col className="w-[40px]" />
                <col className="w-[84px]" />
                <col className="w-[64px]" />
                <col className="w-[128px]" />
                <col className="w-[72px]" />
                <col className="w-[132px]" />
                <col className="w-[140px]" />
                <col className="w-[104px]" />
                <col className="w-[120px]" />
                <col className="w-[92px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500">
                  <th className="px-2.5 py-2" />
                  <Th>Data/Hora</Th>
                  <Th>Prefixo</Th>
                  <Th>Motorista</Th>
                  <Th>Matrícula</Th>
                  <Th>Tipo</Th>
                  <Th>Local</Th>
                  <Th>Medida</Th>
                  <Th>Autor</Th>
                  <Th>RIZER</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((o) => {
                  const d = primaryDriver(o);
                  const st = rowStatus(o);
                  const meta = STATUS_META[st];
                  return (
                    <tr
                      key={o.id}
                      className={cn(
                        "border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors",
                        (st === "solucionada" || st === "registro") && "opacity-55",
                      )}
                    >
                      <td className="px-2.5 py-2.5 align-middle">
                        <span
                          className="inline-flex"
                          title={
                            st === "pendente-verificada"
                              ? `${meta.label} · ${verificadoLabel(o.solucionadoVerificadoEm)}`
                              : meta.label
                          }
                        >
                          <meta.Icon className={cn("w-4 h-4", meta.cls)} aria-label={meta.label} />
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 align-middle whitespace-nowrap font-mono text-gray-600 dark:text-gray-400">
                        <div className="font-semibold text-gray-700 dark:text-gray-300">{o.startTime || "--:--"}</div>
                        <div className="text-[10px] text-gray-400">
                          {o.eventDate.slice(8)}/{o.eventDate.slice(5, 7)}
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 align-middle font-mono text-gray-700 dark:text-gray-300 truncate">
                        {o.vehicleNumber || "—"}
                      </td>
                      <td className="px-2.5 py-2.5 align-middle text-gray-700 dark:text-gray-300">
                        <span className="truncate block" title={d?.name ?? ""}>
                          {d?.name ? firstName(d.name) : "—"}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 align-middle font-mono text-gray-600 dark:text-gray-400 truncate">
                        {d?.registry || "—"}
                      </td>
                      <td className="px-2.5 py-2.5 align-middle">
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate block" title={occDisplayName(o)}>
                          {occDisplayName(o)}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 align-middle text-gray-500 dark:text-gray-500">
                        <span className="truncate block" title={o.place}>
                          {o.place || "—"}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 align-middle text-gray-600 dark:text-gray-400 truncate">
                        {medidaLabel(o)}
                      </td>
                      <td className="px-2.5 py-2.5 align-middle text-gray-600 dark:text-gray-400">
                        <span className="truncate block" title={o.analisadoPor ?? ""}>
                          {o.analisadoPor ? firstName(o.analisadoPor) : "—"}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 align-middle">
                        {o.rizerId ? (
                          <a
                            href={rizerEditUrl(o.rizerId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                            title="Abrir o registro no RIZER"
                          >
                            Abrir
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600" title="Sem ID do RIZER salvo">
                            sem ID
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {rows.length} registro{rows.length !== 1 ? "s" : ""} · página {safePage + 1} de {pageCount}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  className="cursor-pointer px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="cursor-pointer px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showFoldersModal && (
        <AutomationFoldersModal
          current={automationFolders.config}
          onConfirm={(data) => {
            automationFolders.save(data);
            foldersRef.current = data;
            setShowFoldersModal(false);
            toast.message('Pastas do Drive salvas — clique em "Registrar pendentes" de novo.');
          }}
          onClose={() => setShowFoldersModal(false)}
        />
      )}
    </Panel>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2.5 py-2 text-left font-semibold uppercase tracking-wide whitespace-nowrap">{children}</th>
  );
}

function LegendItem({ status }: { status: RowStatus }) {
  const { Icon, cls, label } = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={cn("w-3.5 h-3.5", cls)} />
      {label}
    </span>
  );
}

const TILE_TONE: Record<string, string> = {
  neutral: "text-gray-600 dark:text-gray-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
};

function SummaryTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "neutral" | "emerald" | "amber";
}) {
  return (
    <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3">
      <span className={cn("shrink-0", TILE_TONE[tone])}>{icon}</span>
      <div className="min-w-0">
        <div className={cn("text-xl font-bold leading-none tabular-nums", TILE_TONE[tone])}>{value}</div>
        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}
