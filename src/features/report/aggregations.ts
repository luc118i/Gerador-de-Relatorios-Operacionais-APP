import type { OccurrenceDTO } from "../../domain/occurrences";
import { getSeverity } from "./types";
import {
  abbrevType,
  baseOf,
  excedenteMin,
  lineOf,
  occDisplayName,
  PERIOD_LABEL,
  PERIOD_ORDER,
  periodOfDay,
  primaryDriver,
  startHour,
} from "./occ-helpers";

// ── KPIs ─────────────────────────────────────────────────────────────────────

export interface ReportKpis {
  total: number;
  vehicles: number;
  drivers: number;
  bases: number;
  lines: number;
  critical: number;
  evidences: number;
  excedenteMinTotal: number;
  windowStart: string | null;
  windowEnd: string | null;
}

export function computeKpis(occ: OccurrenceDTO[]): ReportKpis {
  const vehicles = new Set<string>();
  const drivers = new Set<string>();
  const bases = new Set<string>();
  const lines = new Set<string>();
  let critical = 0;
  let evidences = 0;
  let exc = 0;
  const times: string[] = [];

  for (const o of occ) {
    vehicles.add(o.vehicleNumber);
    for (const d of o.drivers) drivers.add(d.driverId);
    if (baseOf(o) !== "—") bases.add(baseOf(o));
    if (lineOf(o) !== "—") lines.add(lineOf(o));
    if (getSeverity(o) === "high") critical += 1;
    evidences += o.evidenceCount ?? 0;
    exc += excedenteMin(o);
    if (o.startTime) times.push(o.startTime);
    if (o.endTime) times.push(o.endTime);
  }

  times.sort();
  return {
    total: occ.length,
    vehicles: vehicles.size,
    drivers: drivers.size,
    bases: bases.size,
    lines: lines.size,
    critical,
    evidences,
    excedenteMinTotal: exc,
    windowStart: times[0] ?? null,
    windowEnd: times[times.length - 1] ?? null,
  };
}

// ── Distribuições ────────────────────────────────────────────────────────────

export interface CountSlice {
  key: string;
  label: string;
  count: number;
  pct: number;
}

