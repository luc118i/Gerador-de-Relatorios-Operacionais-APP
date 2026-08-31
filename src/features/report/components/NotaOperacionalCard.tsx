import { Info } from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import { useReport } from "../ReportContext";
import { Panel } from "./primitives";

const TONE: Record<string, { text: string; bar: string; ring: string }> = {
  good: { text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500", ring: "border-emerald-200 dark:border-emerald-800" },
  attention: { text: "text-yellow-700 dark:text-yellow-400", bar: "bg-yellow-500", ring: "border-yellow-200 dark:border-yellow-800" },
  warning: { text: "text-orange-700 dark:text-orange-400", bar: "bg-orange-500", ring: "border-orange-200 dark:border-orange-800" },
  danger: { text: "text-red-700 dark:text-red-400", bar: "bg-red-500", ring: "border-red-200 dark:border-red-800" },
};

const HEALTH_LABEL = (h: number) =>
  h >= 80 ? "Excelente" : h >= 60 ? "Boa" : h >= 40 ? "Estável" : h >= 20 ? "Atenção" : "Crítica";

export function NotaOperacionalCard() {
  const { derived, comparison, isSingleDay } = useReport();
  const s = derived.score;
  const scaleHint = isSingleDay
    ? "A nota considera volume de ocorrências, severidade, reincidência de motorista e tempo de excesso de permanência no período filtrado."
    : "Fora da visão diária, a nota é a de um dia médio do período: as penalidades de volume, severidade e excesso são divididas pelo nº de dias.";
  const tone = TONE[s.tone] ?? TONE.attention;
  const scoreDelta = comparison.hasPrev ? s.score - comparison.prevScore : null;

  return (
    <Panel className={cn("p-5 flex flex-col sm:flex-row sm:items-center gap-5", tone.ring)}>
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Nota operacional
          </div>
          <div className="text-5xl font-black tabular-nums leading-none mt-1" style={{ color: s.hex }}>
            {s.score.toFixed(1).replace(".", ",")}
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">/ 10</div>
          {scoreDelta !== null && Math.abs(scoreDelta) >= 0.1 && (
            <div
              className={cn(
                "text-[11px] font-semibold tabular-nums mt-1",
                scoreDelta > 0 ? "text-emerald-500" : "text-red-500",
              )}
              title={`Nota ${comparison.label}`}
            >
              {scoreDelta > 0 ? "↑" : "↓"} {Math.abs(scoreDelta).toFixed(1).replace(".", ",")} {comparison.label}
            </div>
          )}
        </div>
        <div className="h-14 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-sm font-semibold", tone.text)}>{s.label}</span>
          <span className="text-gray-300 dark:text-gray-600" title={scaleHint}>
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 mb-1">
            <span>Saúde operacional</span>
            <span className="font-semibold text-gray-600 dark:text-gray-400 tabular-nums">
              {s.health}% · {HEALTH_LABEL(s.health)}
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", tone.bar)}
              style={{ width: `${s.health}%` }}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}
