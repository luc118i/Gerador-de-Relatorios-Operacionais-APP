import { request } from "./http";
import type {
  CreateOccurrenceInput,
  OccurrenceDetailDTO,
} from "../domain/occurrences";
import type { OccurrenceDTO } from "../domain/occurrences";
import { EvidenceUploadInput } from "../app/types";
import { getLocalDateString } from "../utils/dateUtils";

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

  async getReportTitles(): Promise<string[]> {
    const json = await request<{ data: string[] }>({
      method: "GET",
      path: "/occurrences/report-titles",
    });
    return json.data ?? [];
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

  async patchTratativa(
    id: string,
    tratativa: string | null,
    analisadoPor: string | null,
    justificativaRegistro?: string | null,
    // Omitido (undefined) = não mexe no vínculo já gravado; `null` explícito
    // = limpa. Ver resolveAnalisadoPorUserId e updateTratativa no backend.
    analisadoPorUserId?: string | null,
  ): Promise<void> {
    await request<{ ok: boolean }>({
      method: "PATCH",
      path: `/occurrences/${id}/tratativa`,
      body: { tratativa, analisadoPor, justificativaRegistro, analisadoPorUserId },
    });
  },

  async getTripSchema(tripId: string): Promise<{ found: boolean; html?: string }> {
    return request<{ found: boolean; html?: string }>({
      method: "GET",
      path: `/trips/${tripId}/schema`,
    });
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

// ── Atualização retroativa de autor (rename de perfil) ─────────────────────
// Não existe endpoint pra listar ocorrências por autor em todas as datas, só
// por dia (`listOccurrences`). Por isso a atualização retroativa varre dia a
// dia desde a criação da conta até hoje e usa o PATCH de tratativa (que já
// aceita `analisadoPor`) pra trocar só o autor, sem reenviar a ocorrência
// inteira.

function normalizeAuthorName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Roda `worker` para cada item de `items`, no máximo `limit` em paralelo. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export type RenameAnalisadoPorResult = { scannedDays: number; updated: number; failed: number };

/**
 * Reescreve `analisadoPor` das ocorrências antigas de `oldNames` para `newName`,
 * desde `sinceDateISO` ("YYYY-MM-DD") até hoje. Usado quando o usuário troca o
 * nome de exibição do perfil, pra não deixar o histórico com o nome velho.
 */
export async function renameAnalisadoPorHistory(
  oldNames: string[],
  newName: string,
  sinceDateISO: string,
  // ID do usuário logado (auth.user.id) — grava junto com o nome novo pra
  // essas ocorrências passarem a ter um vínculo estável a rename, em vez de
  // dependerem só da grafia do nome. `undefined` (rename disparado antes
  // dessa feature existir) segue funcionando, só sem o vínculo.
  newUserId?: string | null,
): Promise<RenameAnalisadoPorResult> {
  const oldSet = new Set(oldNames.map(normalizeAuthorName).filter(Boolean));
  const normalizedNew = normalizeAuthorName(newName);
  oldSet.delete(normalizedNew);
  if (oldSet.size === 0 || !sinceDateISO) return { scannedDays: 0, updated: 0, failed: 0 };

  const start = new Date(`${sinceDateISO}T00:00:00`);
  const end = new Date();
  if (Number.isNaN(start.getTime()) || start > end) return { scannedDays: 0, updated: 0, failed: 0 };

  // De hoje pra trás: o dia mais recente é o mais provável de ter ocorrências
  // recém-criadas com o nome antigo (ex. o próprio dia da troca de nome) e
  // também o mais provável de o usuário conferir logo em seguida. Se a conta
  // tem muito histórico, escanear em ordem crescente deixaria "hoje" por
  // último — potencialmente demorando muito pra atualizar o que mais importa.
  const dates: string[] = [];
  for (const d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
    dates.push(getLocalDateString(d));
  }

  let updated = 0;
  let failed = 0;

  await mapWithConcurrency(dates, 6, async (date) => {
    let day: OccurrenceDTO[];
    try {
      const res = await occurrencesApi.listOccurrences(date);
      day = res.data;
    } catch {
      return;
    }
    const matches = day.filter((o) => oldSet.has(normalizeAuthorName(o.analisadoPor ?? "")));
    for (const o of matches) {
      try {
        await occurrencesApi.patchTratativa(
          o.id,
          o.tratativa ?? null,
          newName,
          o.justificativaRegistro ?? null,
          newUserId ?? null,
        );
        updated++;
      } catch {
        failed++;
      }
    }
  });

  return { scannedDays: dates.length, updated, failed };
}

export async function getDailyReportPdf(date: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/reports/daily/${date}/pdf`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.blob();
}
