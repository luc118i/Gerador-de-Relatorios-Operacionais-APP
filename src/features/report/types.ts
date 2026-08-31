import type { OccurrenceDTO } from "../../domain/occurrences";

// ── Severidade ────────────────────────────────────────────────────────────────

export type Severity = "high" | "medium" | "low";

/** Severidade derivada da ocorrência. Hoje só o excesso de velocidade
 *  diferencia; os demais tipos entram como "low" (regular). Mantido igual
 *  ao que a página fazia antes pra não mudar a leitura do gestor. */
export function getSeverity(o: OccurrenceDTO): Severity {
  if (o.typeCode === "EXCESSO_VELOCIDADE") return (o.speedKmh ?? 0) > 100 ? "high" : "medium";
  return "low";
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: "Crítico",
  medium: "Atenção",
  low: "Regular",
};

// ── Filtro global ────────────────────────────────────────────────────────────

/**
 * Estado único de filtro do Centro de Relatórios. TODO componente da tela
 * (KPIs, gráficos, rankings, insights, "onde está o problema", tabela)
 * deriva do mesmo recorte produzido por `applyFilters`. Não existe estado
 * de filtro local espalhado — clicar numa fatia só faz dispatch aqui.
 */
export interface ReportFilters {
  typeCodes: string[];
  driverIds: string[];
  vehicles: string[];
  bases: string[];
  lines: string[];
  severities: Severity[];
  /** Faixa de horário (hora cheia, 0–23). `null` = sem limite. */
  hourFrom: number | null;
  hourTo: number | null;
  /** Busca textual livre (motorista, veículo, linha, base, local, tipo). */
  search: string;
}

export const EMPTY_FILTERS: ReportFilters = {
  typeCodes: [],
  driverIds: [],
  vehicles: [],
  bases: [],
  lines: [],
  severities: [],
  hourFrom: null,
  hourTo: null,
  search: "",
};

export function isFiltersEmpty(f: ReportFilters): boolean {
  return (
    f.typeCodes.length === 0 &&
    f.driverIds.length === 0 &&
    f.vehicles.length === 0 &&
    f.bases.length === 0 &&
    f.lines.length === 0 &&
    f.severities.length === 0 &&
    f.hourFrom === null &&
    f.hourTo === null &&
    f.search.trim() === ""
  );
}

export function countActiveFilters(f: ReportFilters): number {
  let n = 0;
  n += f.typeCodes.length;
  n += f.driverIds.length;
  n += f.vehicles.length;
  n += f.bases.length;
  n += f.lines.length;
  n += f.severities.length;
  if (f.hourFrom !== null || f.hourTo !== null) n += 1;
  if (f.search.trim() !== "") n += 1;
  return n;
}

/** Chave de agrupamento por entidade — usada por rankings e drill-down. */
export type EntityKind = "driver" | "vehicle" | "base" | "line" | "type";
