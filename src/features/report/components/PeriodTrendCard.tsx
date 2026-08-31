import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import { useReport } from "../ReportContext";
import { Panel, SectionTitle } from "./primitives";

const DIRECTION = {
  up: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "tendência de alta", cls: "text-red-500" },
  down: { icon: <TrendingDown className="w-3.5 h-3.5" />, label: "tendência de baixa", cls: "text-emerald-500" },
  flat: { icon: <Minus className="w-3.5 h-3.5" />, label: "estável", cls: "text-gray-400 dark:text-gray-500" },
};

export function PeriodTrendCard() {
  const { range } = useReport();
  const { buckets, direction } = range.trend;
  const dir = DIRECTION[direction];

  return (
    <Panel className="p-5">
      <SectionTitle
        right={
          <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", dir.cls)}>
            {dir.icon}
            {dir.label}
          </span>
        }
      >
        Tendência operacional
      </SectionTitle>

      {buckets.length < 2 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Período curto demais para tendência.</p>
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <ComposedChart data={buckets} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={0} />
            <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <ReTooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              formatter={(v: number, name) => [Math.round(v * 10) / 10, name === "avg" ? "Média móvel" : "Ocorrências"]}
            />
            <Bar dataKey="count" fill="#93c5fd" radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}
