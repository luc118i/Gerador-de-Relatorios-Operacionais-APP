import { AGENT_URL } from "../hooks/useAgentStatus";

/** Resultado da varredura POST /automation/sync-solucionado (RIZER Agent). */
export type RizerSolucionadoSyncResult = {
  janela: { from: string; to: string };
  totalRegistradas: number;
  verificadas: number;
  solucionadas: number;
  pendentes: number;
  naoVerificaveis: number;
  idsEncontrados: number;
  /** ocorrências ainda não processadas nesta janela — chame de novo até zerar */
  restantes: number;
  verificadoEm: string;
};

const AGENT_OFFLINE_MSG =
  "O RIZER Agent não está em execução. Abra o agente (RIZER Agent) e tente novamente.";

/**
 * Dispara a verificação do "Status" no RIZER para as ocorrências já
 * registradas na janela [from, to] (datas ISO `YYYY-MM-DD`, mesma janela do
 * Centro de Relatórios). Roda no RIZER Agent local (Playwright + fila
 * serializada), não no backend. Processa em lotes — se `restantes > 0`,
 * chame de novo. Ao final, cada ocorrência fica com `solucionado` atualizado
 * no banco (lido de volta pelo GET /occurrences).
 */
export async function syncRizerSolucionado(
  from: string,
  to: string,
  opts?: { useAgent?: boolean; force?: boolean },
): Promise<RizerSolucionadoSyncResult> {
  if (!(opts?.useAgent ?? false)) {
    throw new Error(AGENT_OFFLINE_MSG);
  }

  let res: Response;
  try {
    res = await fetch(`${AGENT_URL}/automation/sync-solucionado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, ...(opts?.force ? { force: true } : {}) }),
    });
  } catch {
    throw new Error(AGENT_OFFLINE_MSG);
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

  return res.json() as Promise<RizerSolucionadoSyncResult>;
}
