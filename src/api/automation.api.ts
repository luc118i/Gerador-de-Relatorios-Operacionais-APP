import { AGENT_URL } from "../hooks/useAgentStatus";

export type RegisterDisciplinaryResponse = {
  success: boolean;
  message: string;
  faltaTratativa: boolean;
};

async function automationPost<T>(
  path: string,
  body: unknown,
  useAgent: boolean,
): Promise<T> {
  const agentOfflineMessage =
    "O RIZER Agent não está em execução. Abra o agente (RIZER Agent) e tente novamente.";

  if (!useAgent) {
    throw new Error(agentOfflineMessage);
  }

  let res: Response;
  try {
    res = await fetch(`${AGENT_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Falha de rede = agente caiu entre as checagens de status (ping de 10s)
    throw new Error(agentOfflineMessage);
  }
  if (!res.ok) {
    let message = "Erro na requisição ao agente";
    try {
      const json = await res.json();
      if (typeof json?.error === "string") message = json.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function registerDisciplinaryOccurrence(
  occurrenceId: string,
  relatoriosFolderId?: string,
  medidasFolderId?: string,
  opts?: { useAgent?: boolean; advertencia?: boolean; suspensao?: boolean },
) {
  return automationPost<RegisterDisciplinaryResponse>(
    "/automation/disciplinary",
    {
      occurrence_id: occurrenceId,
      ...(relatoriosFolderId ? { relatorios_folder_id: relatoriosFolderId } : {}),
      ...(medidasFolderId ? { medidas_folder_id: medidasFolderId } : {}),
      ...(opts?.advertencia !== undefined ? { advertencia: opts.advertencia } : {}),
      ...(opts?.suspensao !== undefined ? { suspensao: opts.suspensao } : {}),
    },
    opts?.useAgent ?? false,
  );
}

export type UpdateRizerResponse = {
  faltaTratativa: boolean
}

export function updateRizerOccurrence(
  occurrenceId: string,
  relatoriosFolderId?: string,
  medidasFolderId?: string,
  opts?: { useAgent?: boolean; advertencia?: boolean; suspensao?: boolean },
) {
  return automationPost<UpdateRizerResponse>(
    "/automation/update",
    {
      occurrence_id: occurrenceId,
      ...(relatoriosFolderId ? { relatorios_folder_id: relatoriosFolderId } : {}),
      ...(medidasFolderId ? { medidas_folder_id: medidasFolderId } : {}),
      ...(opts?.advertencia !== undefined ? { advertencia: opts.advertencia } : {}),
      ...(opts?.suspensao !== undefined ? { suspensao: opts.suspensao } : {}),
    },
    opts?.useAgent ?? false,
  );
}

export type VerifyRizerResponse = {
  registered: boolean
  rizerId: string | null
  hasTratativa: boolean
}

export function verifyRizerOccurrence(
  occurrenceId: string,
  opts?: { useAgent?: boolean },
) {
  return automationPost<VerifyRizerResponse>(
    "/automation/verify",
    { occurrence_id: occurrenceId },
    opts?.useAgent ?? false,
  );
}

export function fillMedidaLink(
  occurrenceId: string,
  medidasFolderId?: string,
  opts?: { useAgent?: boolean },
) {
  return automationPost<{ success: boolean; message: string; pendentes: number }>(
    "/automation/fill-medida",
    {
      occurrence_id: occurrenceId,
      ...(medidasFolderId ? { medidas_folder_id: medidasFolderId } : {}),
    },
    opts?.useAgent ?? false,
  );
}
