import { AlertTriangle, Clock } from "lucide-react";

export function ReminderModal({ onConfirm }: { onConfirm: () => void }) {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Topo colorido */}
        <div className="bg-amber-500 px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Lembrete — {hour}h{min}</p>
            <p className="text-amber-100 text-xs mt-0.5">Encerramento do turno</p>
          </div>
        </div>

        {/* Corpo */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Confira se todas as ocorrencias foram apuradas e envie o{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">Relatorio Diario</span>{" "}
            para o Google Drive antes de encerrar o turno.
          </p>
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Use o botao <span className="font-semibold">Drive</span> no topo da pagina para enviar o PDF automaticamente.
            </p>
          </div>
        </div>

        {/* Rodape */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 flex justify-end">
          <button
            onClick={onConfirm}
            className="cursor-pointer h-9 px-6 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
