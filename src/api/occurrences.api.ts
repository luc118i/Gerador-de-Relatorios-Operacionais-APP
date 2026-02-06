import { request } from "./http";
import type { CreateOccurrenceInput } from "../domain/occurrences";

// Ajuste o tipo do retorno quando você decidir o shape do DTO do backend
export type OccurrenceDTO = {
  id: string;
  createdAt?: string;
};

export const occurrencesApi = {
  createOccurrence(input: CreateOccurrenceInput) {
    return request<OccurrenceDTO>({
      method: "POST",
      path: "/occurrences",
      body: input,
    });
  },

  listOccurrences(date: string) {
    return request<OccurrenceDTO[]>({
      method: "GET",
      path: "/occurrences",
      query: { date },
    });
  },
};
