import { request } from "./http";

export type RegisterDisciplinaryResponse = {
  success: boolean;
  message: string;
  faltaTratativa: boolean;
};

export function registerDisciplinaryOccurrence(
  occurrenceId: string,
  relatoriosFolderId?: string,
  medidasFolderId?: string,
) {
  return request<RegisterDisciplinaryResponse>({
    method: "POST",
    path: "/automation/disciplinary",
    body: {
      occurrence_id: occurrenceId,
      ...(relatoriosFolderId ? { relatorios_folder_id: relatoriosFolderId } : {}),
      ...(medidasFolderId ? { medidas_folder_id: medidasFolderId } : {}),
    },
  });
}

export function fillMedidaLink(occurrenceId: string, medidasFolderId?: string) {
  return request<{ success: boolean; message: string; pendentes: number }>({
    method: "POST",
    path: "/automation/fill-medida",
    body: {
      occurrence_id: occurrenceId,
      ...(medidasFolderId ? { medidas_folder_id: medidasFolderId } : {}),
    },
  });
}
