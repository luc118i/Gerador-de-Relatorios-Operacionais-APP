import type { OccurrenceDTO } from "../../domain/occurrences";
import { abbrevType, startHour } from "./occ-helpers";

// ── Evolução diária ─────────────────────────────────────────────────────────

export interface DayPoint {
  date: string; // ISO
  dayNum: string; // "01".."31"
  count: number;
  byType: { code: string; label: string; count: number }[];
}

/** Uma entrada por dia do intervalo (inclui dias sem ocorrência). */
export function byDay(occ: OccurrenceDTO[], days: string[]): DayPoint[] {
  const map = new Map<string, Map<string, { label: string; count: number }>>();
  for (const o of occ) {
    const d = o.eventDate;
    if (!map.has(d)) map.set(d, new Map());
    const inner = map.get(d)!;
    const prev = inner.get(o.typeCode);
    inner.set(o.typeCode, { label: abbrevType(o.typeCode, o.typeTitle), count: (prev?.count ?? 0) + 1 });
  }

  return days.map((date) => {
    const inner = map.get(date);
    const byType = inner
      ? [...inner.entries()]
          .map(([code, v]) => ({ code, label: v.label, count: v.count }))
          .sort((a, b) => b.count - a.count)
      : [];
    return {
      date,
      dayNum: date.slice(8, 10),
      count: byType.reduce((s, t) => s + t.count, 0),
      byType,
    };
  });
}

// ── Heatmap dia-da-semana × faixa de horário ────────────────────────────────

export const HEATMAP_WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const HEATMAP_BLOCKS = ["00", "03", "06", "09", "12", "15", "18", "21"];

export interface Heatmap {
  /** matrix[weekdayIndex 0=Seg][blockIndex] = contagem */
  matrix: number[][];
  max: number;
  rowTotals: number[];
  colTotals: number[];
}

export function heatmapMatrix(occ: OccurrenceDTO[]): Heatmap {
  const matrix = Array.from({ length: 7 }, () => new Array(HEATMAP_BLOCKS.length).fill(0));
  for (const o of occ) {
    const d = new Date(`${o.eventDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    // JS: 0=Dom … queremos 0=Seg
    const wd = (d.getDay() + 6) % 7;
    const h = startHour(o);
    if (h < 0) continue;
    const block = Math.min(HEATMAP_BLOCKS.length - 1, Math.floor(h / 3));
    matrix[wd]![block]! += 1;
  }
  let max = 0;
  const rowTotals = matrix.map((row) => row.reduce((s, v) => s + v, 0));
  const colTotals = new Array(HEATMAP_BLOCKS.length).fill(0);
  for (const row of matrix) for (let c = 0; c < row.length; c++) {
    colTotals[c] += row[c]!;
    if (row[c]! > max) max = row[c]!;
  }
  return { matrix, max, rowTotals, colTotals };
}

// ── Tendência (buckets + média móvel + inclinação) ──────────────────────────

export interface TrendBucket {
  label: string;
  count: number;
  avg: number; // média móvel (janela 2)
}

export interface Trend {
  buckets: TrendBucket[];
  direction: "up" | "down" | "flat";
}

/**
 * Agrupa o intervalo em blocos: ≤10 dias → 1 bloco por dia; senão blocos de
 * 7 dias a partir do início. Calcula média móvel e o sentido pela inclinação
 * (regressão linear simples sobre as contagens dos blocos).
 */
export function trendBuckets(occ: OccurrenceDTO[], days: string[]): Trend {
  const countByDay = new Map<string, number>();
  for (const o of occ) countByDay.set(o.eventDate, (countByDay.get(o.eventDate) ?? 0) + 1);

  const perDay = days.length <= 10;
  const groups: { label: string; days: string[] }[] = [];

  if (perDay) {
    for (const d of days) groups.push({ label: `${d.slice(8, 10)}/${d.slice(5, 7)}`, days: [d] });
  } else {
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const a = chunk[0]!;
      const b = chunk[chunk.length - 1]!;
      groups.push({ label: `${a.slice(8, 10)}–${b.slice(8, 10)}/${b.slice(5, 7)}`, days: chunk });
    }
  }

  const counts = groups.map((g) => g.days.reduce((s, d) => s + (countByDay.get(d) ?? 0), 0));

  const buckets: TrendBucket[] = groups.map((g, i) => ({
    label: g.label,
    count: counts[i]!,
    avg: i === 0 ? counts[i]! : (counts[i]! + counts[i - 1]!) / 2,
  }));

  // inclinação (mínimos quadrados) sobre (i, count)
  const n = counts.length;
  let direction: Trend["direction"] = "flat";
  if (n >= 2) {
    const meanX = (n - 1) / 2;
    const meanY = counts.reduce((s, v) => s + v, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - meanX) * (counts[i]! - meanY);
      den += (i - meanX) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const threshold = Math.max(0.5, meanY * 0.05);
    direction = slope > threshold ? "up" : slope < -threshold ? "down" : "flat";
  }

  return { buckets, direction };
}
