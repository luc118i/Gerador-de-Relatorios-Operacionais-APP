import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, ShieldOff, ClipboardList } from "lucide-react";

export type TipoMedida = "advertencia" | "suspensao" | "nenhum";

interface Option {
  value: TipoMedida;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  border: string;
  bg: string;
}

const OPTIONS: Option[] = [
  {
    value: "advertencia",
    icon: <ShieldAlert className="w-5 h-5" />,
    title: "Advertência",
    description: "Registra no RIZER e busca a medida disciplinar no Drive.",
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  {
    value: "suspensao",
    icon: <ShieldOff className="w-5 h-5" />,
    title: "Suspensão",
    description: "Registra no RIZER sem buscar medida no Drive.",
    color: "text-red-600 dark:text-red-400",
    border: "border-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
  },
  {
    value: "nenhum",
    icon: <ClipboardList className="w-5 h-5" />,
    title: "Apenas registrar",
    description: "Registra a ocorrência no RIZER sem nenhuma medida disciplinar.",
    color: "text-slate-600 dark:text-slate-400",
    border: "border-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/40",
  },
];

interface Props {
  open: boolean;
  onConfirm: (tipo: TipoMedida) => void;
  onCancel: () => void;
  selected: TipoMedida;
  onSelect: (tipo: TipoMedida) => void;
}

export function RizerRegisterModal({ open, onConfirm, onCancel, selected, onSelect }: Props) {
  // Bloqueia scroll do body enquanto o modal está aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Registrar no RIZER
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Selecione o tipo de medida disciplinar para esta ocorrência.
        </p>

        <div className="flex flex-col gap-2 mb-5">
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                className={`flex items-start gap-3 w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                  isSelected
                    ? `${opt.border} ${opt.bg}`
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${isSelected ? opt.color : "text-gray-400 dark:text-gray-500"}`}>
                  {opt.icon}
                </span>
                <span>
                  <span className={`block text-sm font-medium ${isSelected ? opt.color : "text-gray-700 dark:text-gray-300"}`}>
                    {opt.title}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {opt.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selected)}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
