import type { ReactNode } from "react";

interface ConfirmActionModalProps {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
}

/** Modal de confirmação genérico — usado para as ações em lote (tratativas,
 * revisão) e para a exclusão de ocorrência, que compartilhavam a mesma
 * estrutura visual com apenas cor/texto/ícone diferentes. */
export function ConfirmActionModal({
  icon,
  iconBg,
  title,
  children,
  confirmLabel,
  confirmClassName,
  onConfirm,
  onCancel,
  confirmDisabled,
  cancelDisabled,
}: ConfirmActionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !cancelDisabled && onCancel()}
      />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-3">
          {icon && <div className={`p-2 rounded-lg ${iconBg ?? ""}`}>{icon}</div>}
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>

        {children}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={cancelDisabled}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 text-sm rounded-lg text-white transition-colors font-medium disabled:opacity-50 ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
