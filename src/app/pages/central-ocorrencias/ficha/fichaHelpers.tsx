import type { ReactNode } from "react";
import {
  ArrowRightLeft,
  FileCheck2,
  FilePlus2,
  Flag,
  Gavel,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
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

export function fmtHora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "--:--"
    : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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

export const HISTORY_META: Record<string, { Icon: LucideIcon }> = {
  CRIADA: { Icon: FilePlus2 },
  STATUS: { Icon: ArrowRightLeft },
  PRIORIDADE: { Icon: Flag },
  TRATATIVA: { Icon: Gavel },
  RELATORIO: { Icon: FileCheck2 },
  NOTA: { Icon: MessageSquare },
};

/** Campo rótulo + valor no padrão da ficha. */
export function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-gray-800 dark:text-gray-200">{value || "—"}</p>
    </div>
  );
}
