import type { ReactNode } from "react";
import {
  AlertTriangle,
  Car,
  Users,
  MapPin,
  Route,
  Flame,
  Timer,
  Clock,
} from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import { useReport } from "../ReportContext";
import { Panel, TrendIndicator } from "./primitives";
import { formatDurationMin } from "../occ-helpers";

function KpiCard({
  icon,
  label,
  value,
  sub,
  colorClass,
  bgClass,
  onClick,
  delta,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  colorClass: string;
  bgClass: string;
  onClick?: () => void;
  delta?: number | null;
}) {
  return (
    <Panel
      className={cn(
        "p-4 flex flex-col justify-between gap-3 transition-shadow",
        onClick && "cursor-pointer hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-700",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="flex flex-col justify-between gap-3 text-left h-full w-full disabled:cursor-default"
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", bgClass, colorClass)}>
          {icon}
        </div>
        <div>
          <div className={cn("font-bold leading-none text-2xl tabular-nums", colorClass)}>{value}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5">
            {label}
            <TrendIndicator delta={delta} />
          </div>
          {sub && <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>}
        </div>
      </button>
    </Panel>
  );
}

export function KpiRow({ onScrollTo }: { onScrollTo: (id: string) => void }) {
  const { derived, dispatch, comparison } = useReport();
  const k = derived.kpis;
  const d = comparison.hasPrev ? comparison.deltas : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard
        icon={<AlertTriangle className="w-4 h-4" />}
        label="Ocorrências"
        value={k.total}
        delta={d?.total}
        colorClass="text-orange-600 dark:text-orange-400"
        bgClass="bg-orange-50 dark:bg-orange-950/40"
        onClick={() => onScrollTo("tabela-ocorrencias")}
      />
      <KpiCard
        icon={<Car className="w-4 h-4" />}
        label="Veículos afetados"
        value={k.vehicles}
        delta={d?.vehicles}
        colorClass="text-blue-600 dark:text-blue-400"
        bgClass="bg-blue-50 dark:bg-blue-950/40"
        onClick={() => onScrollTo("ranking-veiculos")}
      />
      <KpiCard
        icon={<Users className="w-4 h-4" />}
        label="Motoristas envolvidos"
        value={k.drivers}
        delta={d?.drivers}
        colorClass="text-violet-600 dark:text-violet-400"
        bgClass="bg-violet-50 dark:bg-violet-950/40"
        onClick={() => onScrollTo("ranking-motoristas")}
      />
      <KpiCard
        icon={<MapPin className="w-4 h-4" />}
        label="Bases afetadas"
        value={k.bases}
        delta={d?.bases}
        colorClass="text-teal-600 dark:text-teal-400"
        bgClass="bg-teal-50 dark:bg-teal-950/40"
        onClick={() => onScrollTo("ranking-bases")}
      />
      <KpiCard
        icon={<Route className="w-4 h-4" />}
        label="Linhas afetadas"
        value={k.lines}
        delta={d?.lines}
        colorClass="text-indigo-600 dark:text-indigo-400"
        bgClass="bg-indigo-50 dark:bg-indigo-950/40"
        onClick={() => onScrollTo("ranking-linhas")}
      />
      <KpiCard
        icon={<Flame className="w-4 h-4" />}
        label="Ocorrências críticas"
        value={k.critical}
        delta={d?.critical}
        colorClass="text-red-600 dark:text-red-400"
        bgClass="bg-red-50 dark:bg-red-950/40"
        onClick={() => dispatch({ type: "toggleSeverity", value: "high" })}
      />

      {k.excedenteMinTotal > 0 && (
        <KpiCard
          icon={<Timer className="w-4 h-4" />}
          label="Tempo total de excesso"
          value={formatDurationMin(k.excedenteMinTotal)}
          delta={d?.excedenteMinTotal}
          sub="permanência acima do previsto"
          colorClass="text-amber-600 dark:text-amber-400"
          bgClass="bg-amber-50 dark:bg-amber-950/40"
        />
      )}

      <KpiCard
        icon={<Clock className="w-4 h-4" />}
        label="Janela de tempo"
        value={k.windowStart && k.windowEnd ? `${k.windowStart}–${k.windowEnd}` : "—"}
        colorClass="text-gray-600 dark:text-gray-400"
        bgClass="bg-gray-100 dark:bg-gray-800"
      />
    </div>
  );
}
