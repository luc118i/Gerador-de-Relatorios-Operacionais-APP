import { request } from "./http";

export type RegisterDisciplinaryResponse = {
  success: boolean;
  message: string;
  faltaTratativa: boolean;
};

export function registerDisciplinaryOccurrence(occurrenceId: string, relatoriosFolderId?: string) {
  return request<RegisterDisciplinaryResponse>({
    method: "POST",
    path: "/automation/disciplinary",
    body: {
      occurrence_id: occurrenceId,
      ...(relatoriosFolderId ? { relatorios_folder_id: relatoriosFolderId } : {}),
    },
  });
}

export function fillMedidaLink(occurrenceId: string, relatoriosFolderId?: string) {
  return request<{ success: boolean; message: string }>({
    method: "POST",
    path: "/automation/fill-medida",
    body: {
      occurrence_id: occurrenceId,
      ...(relatoriosFolderId ? { relatorios_folder_id: relatoriosFolderId } : {}),
    },
  });
}
