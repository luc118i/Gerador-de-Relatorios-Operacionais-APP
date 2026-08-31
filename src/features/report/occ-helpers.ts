import type { OccurrenceDTO } from "../../domain/occurrences";

// Helpers de exibição promovidos da página relatorio-diario.tsx pra serem
// compartilhados por todos os componentes do Centro de Relatórios.

/** Nome curto do tipo. GENÉRICO cai no título customizado. */
export function abbrevType(code: string, title: string): string {
  const map: Record<string, string> = {
    EXCESSO_VELOCIDADE: "Excesso vel.",
    DESCUMP_OP_PARADA_FORA: "Parada irreg.",
    EXCESSO_PERMANENCIA: "Excesso perm.",
    GENERICO: "Genérico",
  };
  return map[code] ?? (title.length > 18 ? title.slice(0, 16) + "…" : title);
}

/**
 * Nome de exibição da ocorrência (mesma regra da lista do relatório):
 * GENÉRICO usa o título customizado (reportTitle); demais usam o tipo.
 */
export function occDisplayName(o: OccurrenceDTO): string {
  return o.typeCode === "GENERICO" && o.reportTitle ? o.reportTitle : o.typeTitle;
}

export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length <= 2 ? name : `${parts[0]} ${parts[1]}`;
}

export function baseOf(o: OccurrenceDTO): string {
  return o.baseCode || "—";
}

export function lineOf(o: OccurrenceDTO): string {
  return o.lineLabel || o.tripLineName || "—";
}

/** Motorista "principal" (posição 1) — usado em rankings por motorista. */
export function primaryDriver(o: OccurrenceDTO) {
  return o.drivers[0] ?? null;
}

/** Hora cheia (0–23) do início da ocorrência. */
export function startHour(o: OccurrenceDTO): number {
  const h = parseInt((o.startTime ?? "").split(":")[0] ?? "", 10);
  return Number.isNaN(h) ? -1 : h;
}

export type PeriodOfDay = "madrugada" | "manha" | "tarde" | "noite";

export function periodOfDay(hour: number): PeriodOfDay {
  if (hour < 6) return "madrugada";
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}

export const PERIOD_LABEL: Record<PeriodOfDay, string> = {
  madrugada: "Madrugada",
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export const PERIOD_ORDER: PeriodOfDay[] = ["madrugada", "manha", "tarde", "noite"];

/** Minutos excedentes acumulados (EXCESSO_PERMANENCIA com múltiplos pontos). */
export function excedenteMin(o: OccurrenceDTO): number {
  if (!o.points || o.points.length === 0) return 0;
  return o.points.reduce((acc, p) => acc + (p.excedenteMin ?? 0), 0);
}

/** "1h 40min" / "40min" a partir de minutos. */
export function formatDurationMin(totalMin: number): string {
  const m = Math.max(0, Math.round(totalMin));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h ${r}min`;
  if (h) return `${h}h`;
  return `${r}min`;
}

/** Duração da ocorrência (fim − início), tratando virada de meia-noite. */
export function durationMin(o: OccurrenceDTO): number | null {
  const [hi, mi] = (o.startTime ?? "").split(":").map(Number);
  const [hf, mf] = (o.endTime ?? "").split(":").map(Number);
  if ([hi, mi, hf, mf].some((n) => Number.isNaN(n))) return null;
  let mins = hf * 60 + mf - (hi * 60 + mi);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

export function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${d} ${months[parseInt(m ?? "1", 10) - 1]} ${y}`;
}
