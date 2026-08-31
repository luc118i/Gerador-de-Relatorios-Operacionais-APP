import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CalendarRange } from "lucide-react";
import { useReport } from "../ReportContext";
import { Panel, SectionTitle } from "./primitives";
import type { DayPoint } from "../range-aggregations";

function DayTooltip({ active, payload }: { active?: boolean; payload?: { payload: DayPoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  const [y, m, dd] = d.date.split("-");
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {dd}/{m}/{y}
      </div>
      <div className="text-gray-500 dark:text-gray-400 mb-1">
        {d.count} ocorrência{d.count !== 1 ? "s" : ""}
      </div>
      {d.byType.map((t) => (
        <div key={t.code} className="text-gray-500 dark:text-gray-400 tabular-nums">
          {t.count} {t.label}
        </div>
      ))}
      {d.count > 0 && <div className="text-blue-500 mt-1">clique para abrir o dia</div>}
    </div>
  );
}

export function DailyEvolutionChart({ onPickDay }: { onPickDay: (iso: string) => void }) {
  const { range } = useReport();
  const data = range.byDay;
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Panel className="p-5">
      <SectionTitle icon={<CalendarRange className="w-3.5 h-3.5 text-blue-400" />}>
        Evolução diária do período
      </SectionTitle>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="dayNum"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval={data.length > 20 ? 1 : 0}
          />
          <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <ReTooltip content={<DayTooltip />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
          <Bar
            dataKey="count"
            radius={[3, 3, 0, 0]}
            cursor="pointer"
            onClick={(d: unknown) => {
              const entry = d as DayPoint | undefined;
              if (entry?.date && entry.count > 0) onPickDay(entry.date);
            }}
          >
            {data.map((d) => (
              <Cell
                key={d.date}
                fill={d.count === 0 ? "#e5e7eb" : d.count >= max * 0.75 ? "#ef4444" : d.count >= max * 0.4 ? "#f59e0b" : "#3b82f6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
        Barras vermelhas = dias de pico. Clique num dia para abrir o relatório diário correspondente.
      </p>
    </Panel>
  );
}
