import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, ShieldOff, ClipboardList } from "lucide-react";
import type { TipoMedida } from "./RizerRegisterModal";

const META: Record<TipoMedida, { icon: React.ReactNode; title: string; description: string; color: string; border: string; bg: string }> = {
  advertencia: {
    icon: <ShieldAlert className="w-5 h-5" />,
    title: "Advertência",
    description: "Vai registrar no RIZER e buscar a medida disciplinar no Drive.",
    color: "text-amber-600",
    border: "border-amber-400",
    bg: "bg-amber-50",
  },
  suspensao: {
    icon: <ShieldOff className="w-5 h-5" />,
    title: "Suspensão",
    description: "Vai registrar no RIZER sem buscar medida no Drive.",
    color: "text-red-600",
    border: "border-red-400",
    bg: "bg-red-50",
  },
  nenhum: {
    icon: <ClipboardList className="w-5 h-5" />,
    title: "Apenas registrar",
    description: "Vai registrar a ocorrência no RIZER sem nenhuma medida disciplinar.",
    color: "text-slate-600",
    border: "border-slate-400",
    bg: "bg-slate-50",
  },
};

interface Props {
  open: boolean;
  tipo: TipoMedida;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmTratativaModal({ open, tipo, onConfirm, onCancel }: Props) {
  // Bloqueia scroll do body enquanto o modal está aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  const meta = META[tipo];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          Registrar no RIZER
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Esta ocorrência está marcada com a tratativa abaixo.
        </p>

        <div className={`flex items-start gap-3 w-full text-left rounded-xl border-2 px-4 py-3 mb-5 ${meta.border} ${meta.bg}`}>
          <span className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</span>
          <span>
            <span className={`block text-sm font-medium ${meta.color}`}>{meta.title}</span>
            <span className="block text-xs text-gray-500 mt-0.5">{meta.description}</span>
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
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
