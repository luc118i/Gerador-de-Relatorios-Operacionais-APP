import { request } from "./http";
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
  if (useAgent) {
    const res = await fetch(`${AGENT_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
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
  return request<T>({ method: "POST", path, body });
}

export function registerDisciplinaryOccurrence(
  occurrenceId: string,
  relatoriosFolderId?: string,
  medidasFolderId?: string,
  opts?: { useAgent?: boolean },
) {
  return automationPost<RegisterDisciplinaryResponse>(
    "/automation/disciplinary",
    {
      occurrence_id: occurrenceId,
      ...(relatoriosFolderId ? { relatorios_folder_id: relatoriosFolderId } : {}),
      ...(medidasFolderId ? { medidas_folder_id: medidasFolderId } : {}),
    },
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
