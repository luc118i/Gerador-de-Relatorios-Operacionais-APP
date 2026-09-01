import { useMemo, useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useReport } from "./ReportContext";
import { buildDailyReport } from "../../utils/relatorio-diario";
import { EmptyReportScene } from "../../app/components/EmptyReportScene";
import { ApuracaoPodium } from "../../app/components/ApuracaoPodium";
import { useAuth } from "../../app/context/AuthContext";
import type { ReportView } from "./period";

import { ReportHeader } from "./components/ReportHeader";
import { ReportActions } from "./components/ReportActions";
import { ReportFilterBar } from "./components/FilterControls";
import { KpiRow } from "./components/KpiRow";
import { NotaOperacionalCard } from "./components/NotaOperacionalCard";
import { OccurrenceTypePanel, OccurrenceTimeChart, WhereIsTheProblem } from "./components/Analytics";
import { RankingsGrid } from "./components/Rankings";
import { OperationalInsights } from "./components/OperationalInsights";
import { OccurrenceTable } from "./components/OccurrenceTable";
import { PendingTreatmentSection } from "./components/PendingTreatmentSection";
import { ApuracaoSection } from "./components/ApuracaoSection";
import { ReportSkeleton } from "./components/ReportSkeleton";
import { PeriodTrendCard } from "./components/PeriodTrendCard";
import { DailyEvolutionChart } from "./components/DailyEvolutionChart";
import { OperationalHeatmap } from "./components/OperationalHeatmap";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ReportLayout({
  onVoltar,
  onSetView,
  onShift,
  onJumpToDate,
  onOpenDay,
  onSetCustomRange,
}: {
  onVoltar: () => void;
  onSetView: (v: ReportView) => void;
  onShift: (dir: -1 | 1) => void;
  onJumpToDate: (iso: string) => void;
  onOpenDay: (iso: string) => void;
  onSetCustomRange: (start: string, end: string) => void;
}) {
  const { loading, error, all, filtered, isSingleDay, periodLabel, date } = useReport();
  const { profileName, profileNameAliases, user } = useAuth();
  const [showText, setShowText] = useState(false);

  const textReport = useMemo(() => buildDailyReport(filtered, date), [filtered, date]);
  const hasAnyData = all.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <ReportHeader
        onVoltar={onVoltar}
        onSetView={onSetView}
        onShift={onShift}
        onJumpToDate={onJumpToDate}
        onSetCustomRange={onSetCustomRange}
        actions={hasAnyData && !loading && isSingleDay ? <ReportActions /> : null}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {loading && <ReportSkeleton />}

        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && !hasAnyData && (
          <EmptyReportScene subtitle={`sem registros para ${periodLabel}`} />
        )}

        {!loading && !error && hasAnyData && (
          <>
            <NotaOperacionalCard />
            <KpiRow onScrollTo={scrollTo} />
            <ReportFilterBar />

            {!isSingleDay && (
              <>
                <DailyEvolutionChart onPickDay={onOpenDay} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <PeriodTrendCard />
                  <OperationalHeatmap />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <OccurrenceTimeChart />
              </div>
              <OccurrenceTypePanel />
            </div>

            <WhereIsTheProblem />
            <RankingsGrid />
            <OperationalInsights />
            <OccurrenceTable />
            <PendingTreatmentSection />

            {isSingleDay && (
              <>
                <ApuracaoPodium
                  occurrences={filtered}
                  currentProfileName={profileName}
                  currentProfileAliases={profileNameAliases}
                  currentUserId={user?.id}
                />
                <ApuracaoSection occurrences={filtered} />

                {/* Relatório em texto (colapsável) */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowText((v) => !v)}
                    className="cursor-pointer w-full px-5 py-3.5 flex items-center justify-between text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      Relatório em texto (formato padronizado)
                    </span>
                    {showText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showText && (
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
                      <textarea
                        value={textReport.textWithMarkers}
                        readOnly
                        rows={20}
                        className="mt-4 w-full px-4 py-3 font-mono text-xs border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 focus:outline-none resize-none"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
