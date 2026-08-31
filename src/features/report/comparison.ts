import type { ReportDerived, ReportKpis } from "./aggregations";

/** Variação percentual `cur` vs `prev`. `null` quando não há base de comparação. */
export function pctDelta(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

export interface KpiDeltas {
  total: number | null;
  vehicles: number | null;
  drivers: number | null;
  bases: number | null;
  lines: number | null;
  critical: number | null;
  excedenteMinTotal: number | null;
}

export interface ComparisonBundle {
  /** rótulo curto, ex.: "vs. Julho" */
  label: string;
  /** ainda carregando os dias do período anterior */
  loading: boolean;
  /** o período anterior tem pelo menos 1 ocorrência (no recorte filtrado) */
  hasPrev: boolean;
  prevKpis: ReportKpis;
  prevScore: number;
  deltas: KpiDeltas;
  /** variação % por typeCode (chave = code) */
  byTypeDeltaPct: Record<string, number | null>;
}

export function buildComparison(
  label: string,
  loading: boolean,
  cur: ReportDerived,
  prev: ReportDerived,
): ComparisonBundle {
  const ck = cur.kpis;
  const pk = prev.kpis;

  const prevTypeCount: Record<string, number> = {};
  for (const t of prev.types) prevTypeCount[t.key] = t.count;

  const byTypeDeltaPct: Record<string, number | null> = {};
  for (const t of cur.types) byTypeDeltaPct[t.key] = pctDelta(t.count, prevTypeCount[t.key] ?? 0);

  return {
    label,
    loading,
    hasPrev: pk.total > 0,
    prevKpis: pk,
    prevScore: prev.score.score,
    deltas: {
      total: pctDelta(ck.total, pk.total),
      vehicles: pctDelta(ck.vehicles, pk.vehicles),
      drivers: pctDelta(ck.drivers, pk.drivers),
      bases: pctDelta(ck.bases, pk.bases),
      lines: pctDelta(ck.lines, pk.lines),
      critical: pctDelta(ck.critical, pk.critical),
      excedenteMinTotal: pctDelta(ck.excedenteMinTotal, pk.excedenteMinTotal),
    },
    byTypeDeltaPct,
  };
}
