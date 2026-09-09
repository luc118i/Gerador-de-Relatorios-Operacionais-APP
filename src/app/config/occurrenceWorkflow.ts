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
  /** tom bem discreto do card no quadro (fundo + borda) por estado */
  cardTint: string;
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
    cardTint:
      "bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
  },
  {
    code: "EM_TRATAMENTO",
    label: "Em tratamento",
    description: "Já com uma ação em andamento",
    columnAccent: "border-t-blue-500 dark:border-t-blue-500",
    badge:
      "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
    cardTint:
      "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-800",
  },
  {
    code: "AGUARDANDO_RETORNO",
    label: "Aguardando retorno",
    description: "Aguardando resposta de motorista, base ou setor",
    columnAccent: "border-t-amber-400 dark:border-t-amber-500",
    badge:
      "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    dot: "bg-amber-400",
    cardTint:
      "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-800",
  },
  {
    code: "TRATADA",
    label: "Tratadas",
    description: "Tratamento concluído",
    columnAccent: "border-t-emerald-500 dark:border-t-emerald-500",
    badge:
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
    cardTint:
      "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-800",
  },
  {
    code: "CANCELADA",
    label: "Canceladas",
    description: "Improcedente ou sem necessidade de ação",
    columnAccent: "border-t-gray-300 dark:border-t-gray-700",
    badge:
      "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700",
    dot: "bg-gray-300 dark:bg-gray-600",
    cardTint:
      "bg-gray-50 dark:bg-gray-900/50 border-gray-200/70 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700",
  },
  {
    code: "ARQUIVADA",
    label: "Arquivadas",
    description: "Fora da visão operacional, histórico preservado",
    columnAccent: "border-t-gray-300 dark:border-t-gray-700",
    badge:
      "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700",
    dot: "bg-gray-300 dark:bg-gray-600",
    cardTint:
      "bg-gray-50 dark:bg-gray-900/50 border-gray-200/70 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700",
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

/** Próximo status no fluxo, pulando colunas ocultas. null quando não há mais. */
export function nextBoardStatus(
  current: string | null | undefined,
  hidden: string[] = [],
): WorkflowStatus | null {
  const i = ADVANCE_FLOW.indexOf((current ?? "PENDENTE") as WorkflowStatus);
  if (i < 0) return null;
  for (let j = i + 1; j < ADVANCE_FLOW.length; j++) {
    if (!hidden.includes(ADVANCE_FLOW[j])) return ADVANCE_FLOW[j];
  }
  return null;
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

// ── Progresso de tratamento ──────────────────────────────────────────────

type TreatmentInput = {
  analisadoPor?: string | null;
  tratativa?: string | null;
  driveWebViewLink?: string | null;
  rizerRegistered?: boolean;
  workflowStatus?: string;
};

/** Passos do tratamento derivados dos campos que já existem — vira uma
 *  mini-barra "N/4" no card (spec §7). */
export function treatmentProgress(o: TreatmentInput) {
  const steps = [
    { label: "Responsável", done: !!o.analisadoPor?.trim() },
    { label: "Tratativa", done: !!o.tratativa },
    { label: "Relatório", done: !!o.driveWebViewLink || !!o.rizerRegistered },
    { label: "Concluída", done: o.workflowStatus === "TRATADA" },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length };
}

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
