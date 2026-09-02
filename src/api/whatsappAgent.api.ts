// Fala com o módulo de WhatsApp do RIZER Agent (automação local via
// WhatsApp Web — ver rizer-agent/src/automation/playwright/whatsapp.ts).
// Mesmo agente local já usado pelas automações do RIZER (AGENT_URL).
import { AGENT_URL } from "../hooks/useAgentStatus";

const AGENT_OFFLINE_MESSAGE =
  "O RIZER Agent não está em execução. Abra o agente (RIZER Agent) e tente novamente.";

async function agentRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${AGENT_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new Error(AGENT_OFFLINE_MESSAGE);
  }

  if (!res.ok) {
    let message = "Erro na requisição ao agente";
    try {
      const json = await res.json();
      if (typeof json?.error === "string") message = json.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export type WhatsAppAgentStatus = {
  connected: boolean;
  status: "idle" | "connecting" | "qr" | "connected" | "error";
  qrDataUrl: string | null;
  error: string | null;
};

export const whatsappAgentApi = {
  getStatus() {
    return agentRequest<WhatsAppAgentStatus>("/whatsapp/status");
  },

  // Não bloqueia — só dispara a conexão no agente (whatsapp-web.js). O QR
  // Code (quando precisar escanear) aparece em getStatus().qrDataUrl; quem
  // chama deve fazer polling do status até "connected" (ver useWhatsAppAgent).
  connect() {
    return agentRequest<WhatsAppAgentStatus>("/whatsapp/connect", { method: "POST" });
  },

  disconnect() {
    return agentRequest<WhatsAppAgentStatus>("/whatsapp/disconnect", { method: "POST" });
  },

  // attachBanner: false manda só texto puro, sem nenhum banner — usado na 2ª
  // mensagem de uma notificação em duas partes (ex.: link do esquema, ver
  // buildEsquemaLinkMessage). Default (omitido) manda com banner.
  // banner: qual arte anexar quando attachBanner !== false — "motorista"
  // (default, omitido) é o aviso em tela cheia; "gestor" é a versão usada no
  // relatório diário consolidado (ver handleEnviarParaGestor).
  send(input: {
    phone: string;
    message: string;
    attachBanner?: boolean;
    banner?: "motorista" | "gestor";
    // Documento anexo (ex.: planilha .xlsx da cobrança). dataBase64 sem o
    // prefixo "data:..."; enviado como documento numa mensagem separada.
    attachment?: { dataBase64: string; filename: string; mimetype: string };
  }) {
    return agentRequest<{ success: true }>("/whatsapp/send", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
