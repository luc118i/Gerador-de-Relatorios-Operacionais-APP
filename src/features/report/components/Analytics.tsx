import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Crosshair, Clock3 } from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import { useReport, applyFocusFilter } from "../ReportContext";
import { Panel, SectionTitle, MiniBar, TrendIndicator } from "./primitives";

// ── Ocorrências por tipo (clicável = filtra) ────────────────────────────────

export function OccurrenceTypePanel() {
  const { derived, filters, dispatch, comparison } = useReport();
  const rows = derived.types;
  const showDelta = comparison.hasPrev;

  return (
    <Panel className="p-5">
      <SectionTitle>Ocorrências por tipo</SectionTitle>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Sem dados no recorte atual.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const active = filters.typeCodes.includes(r.key);
            return (
              <button
                key={r.key}
                onClick={() => dispatch({ type: "toggle", field: "typeCodes", value: r.key })}
                title={`${r.count} ocorrências · ${Math.round(r.pct)}% do total`}
                className={cn(
                  "w-full text-left group rounded-lg -mx-1 px-1 py-1 transition-colors",
                  active ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-gray-50 dark:hover:bg-gray-800/60",
                )}
              >
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className={cn("truncate max-w-[150px]", active ? "text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-gray-400")}>
                    {r.label}
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums ml-2 flex items-center gap-1.5">
                    {showDelta && <TrendIndicator delta={comparison.byTypeDeltaPct[r.key] ?? null} />}
                    {r.count}
                    <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">({Math.round(r.pct)}%)</span>
                  </span>
                </div>
                <MiniBar pct={r.pct} tone={active ? "blue" : "gray"} />
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ── Distribuição por horário ────────────────────────────────────────────────

type Metric = "count" | "pct";
type Grouping = "hour" | "period";

export function OccurrenceTimeChart() {
  const { derived } = useReport();
  const [metric, setMetric] = useState<Metric>("count");
  const [grouping, setGrouping] = useState<Grouping>("hour");

  const total = derived.kpis.total || 1;
  const source =
    grouping === "hour"
      ? derived.hours.map((h) => ({ label: h.hour, count: h.count }))
      : derived.periods.map((p) => ({ label: p.label, count: p.count }));

  const data = source.map((d) => ({
    label: d.label,
    value: metric === "count" ? d.count : Math.round((d.count / total) * 100),
    raw: d.count,
  }));

  return (
    <Panel className="p-5">
      <SectionTitle
        right={
          <div className="flex items-center gap-1">
            <Toggle active={grouping === "hour"} onClick={() => setGrouping("hour")}>
              Por hora
            </Toggle>
            <Toggle active={grouping === "period"} onClick={() => setGrouping("period")}>
              Período
            </Toggle>
            <span className="w-px h-3 bg-gray-200 dark:bg-gray-700 mx-1" />
            <Toggle active={metric === "count"} onClick={() => setMetric("count")}>
              Qtd
            </Toggle>
            <Toggle active={metric === "pct"} onClick={() => setMetric("pct")}>
              %
            </Toggle>
          </div>
        }
      >
        <span className="inline-flex items-center gap-2">
          <Clock3 className="w-3.5 h-3.5 text-gray-400" />
          Ocorrências por horário
        </span>
      </SectionTitle>

      <ResponsiveContainer width="100%" height={grouping === "hour" ? 150 : 170}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval={grouping === "hour" ? 3 : 0}
          />
          <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <ReTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            cursor={{ fill: "rgba(148,163,184,0.12)" }}
            formatter={(v: number, _n, p: { payload?: { raw?: number } }) => [
              metric === "pct" ? `${v}% (${p.payload?.raw ?? 0})` : v,
              "Ocorrências",
            ]}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.raw > 0 ? "#3b82f6" : "#e5e7eb"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "cursor-pointer text-[11px] font-medium px-2 py-1 rounded-md transition-colors",
        active
          ? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300",
      )}
    >
      {children}
    </button>
  );
}

// ── Onde está o problema? ───────────────────────────────────────────────────

export function WhereIsTheProblem() {
  const { derived, dispatch } = useReport();
  const rows = derived.problem;

  if (rows.length === 0) return null;

  return (
    <Panel className="p-5">
      <SectionTitle icon={<Crosshair className="w-3.5 h-3.5 text-red-400" />}>
        Onde está o problema?
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {rows.map((r) => (
          <button
            key={r.dimension}
            onClick={() => applyFocusFilter(dispatch, r.filter.field, r.filter.value)}
            className="text-left rounded-lg border border-gray-100 dark:border-gray-800 p-3 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-colors"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {r.dimension}
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate mt-1" title={r.label}>
              {r.label}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-lg font-black tabular-nums text-red-500">{Math.round(r.pct)}%</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{r.count} ocorr.</span>
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}
