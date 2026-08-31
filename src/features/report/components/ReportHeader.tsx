import { ArrowLeft, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import { useReport } from "../ReportContext";
import type { ReportView } from "../period";

const VIEWS: { key: ReportView; label: string }[] = [
  { key: "diario", label: "Diário" },
  { key: "semanal", label: "Semanal" },
  { key: "mensal", label: "Mensal" },
  { key: "personalizado", label: "Personalizado" },
];

export function ReportHeader({
  onVoltar,
  onSetView,
  onShift,
  onJumpToDate,
  onSetCustomRange,
  actions,
}: {
  onVoltar: () => void;
  onSetView: (v: ReportView) => void;
  onShift: (dir: -1 | 1) => void;
  onJumpToDate: (iso: string) => void;
  onSetCustomRange: (start: string, end: string) => void;
  actions?: React.ReactNode;
}) {
  const { period, periodLabel, comparisonLabel, fetching, progress } = useReport();
  const isCustom = period.view === "personalizado";

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Linha 1 — identidade + nav de período + ações */}
        <div className="flex items-center justify-between gap-4 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onVoltar}
              className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <div className="hidden sm:block min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none">
                Centro de Relatórios
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Inteligência operacional</p>
            </div>

            {isCustom ? (
              <div className="flex items-center gap-1.5 sm:ml-3 shrink-0">
                <input
                  type="date"
                  value={period.start}
                  max={period.end}
                  onChange={(e) => e.target.value && onSetCustomRange(e.target.value, period.end)}
                  className="text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                  aria-label="Início do período"
                />
                <span className="text-xs text-gray-400">→</span>
                <input
                  type="date"
                  value={period.end}
                  min={period.start}
                  onChange={(e) => e.target.value && onSetCustomRange(period.start, e.target.value)}
                  className="text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                  aria-label="Fim do período"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:ml-3 shrink-0">
                <button
                  onClick={() => onShift(-1)}
                  className="cursor-pointer p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                  aria-label="Período anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <label className="relative flex items-center">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-2 whitespace-nowrap inline-flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    {periodLabel}
                  </span>
                  <input
                    type="date"
                    value={period.start}
                    onChange={(e) => e.target.value && onJumpToDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    aria-label="Escolher data"
                  />
                </label>

                <button
                  onClick={() => onShift(1)}
                  className="cursor-pointer p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                  aria-label="Próximo período"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <span className="hidden md:inline text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
              {comparisonLabel}
            </span>
          </div>

          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>

        {/* Linha 2 — Visão temporal */}
        <div className="flex items-center gap-1 h-11 -mt-px overflow-x-auto">
          {VIEWS.map((v) => {
            const active = period.view === v.key;
            return (
              <button
                key={v.key}
                onClick={() => onSetView(v.key)}
                className={cn(
                  "px-3 h-9 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
                )}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* barra de progresso do carregamento progressivo dos dias */}
      {fetching && progress.total > 1 && (
        <div className="h-0.5 bg-blue-100 dark:bg-blue-950">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress.total ? (progress.loaded / progress.total) * 100 : 0}%` }}
          />
        </div>
      )}
    </header>
  );
}
