import type { OccurrenceHistoryEntry } from "../../../../domain/occurrences";
import {
  getPrioridadeConfig,
  getWorkflowStatusConfig,
} from "../../../config/occurrenceWorkflow";

export const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO: "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE: "Vale",
  REGISTRO: "Só o registro",
};

/** "2026-09-08T13:57:00Z" → "08/09/2026 13:57" */
export function fmtDateTime(iso: string): string {
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

/** "2026-09-08" → "08/09/2026" */
export function fmtDateBR(d?: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}

export function statusLabel(code: string | null | undefined): string {
  return code ? getWorkflowStatusConfig(code).label : "—";
}

export function historyLine(h: OccurrenceHistoryEntry): string {
  switch (h.action) {
    case "CRIADA":
      return "Ocorrência registrada";
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

