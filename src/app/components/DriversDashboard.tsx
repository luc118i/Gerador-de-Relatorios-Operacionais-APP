import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import type { Driver } from "../../domain/drivers";
import { useDriverDashboard } from "../../features/occurrences/queries/drivers.queries";
import { exportDriversDashboardXlsx } from "../../features/report/driversDashboardXlsx";
import { scanOccurrencesForDays } from "../../features/report/scanRecentOccurrences";
import {
  DriversReportModal,
  type ReportPeriod,
} from "../../features/report/components/DriversReportModal";
import { getOccurrencesByDay } from "../../api/occurrences.api";

interface DriversDashboardProps {
  onSelectDriver: (driver: Driver) => void;
}

const SITUACAO_BADGE: Record<
  "REGULAR" | "ATENCAO" | "CRITICO",
  { label: string; className: string }
> = {
  REGULAR: {
    label: "REGULAR",
    className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  },
  ATENCAO: {
    label: "ATENÇÃO",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  CRITICO: {
    label: "CRÍTICO",
    className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
};

function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 animate-pulse">
      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
      <div className="h-7 w-12 bg-gray-200 dark:bg-gray-800 rounded mt-2" />
    </div>
  );
}

export function DriversDashboard({ onSelectDriver }: DriversDashboardProps) {
  const { data, isLoading, isError } = useDriverDashboard();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  if (isError) {
    return (
      <div className="mb-6 text-sm text-red-600 dark:text-red-400">
        Falha ao carregar o painel de indicadores.
      </div>
    );
  }

  const totals = data?.totals;
  const porBase = data?.porBase ?? [];
  const ranking = data?.ranking ?? [];
  const maxPorBase = Math.max(1, ...porBase.map((b) => b.total));

  async function handleGenerate(period: ReportPeriod) {
    if (!data || exporting) return;
    setExporting(true);
    setProgress({ done: 0, total: 0 });
    try {
      const days = eachDayOfInterval({
        start: parseISO(period.start),
        end: parseISO(period.end),
      }).map((d) => format(d, "yyyy-MM-dd"));

      // Varre o período dia-a-dia reaproveitando o cache do Centro de
      // Relatórios — pode levar alguns segundos na primeira vez.
      const { occurrences, failedDays } = await scanOccurrencesForDays(
        (iso) =>
          queryClient.fetchQuery({
            queryKey: ["report", "day", iso],
            queryFn: () => getOccurrencesByDay(iso),
            staleTime: 30_000,
          }),
        days,
        { onProgress: (done, total) => setProgress({ done, total }) },
      );
      exportDriversDashboardXlsx(data, occurrences, period);
      setPickerOpen(false);
      if (failedDays > 0) {
        toast.warning(
          `${failedDays} dia(s) não carregaram — a aba "Ocorrências por motorista" pode estar incompleta.`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao gerar o relatório geral.",
      );
    } finally {
      setExporting(false);
      setProgress(null);
    }
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Painel de indicadores
        </h2>
        <button
          onClick={() => setPickerOpen(true)}
          disabled={isLoading || !data}
          title="Escolha o período e baixe um .xlsx: resumo da frota, ocorrências por base, piores situações e uma aba com as ocorrências por motorista (link do RIZER incluso)"
          className="cursor-pointer flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown className="w-3.5 h-3.5" />
          Relatório geral (.xlsx)
        </button>
      </div>

      <DriversReportModal
        open={pickerOpen}
        onClose={() => !exporting && setPickerOpen(false)}
        onConfirm={handleGenerate}
        exporting={exporting}
        progress={progress}
      />

      {/* Cards de totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <DashboardCard label="Motoristas" value={totals?.motoristas} />
            <DashboardCard label="Com ocorrência" value={totals?.comOcorrencia} />
            <DashboardCard label="Reincidentes" value={totals?.reincidentes} />
            <DashboardCard
              label="Críticos"
              value={totals?.criticos}
              accent="text-red-600 dark:text-red-400"
            />
          </>
        )}
      </div>

      {!isLoading && (totals?.motoristas ?? 0) > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ocorrências por base */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Ocorrências por base
            </h3>
            {porBase.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Sem dados.</p>
            ) : (
              <div className="space-y-2">
                {porBase.slice(0, 8).map((b) => (
                  <div key={b.base} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 truncate text-gray-600 dark:text-gray-400">
                      {b.base}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${(b.total / maxPorBase) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-gray-700 dark:text-gray-300 font-medium">
                      {b.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ranking piores */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <h3
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3"
              title="Índice = 100 − (peso das medidas dos últimos 90 dias × 10). Registro/Orientação 0,05 · Advertência 1,0 · Vale/Suspensão 2,0"
            >
              Piores situações
            </h3>
            {ranking.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Sem dados.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {ranking.map((r) => {
                  const badge = SITUACAO_BADGE[r.situacao];
                  return (
                    <li key={r.driverId}>
                      <button
                        onClick={() =>
                          onSelectDriver({
                            id: r.driverId,
                            code: r.code,
                            name: r.name,
                            base: r.base,
                            phone: null,
                          })
                        }
                        className="cursor-pointer w-full flex items-center justify-between gap-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-md px-1 -mx-1"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {r.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {r.code} • {r.base ?? "-"} • {r.totalOcorrencias} ocorr.
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | undefined;
  accent?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
        {label}
      </p>
      <p className={`text-2xl font-semibold mt-1 ${accent ?? "text-gray-900 dark:text-gray-100"}`}>
        {value ?? "-"}
      </p>
    </div>
  );
}
