import { useState } from "react";
import { Gavel, ShieldAlert, ShieldOff, ClipboardList } from "lucide-react";
import type { OccurrenceDTO } from "../../domain/occurrences";
import type { TipoMedida } from "./RizerRegisterModal";
import { tratativaToTipoMedida } from "../../utils/tratativa";

export interface BatchRizerItem {
  id: string;
  advertencia: boolean;
}

interface RowState {
  [id: string]: TipoMedida;
}

const TIPO_OPTIONS: Array<{ value: TipoMedida; label: string; icon: React.ReactNode; active: string; inactive: string }> = [
  {
    value: "advertencia",
    label: "Advertência",
    icon: <ShieldAlert className="w-3 h-3" />,
    active: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-400",
    inactive: "bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800 hover:border-amber-300 hover:text-amber-500",
  },
  {
    value: "suspensao",
    label: "Suspensão",
    icon: <ShieldOff className="w-3 h-3" />,
    active: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-400",
    inactive: "bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800 hover:border-red-300 hover:text-red-500",
  },
  {
    value: "nenhum",
    label: "Apenas reg.",
    icon: <ClipboardList className="w-3 h-3" />,
    active: "bg-slate-100 dark:bg-slate-950/40 text-slate-700 dark:text-slate-400 border-slate-400",
    inactive: "bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800 hover:border-slate-300 hover:text-slate-500",
  },
];

interface Props {
  open: boolean;
  subject: string;
  occs: OccurrenceDTO[];
  onConfirm: (items: BatchRizerItem[]) => void;
  onCancel: () => void;
}

export function BatchRizerModal({ open, subject, occs, onConfirm, onCancel }: Props) {
  const [rows, setRows] = useState<RowState>(() =>
    Object.fromEntries(
      occs.map((o) => [o.id, tratativaToTipoMedida(o.tratativa) ?? ("advertencia" as TipoMedida)])
    )
  );

  if (!open) return null;

  function setTipo(id: string, tipo: TipoMedida) {
    setRows((prev) => ({ ...prev, [id]: tipo }));
  }

  function handleConfirm() {
    const items: BatchRizerItem[] = occs.map((o) => ({
      id: o.id,
      advertencia: rows[o.id] === "advertencia",
    }));
    onConfirm(items);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 shrink-0">
            <Gavel className="w-4 h-4 text-orange-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Registrar no RIZER —{" "}
              <span className="text-orange-600 dark:text-orange-400">{occs.length} ocorrência{occs.length !== 1 ? "s" : ""}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{subject}</p>
          </div>
        </div>

        {/* Legenda */}
        <div className="px-5 pt-3 pb-1 flex items-center gap-4 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
          <span className="flex-1">Motorista / Veículo</span>
          <span className="w-52 text-right">Tipo de medida</span>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 px-5 pb-2">
          {occs.map((occ) => {
            const driver = occ.drivers.find((d) => d.position === 1);
            const current = rows[occ.id] ?? "advertencia";
            return (
              <div
                key={occ.id}
                className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                    {driver?.name ?? "—"}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {occ.vehicleNumber} · {occ.baseCode}
                  </p>
                </div>

                {/* Tipo selector */}
                <div className="flex gap-1 shrink-0">
                  {TIPO_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTipo(occ.id, opt.value)}
                      title={opt.label}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium transition-all ${
                        current === opt.value ? opt.active : opt.inactive
                      }`}
                    >
                      {opt.icon}
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            Confirmar ({occs.length})
          </button>
        </div>
      </div>
    </div>
  );
}
