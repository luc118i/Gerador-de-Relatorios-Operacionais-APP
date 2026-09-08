import type { Prioridade, WorkflowStatus } from "../../domain/occurrences";

/**
 * Fonte única da identidade visual da Central de Ocorrências — colunas do
 * quadro e badge de prioridade. Paleta contida de propósito (spec §12/§19):
 * um tom de acento por estado, prioridade com um ponto discreto.
 */

export type WorkflowStatusConfig = {
  code: WorkflowStatus;
  label: string;
  description: string;
  /** classes do "trilho" da coluna (borda superior + fundo do header) */
  columnAccent: string;
  /** classes do badge do card */
  badge: string;
  /** ponto colorido pequeno */
  dot: string;
};

export const WORKFLOW_STATUSES: WorkflowStatusConfig[] = [
  {
    code: "PENDENTE",
    label: "Pendentes",
    description: "Identificadas, ainda sem tratamento",
    columnAccent: "border-t-slate-400 dark:border-t-slate-500",
    badge:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  {
    code: "EM_TRATAMENTO",
    label: "Em tratamento",
    description: "Já com uma ação em andamento",
    columnAccent: "border-t-blue-500 dark:border-t-blue-500",
    badge:
      "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  {
    code: "AGUARDANDO_RETORNO",
    label: "Aguardando retorno",
    description: "Aguardando resposta de motorista, base ou setor",
    columnAccent: "border-t-amber-400 dark:border-t-amber-500",
    badge:
      "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    dot: "bg-amber-400",
  },
  {
    code: "TRATADA",
    label: "Tratadas",
    description: "Tratamento concluído",
    columnAccent: "border-t-emerald-500 dark:border-t-emerald-500",
    badge:
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  {
    code: "CANCELADA",
    label: "Canceladas",
    description: "Improcedente ou sem necessidade de ação",
    columnAccent: "border-t-gray-300 dark:border-t-gray-700",
    badge:
      "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700",
    dot: "bg-gray-300 dark:bg-gray-600",
  },
  {
    code: "ARQUIVADA",
    label: "Arquivadas",
    description: "Fora da visão operacional, histórico preservado",
    columnAccent: "border-t-gray-300 dark:border-t-gray-700",
    badge:
      "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700",
    dot: "bg-gray-300 dark:bg-gray-600",
  },
];

/** Colunas exibidas no quadro operacional (ARQUIVADA fica fora — Fase 3). */
export const BOARD_COLUMNS: WorkflowStatus[] = [
  "PENDENTE",
  "EM_TRATAMENTO",
  "AGUARDANDO_RETORNO",
  "TRATADA",
  "CANCELADA",
];

/** Mudanças de status que pedem confirmação antes de aplicar (spec §13). */
export const STATUS_NEEDS_CONFIRM: WorkflowStatus[] = ["TRATADA", "CANCELADA", "ARQUIVADA"];

/** Fluxo linear pro botão "avançar" do card (1 clique = próxima coluna).
 *  CANCELADA fica fora — cancelar é ação explícita, não "próximo passo". */
const ADVANCE_FLOW: WorkflowStatus[] = [
  "PENDENTE",
  "EM_TRATAMENTO",
  "AGUARDANDO_RETORNO",
  "TRATADA",
];

/** Próximo status no fluxo, ou null quando não há (TRATADA/CANCELADA/ARQUIVADA). */
export function nextBoardStatus(current: string | null | undefined): WorkflowStatus | null {
  const i = ADVANCE_FLOW.indexOf((current ?? "PENDENTE") as WorkflowStatus);
  if (i < 0 || i >= ADVANCE_FLOW.length - 1) return null;
  return ADVANCE_FLOW[i + 1];
}

const STATUS_BY_CODE = new Map(WORKFLOW_STATUSES.map((s) => [s.code, s]));

export function getWorkflowStatusConfig(code: string | null | undefined): WorkflowStatusConfig {
  return (
    STATUS_BY_CODE.get((code ?? "PENDENTE") as WorkflowStatus) ?? WORKFLOW_STATUSES[0]
  );
}

// ── Prioridade ───────────────────────────────────────────────────────────

export type PrioridadeConfig = {
  code: Prioridade;
  label: string;
  /** ordem para ranquear (0 = mais urgente) */
  rank: number;
  dot: string;
  /** classes do texto/label quando exibido inline */
  text: string;
};

export const PRIORIDADES: PrioridadeConfig[] = [
  { code: "CRITICA", label: "Crítica", rank: 0, dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  { code: "ALTA", label: "Alta", rank: 1, dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  { code: "MEDIA", label: "Média", rank: 2, dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400" },
  { code: "BAIXA", label: "Baixa", rank: 3, dot: "bg-slate-300 dark:bg-slate-600", text: "text-slate-400 dark:text-slate-500" },
];

const PRIO_BY_CODE = new Map(PRIORIDADES.map((p) => [p.code, p]));

export function getPrioridadeConfig(code: string | null | undefined): PrioridadeConfig {
  return PRIO_BY_CODE.get((code ?? "MEDIA") as Prioridade) ?? PRIORIDADES[2];
}

/** Prioridades tratadas como "alta prioridade" no indicador do topo (§11). */
export const HIGH_PRIORITIES: Prioridade[] = ["CRITICA", "ALTA"];

// ── "Novo" ───────────────────────────────────────────────────────────────

/** Janela em que uma ocorrência recém-cadastrada ainda mostra a tag "Novo". */
export const NEW_WINDOW_MS = 72 * 60 * 60 * 1000; // 72h a partir do cadastro

/** true se a ocorrência foi registrada dentro da janela recente. */
export function isRecentlyCreated(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < NEW_WINDOW_MS;
}