function toSlices(map: Map<string, { label: string; count: number }>, total: number): CountSlice[] {
  return [...map.entries()]
    .map(([key, { label, count }]) => ({ key, label, count, pct: total ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

export function byType(occ: OccurrenceDTO[]): CountSlice[] {
  const m = new Map<string, { label: string; count: number }>();
  for (const o of occ) {
    const prev = m.get(o.typeCode);
    m.set(o.typeCode, {
      label: abbrevType(o.typeCode, o.typeTitle),
      count: (prev?.count ?? 0) + 1,
    });
  }
  return toSlices(m, occ.length);
}

/** 24 baldes de hora cheia. Sempre retorna os 24 (pro eixo X do gráfico). */
export function byHour(occ: OccurrenceDTO[]): { hour: string; count: number }[] {
  const buckets = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, "0")}h`, count: 0 }));
  for (const o of occ) {
    const h = startHour(o);
    if (h >= 0 && buckets[h]) buckets[h]!.count += 1;
  }
  return buckets;
}

export function byPeriodOfDay(occ: OccurrenceDTO[]): CountSlice[] {
  const m = new Map<string, { label: string; count: number }>();
  for (const p of PERIOD_ORDER) m.set(p, { label: PERIOD_LABEL[p], count: 0 });
  for (const o of occ) {
    const h = startHour(o);
    if (h < 0) continue;
    const p = periodOfDay(h);
    m.get(p)!.count += 1;
  }
  // mantém a ordem cronológica (não por contagem) pro período do dia
  return PERIOD_ORDER.map((p) => {
    const e = m.get(p)!;
    return { key: p, label: e.label, count: e.count, pct: occ.length ? (e.count / occ.length) * 100 : 0 };
  });
}

// ── Rankings ─────────────────────────────────────────────────────────────────

export interface RankRow {
  key: string;
  label: string;
  sublabel?: string;
  count: number;
  pct: number;
  extra?: string;
}

export function rankDrivers(occ: OccurrenceDTO[]): RankRow[] {
  const m = new Map<string, { name: string; base: string; count: number; vehicles: Set<string> }>();
  for (const o of occ) {
    const d = primaryDriver(o);
    if (!d) continue;
    const prev = m.get(d.driverId) ?? { name: d.name, base: d.baseCode, count: 0, vehicles: new Set<string>() };
    prev.count += 1;
    prev.vehicles.add(o.vehicleNumber);
    m.set(d.driverId, prev);
  }
  const total = occ.length;
  return [...m.entries()]
    .map(([key, v]) => ({
      key,
      label: v.name,
      sublabel: v.base,
      count: v.count,
      pct: total ? (v.count / total) * 100 : 0,
      extra: `${v.vehicles.size} veíc.`,
    }))
    .sort((a, b) => b.count - a.count);
}

function rankByKey(
  occ: OccurrenceDTO[],
  keyFn: (o: OccurrenceDTO) => string,
  skip = "—",
): RankRow[] {
  const m = new Map<string, number>();
  for (const o of occ) {
    const k = keyFn(o);
    if (k === skip) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  const total = occ.length;
  return [...m.entries()]
    .map(([key, count]) => ({ key, label: key, count, pct: total ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

export const rankVehicles = (occ: OccurrenceDTO[]) => rankByKey(occ, (o) => o.vehicleNumber);
export const rankBases = (occ: OccurrenceDTO[]) => rankByKey(occ, baseOf);
export const rankLines = (occ: OccurrenceDTO[]) => rankByKey(occ, lineOf);

// ── "Onde está o problema?" ──────────────────────────────────────────────────

export interface ProblemFocus {
  dimension: string;
  label: string;
  pct: number;
  count: number;
  /** filtro que o clique deve aplicar */
  filter: { field: "typeCodes" | "driverIds" | "vehicles" | "bases" | "lines" | "hour"; value: string | number };
}

export function whereIsTheProblem(occ: OccurrenceDTO[]): ProblemFocus[] {
  if (occ.length === 0) return [];
  const out: ProblemFocus[] = [];

  const top = <T,>(rows: RankRow[], make: (r: RankRow) => T): T | null =>
    rows.length ? make(rows[0]!) : null;

  const typeRows = byType(occ);
  if (typeRows[0]) {
    // precisa do typeCode cru pro filtro — byType usa key = typeCode
    out.push({
      dimension: "Tipo",
      label: typeRows[0].label,
      pct: typeRows[0].pct,
      count: typeRows[0].count,
      filter: { field: "typeCodes", value: typeRows[0].key },
    });
  }

  const d = top(rankDrivers(occ), (r) => r);
  if (d) out.push({ dimension: "Motorista", label: d.label, pct: d.pct, count: d.count, filter: { field: "driverIds", value: d.key } });

  const b = top(rankBases(occ), (r) => r);
  if (b) out.push({ dimension: "Base", label: b.label, pct: b.pct, count: b.count, filter: { field: "bases", value: b.key } });

  const v = top(rankVehicles(occ), (r) => r);
  if (v) out.push({ dimension: "Veículo", label: v.label, pct: v.pct, count: v.count, filter: { field: "vehicles", value: v.key } });

  // horário: pico de janela de 2h
  const hours = byHour(occ);
  let bestStart = 0;
  let bestSum = -1;
  for (let i = 0; i < 23; i++) {
    const sum = hours[i]!.count + hours[i + 1]!.count;
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = i;
    }
  }
  if (bestSum > 0) {
    out.push({
      dimension: "Horário",
      label: `${String(bestStart).padStart(2, "0")}h–${String(bestStart + 2).padStart(2, "0")}h`,
      pct: (bestSum / occ.length) * 100,
      count: bestSum,
      filter: { field: "hour", value: bestStart },
    });
  }

  return out;
}

// ── Insights orientados a decisão ────────────────────────────────────────────

export interface Insight {
  id: string;
  tone: "danger" | "warning" | "info";
  title: string;
  detail: string;
}

/**
 * `days` = nº de dias do período filtrado. Limiares de proporção (%) já são
 * neutros ao tamanho do período; os limiares absolutos (contagem de um
 * motorista, minutos de excesso acumulados) são comparados por dia — um
 * limiar calibrado para "num dia" vale como taxa diária no período todo.
 * Com `days = 1` o comportamento é idêntico ao anterior.
 */
export function buildInsights(occ: OccurrenceDTO[], days = 1): Insight[] {
  const out: Insight[] = [];
  const total = occ.length;
  if (total === 0) return out;

  const span = Math.max(1, days);
  const multiDay = span > 1;
  const perDay = (n: number) => n / span;

  const types = byType(occ);
  if (types[0] && types[0].pct >= 34) {
    out.push({
      id: "principal-problema",
      tone: "danger",
      title: "Principal problema",
      detail: `${types[0].label} representa ${Math.round(types[0].pct)}% das ocorrências do período (${types[0].count} de ${total}).`,
    });
  }

  const drivers = rankDrivers(occ);
  const top2 = drivers.slice(0, 2).reduce((s, r) => s + r.count, 0);
  if (drivers.length >= 2 && top2 / total >= 0.4) {
    out.push({
      id: "concentracao-motorista",
      tone: "warning",
      title: "Concentração",
      detail: `${Math.round((top2 / total) * 100)}% das ocorrências estão concentradas em 2 motoristas (${drivers[0]!.label}, ${drivers[1]!.label}).`,
    });
  } else if (drivers[0] && perDay(drivers[0].count) >= 3) {
    out.push({
      id: "motorista-reincidente",
      tone: "warning",
      title: "Reincidência",
      detail: multiDay
        ? `${drivers[0]!.label} acumula ${drivers[0]!.count} ocorrências no período — média de ${perDay(drivers[0]!.count).toFixed(1)}/dia (${Math.round(drivers[0]!.pct)}% do total).`
        : `${drivers[0]!.label} aparece em ${drivers[0]!.count} ocorrências (${Math.round(drivers[0]!.pct)}% do total).`,
    });
  }

  const bases = rankBases(occ);
  if (bases[0] && bases.length > 1 && bases[0].pct >= 30) {
    out.push({
      id: "base-critica",
      tone: "warning",
      title: "Base crítica",
      detail: `${bases[0]!.label} concentra ${Math.round(bases[0]!.pct)}% das ocorrências (${bases[0]!.count} de ${total}).`,
    });
  }

  const periods = byPeriodOfDay(occ).slice().sort((a, b) => b.count - a.count);
  if (periods[0] && periods[0].count > 0 && periods[0].pct >= 35) {
    out.push({
      id: "horario-critico",
      tone: "info",
      title: "Horário crítico",
      detail: `O maior volume ocorreu no período da ${periods[0]!.label.toLowerCase()} (${Math.round(periods[0]!.pct)}%).`,
    });
  }

  const vehicles = rankVehicles(occ);
  // `>= 3` é piso de amostra (não se chama "anomalia" com 2 eventos em nenhuma
  // janela); a escala com o período vem do teste contra a média da frota.
  if (vehicles[0] && vehicles.length > 2 && vehicles[0].count >= 3) {
    const avg = total / vehicles.length;
    if (vehicles[0].count >= avg * 2) {
      out.push({
        id: "anomalia-veiculo",
        tone: "info",
        title: "Anomalia",
        detail: `O veículo ${vehicles[0]!.label} apresentou ${vehicles[0]!.count} ocorrências, ${(vehicles[0]!.count / avg).toFixed(1)}× a média da frota no período (${avg.toFixed(1)}).`,
      });
    }
  }

  const excTotal = occ.reduce((s, o) => s + excedenteMin(o), 0);
  if (perDay(excTotal) >= 60) {
    out.push({
      id: "excesso-permanencia-tempo",
      tone: "warning",
      title: "Tempo de excesso",
      detail: multiDay
        ? `Média de ${Math.round(perDay(excTotal))} min/dia de permanência acima do previsto (${Math.round(excTotal)} min no período).`
        : `Foram acumulados ${Math.round(excTotal)} min de permanência acima do previsto no período.`,
    });
  }

  return out;
}

// ── Drill-down por entidade ──────────────────────────────────────────────────

export interface EntityDetail {
  title: string;
  subtitle?: string;
  count: number;
  byTypeRows: CountSlice[];
  lastAt: string | null;
  vehicles: string[];
  drivers: string[];
  bases: string[];
  lines: string[];
}

export function entityDetail(occ: OccurrenceDTO[], title: string, subtitle?: string): EntityDetail {
  const vehicles = new Set<string>();
  const drivers = new Set<string>();
  const bases = new Set<string>();
  const lines = new Set<string>();
  let lastAt: string | null = null;

  for (const o of occ) {
    vehicles.add(o.vehicleNumber);
    for (const d of o.drivers) drivers.add(d.name);
    if (baseOf(o) !== "—") bases.add(baseOf(o));
    if (lineOf(o) !== "—") lines.add(lineOf(o));
    const stamp = `${o.eventDate} ${o.startTime}`;
    if (!lastAt || stamp > lastAt) lastAt = stamp;
  }

  return {
    title,
    subtitle,
    count: occ.length,
    byTypeRows: byType(occ),
    lastAt,
    vehicles: [...vehicles].sort(),
    drivers: [...drivers].sort((a, b) => a.localeCompare(b, "pt-BR")),
    bases: [...bases].sort(),
    lines: [...lines].sort(),
  };
}

// ── Nota operacional / saúde ─────────────────────────────────────────────────

export interface OperationalScore {
  score: number; // 0–10
  health: number; // 0–100
  label: string;
  tone: "danger" | "warning" | "attention" | "good";
  hex: string;
}

/**
 * Nota calibrada (mesma escala da "nota do dia" anterior) + versão em %
 * de "saúde operacional". Considera volume, severidade e excesso de
 * permanência. Reincidência entra via peso maior quando um motorista
 * concentra muitas ocorrências.
 *
 * `days` = nº de dias do período filtrado. A calibração original é por dia;
 * fora da visão diária as penalidades de volume (severidade, excesso,
 * reincidência) são divididas pelo nº de dias, produzindo a nota de um
 * "dia médio" do período. Com `days = 1` o resultado é idêntico ao anterior.
 */
export function operationalScore(occ: OccurrenceDTO[], days = 1): OperationalScore {
  const span = Math.max(1, days);
  const multiDay = span > 1;

  let penalty = 0;
  for (const o of occ) {
    const sev = getSeverity(o);
    penalty += sev === "high" ? 0.9 : sev === "medium" ? 0.6 : 0.4;
  }
  const excTotal = occ.reduce((s, o) => s + excedenteMin(o), 0);

  const drivers = rankDrivers(occ);
  const topDriverPerDay = drivers[0] ? drivers[0].count / span : 0;

  let score = 10 - penalty / span;
  score -= Math.min(1.5, excTotal / span / 240); // até -1.5 por muito excesso (média diária)
  if (topDriverPerDay >= 3) score -= Math.min(1, (topDriverPerDay - 2) * 0.3);

  score = Math.max(0, Math.round(score * 10) / 10);
  const health = Math.round(score * 10);

  let label: string;
  let tone: OperationalScore["tone"];
  let hex: string;
  if (score >= 8) {
    label = multiDay ? "Período dentro do padrão" : "Operação dentro do padrão";
    tone = "good";
    hex = "#10b981";
  } else if (score >= 6) {
    label = "Atenção necessária";
    tone = "attention";
    hex = "#f59e0b";
  } else if (score >= 4) {
    label = "Situação preocupante";
    tone = "warning";
    hex = "#f97316";
  } else {
    label = multiDay ? "Período crítico" : "Dia crítico";
    tone = "danger";
    hex = "#ef4444";
  }
  return { score, health, label, tone, hex };
}

// ── Bundle único consumido pela tela ─────────────────────────────────────────

export interface ReportDerived {
  kpis: ReportKpis;
  types: CountSlice[];
  hours: { hour: string; count: number }[];
  periods: CountSlice[];
  drivers: RankRow[];
  vehicles: RankRow[];
  bases: RankRow[];
  lines: RankRow[];
  problem: ProblemFocus[];
  insights: Insight[];
  score: OperationalScore;
}

export function deriveReport(occ: OccurrenceDTO[], days = 1): ReportDerived {
  return {
    kpis: computeKpis(occ),
    types: byType(occ),
    hours: byHour(occ),
    periods: byPeriodOfDay(occ),
    drivers: rankDrivers(occ),
    vehicles: rankVehicles(occ),
    bases: rankBases(occ),
    lines: rankLines(occ),
    problem: whereIsTheProblem(occ),
    insights: buildInsights(occ, days),
    score: operationalScore(occ, days),
  };
}

export { occDisplayName };
