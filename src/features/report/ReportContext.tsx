import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { EMPTY_FILTERS, isFiltersEmpty, type ReportFilters, type Severity } from "./types";
import { applyFilters, buildFilterOptions } from "./filters";
import { deriveReport, type ReportDerived } from "./aggregations";
import {
  comparisonLabel as compLabel,
  enumerateDays,
  isSingleDay as isSingleDayFn,
  periodLabel as periodLabelFn,
  previousPeriod,
  type Period,
} from "./period";
import { useRangeOccurrences } from "./useRangeOccurrences";
import { buildComparison, type ComparisonBundle } from "./comparison";
import { byDay, heatmapMatrix, trendBuckets, type DayPoint, type Heatmap, type Trend } from "./range-aggregations";

// ── Reducer de filtros ──────────────────────────────────────────────────────

type ArrayField = "typeCodes" | "driverIds" | "vehicles" | "bases" | "lines";

type Action =
  | { type: "toggle"; field: ArrayField; value: string }
  | { type: "set"; field: ArrayField; values: string[] }
  | { type: "toggleSeverity"; value: Severity }
  | { type: "setHourRange"; from: number | null; to: number | null }
  | { type: "setSearch"; value: string }
  | { type: "clearField"; field: keyof ReportFilters }
  | { type: "replace"; filters: ReportFilters }
  | { type: "clearAll" };

function toggleIn(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function reducer(state: ReportFilters, action: Action): ReportFilters {
  switch (action.type) {
    case "toggle":
      return { ...state, [action.field]: toggleIn(state[action.field], action.value) };
    case "set":
      return { ...state, [action.field]: action.values };
    case "toggleSeverity":
      return {
        ...state,
        severities: state.severities.includes(action.value)
          ? state.severities.filter((s) => s !== action.value)
          : [...state.severities, action.value],
      };
    case "setHourRange":
      return { ...state, hourFrom: action.from, hourTo: action.to };
    case "setSearch":
      return { ...state, search: action.value };
    case "clearField":
      return { ...state, ...pickEmpty(action.field) };
    case "replace":
      return action.filters;
    case "clearAll":
      return EMPTY_FILTERS;
    default:
      return state;
  }
}

function pickEmpty(field: keyof ReportFilters): Partial<ReportFilters> {
  switch (field) {
    case "hourFrom":
    case "hourTo":
      return { hourFrom: null, hourTo: null };
    case "search":
      return { search: "" };
    case "severities":
      return { severities: [] };
    default:
      return { [field]: [] } as Partial<ReportFilters>;
  }
}

// ── Contexto ────────────────────────────────────────────────────────────────

interface ReportContextValue {
  period: Period;
  periodLabel: string;
  comparisonLabel: string;
  isSingleDay: boolean;
  days: string[];
  /** compat com componentes da Fase 1 — início do período. */
  date: string;

  loading: boolean;
  fetching: boolean;
  progress: { loaded: number; total: number };
  error: string | null;

  /** intervalo inteiro, sem filtro */
  all: OccurrenceDTO[];
  /** recorte após o filtro global */
  filtered: OccurrenceDTO[];
  filters: ReportFilters;
  filtersActive: boolean;
  dispatch: (action: Action) => void;
  options: ReturnType<typeof buildFilterOptions>;
  derived: ReportDerived;

  comparison: ComparisonBundle;
  range: { byDay: DayPoint[]; heatmap: Heatmap; trend: Trend };

  refetch: () => void;
}

const ReportCtx = createContext<ReportContextValue | null>(null);

export function ReportProvider({ period, children }: { period: Period; children: ReactNode }) {
  const [filters, dispatch] = useReducer(reducer, EMPTY_FILTERS);

  const days = useMemo(() => enumerateDays(period), [period]);
  const prevPeriodValue = useMemo(() => previousPeriod(period), [period]);
  const prevDays = useMemo(() => enumerateDays(prevPeriodValue), [prevPeriodValue]);

  const cur = useRangeOccurrences(days);
  const prev = useRangeOccurrences(prevDays);

  const all = cur.data;
  const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);
  const options = useMemo(() => buildFilterOptions(all), [all]);
  const derived = useMemo(() => deriveReport(filtered, days.length), [filtered, days.length]);

  const prevFiltered = useMemo(() => applyFilters(prev.data, filters), [prev.data, filters]);
  const prevDerived = useMemo(
    () => deriveReport(prevFiltered, prevDays.length),
    [prevFiltered, prevDays.length],
  );

  const comparison = useMemo(
    () => buildComparison(compLabel(period), prev.fetching, derived, prevDerived),
    [period, prev.fetching, derived, prevDerived],
  );

  const range = useMemo(
    () => ({
      byDay: byDay(filtered, days),
      heatmap: heatmapMatrix(filtered),
      trend: trendBuckets(filtered, days),
    }),
    [filtered, days],
  );

  const value: ReportContextValue = {
    period,
    periodLabel: periodLabelFn(period),
    comparisonLabel: compLabel(period),
    isSingleDay: isSingleDayFn(period),
    days,
    date: period.start,

    loading: cur.initialLoading,
    fetching: cur.fetching,
    progress: { loaded: cur.loaded, total: cur.total },
    error: cur.error,

    all,
    filtered,
    filters,
    filtersActive: !isFiltersEmpty(filters),
    dispatch,
    options,
    derived,

    comparison,
    range,

    refetch: () => {
      cur.refetch();
      prev.refetch();
    },
  };

  return <ReportCtx.Provider value={value}>{children}</ReportCtx.Provider>;
}

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportCtx);
  if (!ctx) throw new Error("useReport precisa estar dentro de <ReportProvider>");
  return ctx;
}

/** Helper: aplica o "filtro" de um ProblemFocus / clique de fatia. */
export function applyFocusFilter(
  dispatch: (a: Action) => void,
  field: "typeCodes" | "driverIds" | "vehicles" | "bases" | "lines" | "hour",
  value: string | number,
) {
  if (field === "hour") {
    const h = Number(value);
    dispatch({ type: "setHourRange", from: h, to: h + 1 });
    return;
  }
  dispatch({ type: "toggle", field, value: String(value) });
}
