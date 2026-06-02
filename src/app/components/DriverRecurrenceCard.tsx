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
        active ? cls : "bg-white/50 text-slate-400 border-slate-200",
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
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>

      <div
        className={[
          "rounded-xl border overflow-hidden transition-colors",
          isDirty
            ? "border-red-300/70 bg-red-50/60 backdrop-blur-xl shadow-lg shadow-red-500/10"
            : "border-slate-200 bg-white shadow-sm",
        ].join(" ")}
      >
        {/* Identificação do motorista */}
        <div
          className={[
            "flex items-center gap-3 px-3 py-2.5 border-b",
            isDirty
              ? "bg-red-100/40 border-red-200/70"
              : "bg-slate-50/70 border-slate-200",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
              isDirty ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700",
            ].join(" ")}
          >
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 tabular-nums">
                {driver.code}
              </span>
              {driver.base ? (
                <span
                  className={[
                    "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium",
                    isDirty
                      ? "bg-red-200/60 text-red-700"
                      : "bg-slate-200/70 text-slate-600",
                  ].join(" ")}
                >
                  {driver.base}
                </span>
              ) : null}
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {driver.name}
            </div>
          </div>

          <button
            type="button"
            onClick={onChangeRequested}
            className={[
              "cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              isDirty
                ? "text-red-700 hover:bg-red-100/70"
                : "text-blue-600 hover:bg-blue-50",
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
            isDirty ? "text-red-600/80" : "text-slate-500",
          ].join(" ")}
        >
          <History className="w-3.5 h-3.5" />
          Ocorrências {data?.periodLabel ? `· ${data.periodLabel}` : "neste mês"}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2 animate-pulse">
            <div className="h-8 bg-slate-200 rounded-lg" />
            <div className="h-8 bg-slate-200 rounded-lg" />
            <div className="h-8 bg-slate-200 rounded-lg" />
          </div>
        ) : isError || !data ? (
          <p className="text-xs text-slate-400">Histórico indisponível.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Counter
              label="Advertência"
              value={data.advertencia}
              dot="bg-amber-400"
              cls="bg-amber-50 text-amber-700 border-amber-200"
            />
            <Counter
              label="Vale"
              value={data.vale}
              dot="bg-red-500"
              cls="bg-red-50 text-red-700 border-red-200"
            />
            <Counter
              label="Suspensão"
              value={data.suspensao}
              dot="bg-violet-500"
              cls="bg-violet-50 text-violet-700 border-violet-200"
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
