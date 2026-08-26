import { useEffect, useState } from "react";
import { Cpu, Gavel, AlertTriangle, RefreshCw, X, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from "lucide-react";
import { ShaderBackdrop } from "./ShaderBackdrop";

export type AgentJobKind = "registro" | "tratativa" | "revisar";

export interface AgentJob {
  kind: AgentJobKind;
  subject: string;
  doneCount: number;
  total: number;
  cancelRequested: boolean;
  onCancel: () => void;
}

const KIND_META: Record<AgentJobKind, { label: string; verb: string; icon: typeof Gavel; accent: string; bar: string; text: string; ring: string }> = {
  registro: {
    label: "Registrando no RIZER",
    verb: "registradas",
    icon: Gavel,
    accent: "bg-orange-500",
    bar: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    ring: "border-orange-200 dark:border-orange-800",
  },
  tratativa: {
    label: "Enviando tratativas",
    verb: "preenchidas",
    icon: AlertTriangle,
    accent: "bg-amber-500",
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    ring: "border-amber-200 dark:border-amber-800",
  },
  revisar: {
    label: "Revisando no RIZER",
    verb: "revisadas",
    icon: RefreshCw,
    accent: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    ring: "border-emerald-200 dark:border-emerald-800",
  },
};

/**
 * Dock flutuante global com o progresso das automações do agente.
 * Fica fixo no canto inferior direito, visível enquanto o usuário navega/rola
 * o sistema, para que possa deixar o agente registrando e seguir trabalhando.
 */
export function AgentProgressDock({ jobs }: { jobs: AgentJob[] }) {
  const [minimized, setMinimized] = useState(false);

  if (jobs.length === 0) return null;

  const activeCount = jobs.length;
  const anyRunning = jobs.some(
    (j) => !j.cancelRequested && j.doneCount < j.total,
  );

  // Mantém o fundo shader montado por um instante após a última tarefa
  // terminar, para que ele possa esmaecer suavemente em vez de sumir de vez.
  const [keepBackdrop, setKeepBackdrop] = useState(anyRunning);
  useEffect(() => {
    if (anyRunning) {
      setKeepBackdrop(true);
      return;
    }
    const t = setTimeout(() => setKeepBackdrop(false), 900);
    return () => clearTimeout(t);
  }, [anyRunning]);

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[330px] max-w-[calc(100vw-2rem)] select-none">
      <div className="rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Cabeçalho */}
        <button
          type="button"
          onClick={() => setMinimized((v) => !v)}
          className="relative w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-gray-900 text-white overflow-hidden group"
        >
          {/* Fundo shader animado enquanto há tarefa em andamento.
              Fica montado um pouco além do fim para esmaecer suavemente. */}
          <span className="pointer-events-none absolute inset-0 bg-gray-900 group-hover:bg-gray-800 transition-colors" />
          {keepBackdrop && (
            <span
              className={`pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-out ${
                anyRunning ? "opacity-60" : "opacity-0"
              }`}
            >
              <ShaderBackdrop scale={2.6} speed={0.45} wave={1.8} />
            </span>
          )}
          <span
            className={`pointer-events-none absolute inset-0 bg-gray-900/45 group-hover:bg-gray-900/30 transition-opacity duration-[900ms] ${
              keepBackdrop && anyRunning ? "opacity-100" : "opacity-0"
            }`}
          />

          <span className="relative z-10 flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <Cpu className="relative z-10 w-4 h-4 shrink-0" />
          <span className="relative z-10 text-sm font-semibold flex-1 text-left [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
            Agente em execução
            {activeCount > 1 && (
              <span className="ml-1 text-xs font-normal text-gray-300 dark:text-gray-400">({activeCount} tarefas)</span>
            )}
          </span>
          {minimized ? <ChevronUp className="relative z-10 w-4 h-4 shrink-0" /> : <ChevronDown className="relative z-10 w-4 h-4 shrink-0" />}
        </button>

        {/* Corpo */}
        {!minimized && (
          <div className="divide-y divide-gray-100">
            {jobs.map((job, i) => (
              <JobRow key={`${job.kind}-${i}`} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JobRow({ job }: { job: AgentJob }) {
  const meta = KIND_META[job.kind];
  const Icon = meta.icon;
  const pct = job.total > 0 ? Math.round((job.doneCount / job.total) * 100) : 0;
  const done = job.doneCount >= job.total;

  return (
    <div className="px-3.5 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.text}`} />
        <span className={`text-xs font-semibold ${meta.text} flex-1 truncate`}>
          {job.cancelRequested ? "Cancelando após item atual…" : meta.label}
        </span>
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums shrink-0">
          {job.doneCount}/{job.total}
        </span>
        {!job.cancelRequested && !done && (
          <button
            type="button"
            onClick={job.onCancel}
            title="Cancelar"
            className="cursor-pointer p-0.5 rounded text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Assunto */}
      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-2" title={job.subject}>
        {job.subject}
      </p>

      {/* Barra de progresso */}
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${meta.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 mt-1.5">
        {done ? (
          <>
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              {job.total} {meta.verb}
            </span>
          </>
        ) : (
          <>
            <Loader2 className={`w-3 h-3 animate-spin shrink-0 ${meta.text}`} />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{pct}% concluído</span>
          </>
        )}
      </div>
    </div>
  );
}
