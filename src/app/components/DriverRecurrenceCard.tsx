import { History, User, RefreshCw } from "lucide-react";
import { useDriverStats } from "../../features/occurrences/queries/drivers.queries";
import type { Driver } from "../../domain/drivers";

function Counter({
  label,
  value,
  dot,
  cls,
}: {
  label: string;
  value: number;
  dot: string;
  cls: string;
}) {
  const active = value > 0;
  return (
    <div
      className={[
        "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm",
        active ? cls : "bg-white/50 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-slate-800",
      ].join(" ")}
    >
      <span
        className={["w-2 h-2 rounded-full", active ? dot : "bg-slate-300"].join(
          " ",
        )}
      />
      <span className="font-medium">{label}</span>
      <span className="ml-auto font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function DriverRecurrenceCard({
  label,
  required,
  driverId,
  driver,
  onChangeRequested,
}: {
  label: string;
  required?: boolean;
  driverId: string | null;
  driver: Driver | null;
  onChangeRequested: () => void;
}) {
  const { data, isLoading, isError } = useDriverStats(driverId);

  if (!driverId || !driver) return null;

  const isDirty =
    !!data && data.advertencia + data.vale + data.suspensao > 0;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
        {label} {required ? <span className="text-red-600 dark:text-red-400">*</span> : null}
      </label>

      <div
        className={[
          "rounded-xl border overflow-hidden transition-colors",
          isDirty
            ? "border-red-300/70 bg-red-50/60 dark:bg-red-950/40 backdrop-blur-xl shadow-lg shadow-red-500/10"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 shadow-sm",
        ].join(" ")}
      >
        {/* Identificação do motorista */}
        <div
          className={[
            "flex items-center gap-3 px-3 py-2.5 border-b",
            isDirty
              ? "bg-red-100/40 dark:bg-red-950/40 border-red-200 dark:border-red-800/70"
              : "bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
              isDirty ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400" : "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
            ].join(" ")}
          >
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {driver.code}
              </span>
              {driver.base ? (
                <span
                  className={[
                    "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium",
                    isDirty
                      ? "bg-red-200/60 text-red-700 dark:text-red-400"
                      : "bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400",
                  ].join(" ")}
                >
                  {driver.base}
                </span>
              ) : null}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {driver.name}
            </div>
          </div>

          <button
            type="button"
            onClick={onChangeRequested}
            className={[
              "cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              isDirty
                ? "text-red-700 dark:text-red-400 hover:bg-red-100/70 dark:hover:bg-red-950/40"
                : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40",
            ].join(" ")}
            title="Alterar motorista"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Alterar
          </button>
        </div>

      {/* Recorrência no mês */}
      <div className="p-3">
        <div
          className={[
            "flex items-center gap-1.5 mb-2.5 text-xs font-medium",
            isDirty ? "text-red-600 dark:text-red-400/80" : "text-slate-500 dark:text-slate-400",
          ].join(" ")}
        >
          <History className="w-3.5 h-3.5" />
          Ocorrências {data?.periodLabel ? `· ${data.periodLabel}` : "neste mês"}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2 animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        ) : isError || !data ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">Histórico indisponível.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Counter
              label="Advertência"
              value={data.advertencia}
              dot="bg-amber-400"
              cls="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
            />
            <Counter
              label="Vale"
              value={data.vale}
              dot="bg-red-500"
              cls="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
            />
            <Counter
              label="Suspensão"
              value={data.suspensao}
              dot="bg-violet-500"
              cls="bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800"
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
