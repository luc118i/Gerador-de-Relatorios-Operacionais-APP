import { request } from "./http";

export type RegisterDisciplinaryResponse = {
  success: boolean;
  message: string;
  faltaTratativa: boolean;
};

export function registerDisciplinaryOccurrence(occurrenceId: string) {
  return request<RegisterDisciplinaryResponse>({
    method: "POST",
    path: "/automation/disciplinary",
    body: { occurrence_id: occurrenceId },
  });
}
