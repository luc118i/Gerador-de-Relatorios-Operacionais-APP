import { request } from "./http";
import type { CreateOccurrenceInput } from "../domain/occurrences";
import type { OccurrenceDTO } from "../domain/occurrences";

const BASE_URL = "http://localhost:3333";

export type ApiData<T> = { data: T };

export type CreateOccurrenceResponse = { id: string };

export const occurrencesApi = {
  createOccurrence(input: CreateOccurrenceInput) {
    return request<CreateOccurrenceResponse>({
      method: "POST",
      path: "/occurrences",
      body: input,
    });
  },

  listOccurrences(date: string) {
    return request<ApiData<OccurrenceDTO[]>>({
      method: "GET",
      path: "/occurrences",
      query: { date },
    });
  },

  async uploadEvidences(occurrenceId: string, files: File[]) {
    const form = new FormData();
    for (const f of files) form.append("files", f);

    const res = await fetch(
      `${BASE_URL}/occurrences/${occurrenceId}/evidences`,
      {
        method: "POST",
        body: form,
      },
    );

    if (!res.ok) {
      throw new Error(await res.text());
    }

    return res.json();
  },
};

export async function getOccurrencesByDay(
  date: string,
): Promise<OccurrenceDTO[]> {
  const res = await fetch(`${BASE_URL}/occurrences?date=${date}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data: OccurrenceDTO[] };
  return json.data ?? [];
}
