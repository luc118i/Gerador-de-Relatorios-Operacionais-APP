import { Zap, AlertTriangle, TrendingUp, Info } from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import { useReport } from "../ReportContext";
import { Panel, SectionTitle } from "./primitives";

const TONE_ICON = {
  danger: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
  warning: <TrendingUp className="w-3.5 h-3.5 text-amber-500" />,
  info: <Info className="w-3.5 h-3.5 text-blue-500" />,
};

const TONE_RING = {
  danger: "border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20",
  warning: "border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20",
  info: "border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20",
};

export function OperationalInsights() {
  const { derived } = useReport();
  const insights = derived.insights;

  return (
    <Panel className="p-5">
      <SectionTitle icon={<Zap className="w-3.5 h-3.5 text-yellow-500" />}>Insights automáticos</SectionTitle>
      {insights.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Nenhum padrão relevante detectado no recorte atual — volume baixo ou distribuição homogênea.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {insights.map((it) => (
            <div key={it.id} className={cn("rounded-lg border p-3", TONE_RING[it.tone])}>
              <div className="flex items-center gap-1.5 mb-1">
                {TONE_ICON[it.tone]}
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{it.title}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{it.detail}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
