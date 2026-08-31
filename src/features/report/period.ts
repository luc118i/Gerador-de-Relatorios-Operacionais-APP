import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

export type ReportView = "diario" | "semanal" | "mensal" | "personalizado";

/** Intervalo fechado [start, end] em ISO local `YYYY-MM-DD`. */
export interface Period {
  view: ReportView;
  start: string;
  end: string;
}

const WEEK_OPTS = { weekStartsOn: 1 as const }; // segunda-feira

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTHS_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const parse = (s: string) => parseISO(s);

export function todayISO(): string {
  return iso(new Date());
}

/** Constrói o período da `view` que contém `anchor` (ISO). */
export function periodForDate(view: ReportView, anchor: string): Period {
  const a = parse(anchor);
  switch (view) {
    case "diario":
      return { view, start: anchor, end: anchor };
    case "semanal":
      return { view, start: iso(startOfWeek(a, WEEK_OPTS)), end: iso(endOfWeek(a, WEEK_OPTS)) };
    case "mensal":
      return { view, start: iso(startOfMonth(a)), end: iso(endOfMonth(a)) };
    case "personalizado":
      return { view, start: anchor, end: anchor };
  }
}

/** Avança/retrocede o período mantendo o tipo de visão. */
export function shiftPeriod(period: Period, dir: -1 | 1): Period {
  const s = parse(period.start);
  switch (period.view) {
    case "diario": {
      const d = iso(addDays(s, dir));
      return { view: "diario", start: d, end: d };
    }
    case "semanal": {
      const ns = addWeeks(s, dir);
      return { view: "semanal", start: iso(startOfWeek(ns, WEEK_OPTS)), end: iso(endOfWeek(ns, WEEK_OPTS)) };
    }
    case "mensal": {
      const ns = addMonths(s, dir);
      return { view: "mensal", start: iso(startOfMonth(ns)), end: iso(endOfMonth(ns)) };
    }
    case "personalizado": {
      const len = rangeLengthDays(period);
      return {
        view: "personalizado",
        start: iso(addDays(s, dir * len)),
        end: iso(addDays(parse(period.end), dir * len)),
      };
    }
  }
}

/** Período de comparação — janela anterior de mesmo tamanho. */
export function previousPeriod(period: Period): Period {
  switch (period.view) {
    case "diario": {
      const d = iso(subDays(parse(period.start), 1));
      return { view: "diario", start: d, end: d };
    }
    case "semanal": {
      return {
        view: "semanal",
        start: iso(subDays(parse(period.start), 7)),
        end: iso(subDays(parse(period.end), 7)),
      };
    }
    case "mensal": {
      const prev = addMonths(parse(period.start), -1);
      return { view: "mensal", start: iso(startOfMonth(prev)), end: iso(endOfMonth(prev)) };
    }
    case "personalizado": {
      const len = rangeLengthDays(period);
      const end = subDays(parse(period.start), 1);
      return {
        view: "personalizado",
        start: iso(subDays(end, len - 1)),
        end: iso(end),
      };
    }
  }
}

export function rangeLengthDays(period: Period): number {
  return Math.max(1, differenceInCalendarDays(parse(period.end), parse(period.start)) + 1);
}

export function isSingleDay(period: Period): boolean {
  return period.start === period.end;
}

/** Todos os dias do intervalo (ISO), inclusivo. */
export function enumerateDays(period: Period): string[] {
  const s = parse(period.start);
  const e = parse(period.end);
  if (e < s) return [period.start];
  return eachDayOfInterval({ start: s, end: e }).map(iso);
}

// ── Rótulos ────────────────────────────────────────────────────────────────

export function periodLabel(period: Period): string {
  const s = parse(period.start);
  const e = parse(period.end);
  switch (period.view) {
    case "diario":
      return `${format(s, "dd")} ${MONTHS_ABBR[s.getMonth()]} ${s.getFullYear()}`;
    case "mensal":
      return `${MONTHS_PT[s.getMonth()]} ${s.getFullYear()}`;
    case "semanal":
    case "personalizado": {
      const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
      if (sameMonth) return `${format(s, "dd")}–${format(e, "dd")} ${MONTHS_ABBR[e.getMonth()]} ${e.getFullYear()}`;
      return `${format(s, "dd")} ${MONTHS_ABBR[s.getMonth()]} – ${format(e, "dd")} ${MONTHS_ABBR[e.getMonth()]} ${e.getFullYear()}`;
    }
  }
}

/** Rótulo curto da comparação (ex.: "vs. Julho", "vs. semana anterior"). */
export function comparisonLabel(period: Period): string {
  switch (period.view) {
    case "diario":
      return "vs. ontem";
    case "semanal":
      return "vs. semana anterior";
    case "mensal": {
      const prev = addMonths(parse(period.start), -1);
      return `vs. ${MONTHS_PT[prev.getMonth()]}`;
    }
    case "personalizado":
      return "vs. período anterior";
  }
}
