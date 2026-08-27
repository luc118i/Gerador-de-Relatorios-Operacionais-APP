import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, MessageCircle, X, CheckCircle2, AlertCircle } from "lucide-react";
import type { WhatsAppAgentState } from "../../hooks/useWhatsAppAgent";

interface Props {
  whatsappAgent: WhatsAppAgentState;
  onClose: () => void;
}

// Modal de conexão do WhatsApp (whatsapp-web.js, via RIZER Agent). Dispara a
// conexão ao abrir (se ainda não estiver conectando/conectado) e mostra o QR
// Code assim que o agente gerar um — o estado vem todo de useWhatsAppAgent,
// que já faz polling rápido enquanto status é "connecting"/"qr".
export function WhatsAppConnectModal({ whatsappAgent, onClose }: Props) {
  const { status, qrDataUrl, error, connect, connecting } = whatsappAgent;

  useEffect(() => {
    if (status === "idle" || status === "error") {
      connect().catch(() => {
        /* erro já refletido em whatsappAgent.error via status "error" */
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fecha sozinho ao conectar — dá um respiro pro usuário ver a confirmação.
  useEffect(() => {
    if (status === "connected") {
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [status, onClose]);

  // Trava o scroll do body enquanto o modal está aberto (mesmo padrão dos
  // demais modais). Sem isso, a página rola por baixo do overlay e a faixa
  // do footer aparece embaixo do fundo escurecido.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Conectar WhatsApp
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-6 flex flex-col items-center text-center gap-4">
          {status === "qr" && qrDataUrl ? (
            <>
              <img
                src={qrDataUrl}
                alt="QR Code do WhatsApp"
                className="w-56 h-56 rounded-lg border border-gray-200 dark:border-gray-800"
              />
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Escaneie com o WhatsApp do celular
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Configurações → Aparelhos conectados → Conectar um aparelho
                </p>
              </div>
            </>
          ) : status === "connected" ? (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                WhatsApp conectado!
              </p>
            </>
          ) : status === "error" ? (
            <>
              <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Falha ao conectar
                </p>
                {error && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
                )}
              </div>
              <button
                onClick={() => connect().catch(() => {})}
                disabled={connecting}
                className="cursor-pointer h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
              >
                Tentar novamente
              </button>
            </>
          ) : (
            <>
              <Loader2 className="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Preparando conexão…
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
