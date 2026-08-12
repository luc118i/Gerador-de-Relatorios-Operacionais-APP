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

export const whatsappAgentApi = {
  getStatus() {
    return agentRequest<{ connected: boolean }>("/whatsapp/status");
  },

  // Abre um navegador visível no computador do usuário com o QR Code do
  // WhatsApp Web — a única ação do usuário é escanear com o celular. Demora
  // (até ~2min de espera no agente), então quem chama deve tratar como uma
  // operação longa.
  connect() {
    return agentRequest<{ connected: boolean }>("/whatsapp/connect", { method: "POST" });
  },

  disconnect() {
    return agentRequest<{ connected: boolean }>("/whatsapp/disconnect", { method: "POST" });
  },

  send(input: { phone: string; message: string }) {
    return agentRequest<{ success: true }>("/whatsapp/send", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
