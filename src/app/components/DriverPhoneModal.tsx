import { useState } from "react";
import { Loader2, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../api/http";
import { useUpdateDriver } from "../../features/occurrences/queries/drivers.queries";
import { formatPhoneInputMask } from "../../utils/whatsapp";

interface Props {
  driverId: string;
  driverName: string;
  onClose: () => void;
  // Chamado depois do telefone salvo com sucesso — quem abriu o modal (botão
  // de WhatsApp sem número cadastrado) pode usar isso pra já disparar o
  // envio na sequência, sem o usuário precisar clicar de novo.
  onSaved?: (phone: string) => void;
}

// Cadastro rápido de telefone/WhatsApp do motorista — aberto direto do botão
// de notificação (Home e preview de ocorrência) quando o motorista ainda não
// tem número cadastrado, pra não obrigar ir até a tela de Motoristas só por
// isso. Mesmo campo (phone) editável lá em DriversPage/DriverCreateModal.
export function DriverPhoneModal({ driverId, driverName, onClose, onSaved }: Props) {
  const [phone, setPhone] = useState("");
  const updateDriver = useUpdateDriver();

  async function handleSave() {
    const trimmed = phone.trim();
    if (!trimmed) {
      toast.error("Informe um telefone.");
      return;
    }
    try {
      await updateDriver.mutateAsync({ id: driverId, input: { phone: trimmed } });
      toast.success("Telefone cadastrado!");
      onSaved?.(trimmed);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Falha ao cadastrar telefone"));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Cadastrar telefone
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-800 dark:text-gray-200">{driverName}</span> ainda
            não tem telefone cadastrado — sem isso não dá pra notificar via WhatsApp.
          </p>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Telefone / WhatsApp
            </label>
            <input
              autoFocus
              value={phone}
              onChange={(e) => setPhone(formatPhoneInputMask(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              inputMode="numeric"
              placeholder="Ex: (31) 99999-9999"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
          <button
            onClick={onClose}
            className="cursor-pointer h-9 px-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={updateDriver.isPending}
            className="cursor-pointer h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {updateDriver.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
