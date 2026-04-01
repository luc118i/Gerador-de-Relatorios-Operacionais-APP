import { request } from "./http";
import type {
  CreateOccurrenceInput,
  OccurrenceDetailDTO,
} from "../domain/occurrences";
import type { OccurrenceDTO } from "../domain/occurrences";
import { EvidenceUploadInput } from "../app/types";

const BASE_URL = import.meta.env.VITE_API_URL as string;

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
  updateOccurrence(id: string, input: CreateOccurrenceInput) {
    return request<void>({
      method: "PUT",
      path: `/occurrences/${id}`,
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

  deleteOccurrence(id: string) {
    return request<void>({
      method: "DELETE",
      path: `/occurrences/${id}`,
    });
  },

  async getOccurrenceById(id: string): Promise<OccurrenceDTO> {
    const json = await request<ApiData<OccurrenceDTO>>({
      method: "GET",
      path: `/occurrences/${id}`,
    });
    return json.data;
  },

  async uploadEvidences(
    occurrenceId: string,
    evidences: EvidenceUploadInput[],
  ) {
    const form = new FormData();

    const metadata: {
      caption?: string;
      linkTexto?: string;
      linkUrl?: string;
    }[] = [];

    evidences.forEach((ev) => {
      form.append("files", ev.file);

      metadata.push({
        caption: ev.caption ?? undefined,
        linkTexto: ev.linkTexto ?? undefined,
        linkUrl: ev.linkUrl ?? undefined,
      });
    });

    form.append("metadata", JSON.stringify(metadata));

    const res = await fetch(
      `${BASE_URL}/occurrences/${occurrenceId}/evidences`,
      {
        method: "POST",
        body: form,
      },
    );

    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateEvidenceCaption(
    occurrenceId: string,
    evidenceId: string,
    caption: string,
  ) {
    const res = await fetch(
      `${BASE_URL}/occurrences/${occurrenceId}/evidences/${evidenceId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      },
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getEvidenceSignedUrls(id: string) {
    const json = await request<{
      data: Array<{ id: string; url: string; caption: string; linkTexto: string; linkUrl: string }>;
    }>({
      method: "GET",
      path: `/occurrences/${id}/evidences/signed-urls`,
    });
    return json.data;
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
