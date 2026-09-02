import { useState } from "react";
import { FileDown, Loader2, X } from "lucide-react";
import { format, subDays } from "date-fns";

// Escolha do período antes de gerar o "Relatório geral (.xlsx)" da tela de
// Motoristas. Só o período da aba "Ocorrências por motorista" — as outras
// abas são sempre o retrato atual do painel.

export type ReportPeriod = { start: string; end: string };

const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
] as const;

const iso = (d: Date) => format(d, "yyyy-MM-dd");
// Retenção do banco é ~90 dias (purge mensal) + uma folga.
const FLOOR = iso(subDays(new Date(), 92));

function pill(active: boolean): string {
  return [
    "cursor-pointer text-xs px-2.5 py-1 rounded-full border transition-colors",
    active
      ? "bg-blue-600 border-blue-600 text-white"
      : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
  ].join(" ");
}

const inputCls =
  "mt-1 w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

export function DriversReportModal({
  open,
  onClose,
  onConfirm,
  exporting,
  progress,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (period: ReportPeriod) => void;
  exporting: boolean;
  progress: { done: number; total: number } | null;
}) {
  const today = iso(new Date());
  const [preset, setPreset] = useState<number | "custom">(30);
  const [start, setStart] = useState(iso(subDays(new Date(), 29)));
  const [end, setEnd] = useState(today);

  if (!open) return null;

  const custom = preset === "custom";
  const invalid = custom && (!start || !end || start > end);

  function confirm() {
    if (exporting || invalid) return;
    if (custom) {
      onConfirm({ start, end });
    } else {
      onConfirm({ start: iso(subDays(new Date(), (preset as number) - 1)), end: today });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Relatório geral de Motoristas
          </h2>
          <button
            onClick={onClose}
            disabled={exporting}
            aria-label="Fechar"
            className="cursor-pointer inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Período de análise — aba “Ocorrências por motorista”
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => setPreset(p.days)}
                  className={pill(preset === p.days)}
                >
                  Últimos {p.label}
                </button>
              ))}
              <button onClick={() => setPreset("custom")} className={pill(custom)}>
                Personalizado
              </button>
            </div>
          </div>

          {custom && (
            <div className="flex items-start gap-3">
              <label className="flex-1 text-xs text-gray-500 dark:text-gray-400">
                De
                <input
                  type="date"
                  value={start}
                  min={FLOOR}
                  max={end || today}
                  onChange={(e) => setStart(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="flex-1 text-xs text-gray-500 dark:text-gray-400">
                Até
                <input
                  type="date"
                  value={end}
                  min={start || FLOOR}
                  max={today}
                  onChange={(e) => setEnd(e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>
          )}

          {invalid && (
            <p className="text-xs text-red-600 dark:text-red-400">
              A data inicial está depois da final.
            </p>
          )}

          <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
            O banco guarda ~90 dias de ocorrências — períodos mais antigos voltam
            vazios. As abas de resumo, por base e ranking são sempre o retrato
            atual do painel, independentemente do período.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={exporting}
            className="cursor-pointer px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={confirm}
            disabled={exporting || invalid}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {exporting
              ? progress && progress.total > 0
                ? `Gerando… ${progress.done}/${progress.total} dias`
                : "Gerando…"
              : "Gerar (.xlsx)"}
          </button>
        </div>
      </div>
    </div>
  );
}
