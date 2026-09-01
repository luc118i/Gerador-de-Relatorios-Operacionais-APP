import { AGENT_URL } from "../hooks/useAgentStatus";

/** Resultado da varredura POST /automation/sync-solucionado (RIZER Agent). */
export type RizerSolucionadoSyncResult = {
  janela: { from: string; to: string };
  totalRegistradas: number;
  /** "Registro" — já tratadas do nosso lado, não lidas no RIZER */
  tratadasRegistro: number;
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

/** Resultado de POST /automation/register-pendentes (RIZER Agent). */
export type RizerRegisterPendentesResult = {
  janela: { from: string; to: string };
  totalPendentes: number;
  registradas: number;
  /** sem `tratativa` — puladas, precisam de decisão na Home */
  precisamDecisao: number;
  falharam: Array<{ id: string; motorista: string | null; motivo: string }>;
  /** elegíveis ainda não processadas nesta janela — chame de novo até zerar */
  restantes: number;
  verificadoEm: string;
};

/**
 * Registra em lote no RIZER as ocorrências da janela [from, to] ainda não
 * registradas. A medida é derivada do `tratativa` de cada ocorrência; as sem
 * `tratativa` são puladas (`precisamDecisao`). Roda no RIZER Agent (Playwright,
 * fila serializada), em lotes — se `restantes > 0`, chame de novo. Exige as
 * pastas do Drive configuradas e o relatório já presente no Drive (senão a
 * ocorrência entra em `falharam`).
 */
export async function registerRizerPendentes(
  from: string,
  to: string,
  folders: { relatoriosFolderId?: string; medidasFolderId?: string },
  opts?: { useAgent?: boolean },
): Promise<RizerRegisterPendentesResult> {
  if (!(opts?.useAgent ?? false)) {
    throw new Error(AGENT_OFFLINE_MSG);
  }

  let res: Response;
  try {
    res = await fetch(`${AGENT_URL}/automation/register-pendentes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        ...(folders.relatoriosFolderId ? { relatorios_folder_id: folders.relatoriosFolderId } : {}),
        ...(folders.medidasFolderId ? { medidas_folder_id: folders.medidasFolderId } : {}),
      }),
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

  return res.json() as Promise<RizerRegisterPendentesResult>;
}
