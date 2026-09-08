import { Search, X } from "lucide-react";
import { startOfWeek } from "date-fns";
import type { Prioridade } from "../../../domain/occurrences";
import { getLocalDateString } from "../../../utils/dateUtils";
import { PRIORIDADES } from "../../config/occurrenceWorkflow";
import { DatePicker } from "../../components/ui/date-picker";
import { PickSelect } from "./ui/PickSelect";

/** Atalhos de período do quadro. */
function rangePresets() {
  const now = new Date();
  const today = getLocalDateString(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday = getLocalDateString(y);
  const weekStart = getLocalDateString(startOfWeek(now, { weekStartsOn: 1 })); // segunda
  return [
    { id: "hoje", label: "Hoje", from: today, to: today },
    { id: "ontem", label: "Ontem", from: yesterday, to: yesterday },
    { id: "semana", label: "Essa semana", from: weekStart, to: today },
  ];
}

export type BoardUiFilters = {
  from: string;
  to: string;
  prioridades: Prioridade[];
  hasReport: "" | "true" | "false";
  /** Busca única — cobre ocorrência, motorista, prefixo, linha, base,
   *  responsável e ID (ver haystack no CentralOcorrenciasPage). */
  search: string;
};

export function emptyBoardFilters(from: string, to: string): BoardUiFilters {
  return {
    from,
    to,
    prioridades: [],
    hasReport: "",
    search: "",
  };
}

type Props = {
  value: BoardUiFilters;
  onChange: (next: BoardUiFilters) => void;
  onReset: () => void;
  resultCount: number;
};

const inputCls =
  "px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400";

export function BoardFilters({ value, onChange, onReset, resultCount }: Props) {
  const set = <K extends keyof BoardUiFilters>(k: K, v: BoardUiFilters[K]) =>
    onChange({ ...value, [k]: v });

  const setRange = (from: string, to: string) => onChange({ ...value, from, to });
  const presets = rangePresets();
  const activePreset = presets.find((p) => p.from === value.from && p.to === value.to)?.id ?? null;

  const toggle = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const dirty =
    value.prioridades.length > 0 || !!value.hasReport || !!value.search;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Buscar ocorrência, motorista, prefixo, linha, base, responsável ou ID…"
            className={`${inputCls} w-full pl-8 pr-7 py-2`}
          />
          {value.search && (
            <button
              onClick={() => set("search", "")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer p-0.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {resultCount} ocorrência{resultCount !== 1 ? "s" : ""}
        </span>
        {dirty && (
          <button
            onClick={onReset}
            className="cursor-pointer text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">De</span>
          <DatePicker
            value={value.from}
            onChange={(v) => set("from", v)}
            className="w-[168px] py-1.5 text-xs"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Até</span>
          <DatePicker
            value={value.to}
            onChange={(v) => set("to", v)}
            className="w-[168px] py-1.5 text-xs"
          />
        </div>

        {/* Atalhos de período */}
        <div className="flex items-center gap-1">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRange(p.from, p.to)}
              className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                activePreset === p.id
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <PickSelect
          ariaLabel="Filtrar por relatório"
          className="w-40"
          value={value.hasReport || "todos"}
          onChange={(v) => set("hasReport", (v === "todos" ? "" : v) as BoardUiFilters["hasReport"])}
          options={[
            { value: "todos", label: "Relatório: todos" },
            { value: "true", label: "Com relatório" },
            { value: "false", label: "Sem relatório" },
          ]}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRIORIDADES.map((p) => {
          const on = value.prioridades.includes(p.code);
          return (
            <button
              key={p.code}
              onClick={() => set("prioridades", toggle(value.prioridades, p.code))}
              className={`flex cursor-pointer items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                on
                  ? "bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${p.dot}`} />
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
