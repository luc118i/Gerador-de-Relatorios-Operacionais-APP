import type { OccurrenceDTO } from "../../domain/occurrences";

// Varre um conjunto de dias dia-a-dia — não existe endpoint "todas as
// ocorrências", só por dia (GET /occurrences?date=). O `fetchDay` injetado
// normalmente é um queryClient.fetchQuery reaproveitando a queryKey
// ["report","day",iso] do Centro de Relatórios, então dias já visitados saem
// do cache. Lembrar que o banco tem purge mensal (~90 dias): pedir dias mais
// antigos que isso só devolve vazio.

/** Roda `worker` para cada item, no máximo `limit` em paralelo. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]!, i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, run),
  );
  return results;
}

export interface ScanResult {
  occurrences: OccurrenceDTO[];
  scannedDays: number;
  failedDays: number;
}

/**
 * Busca as ocorrências de `dates` (ISO `YYYY-MM-DD`, qualquer ordem) e
 * devolve tudo achatado e deduplicado por id.
 */
export async function scanOccurrencesForDays(
  fetchDay: (iso: string) => Promise<OccurrenceDTO[]>,
  dates: string[],
  opts?: {
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<ScanResult> {
  const concurrency = opts?.concurrency ?? 6;

  let done = 0;
  let failedDays = 0;
  const perDay = await mapWithConcurrency(dates, concurrency, async (iso) => {
    try {
      return await fetchDay(iso);
    } catch {
      failedDays++;
      return [] as OccurrenceDTO[];
    } finally {
      done++;
      opts?.onProgress?.(done, dates.length);
    }
  });

  // Dedup defensivo por id (uma ocorrência tem só um eventDate, mas o backend
  // pode devolver a mesma linha em bordas de fuso).
  const seen = new Set<string>();
  const occurrences: OccurrenceDTO[] = [];
  for (const day of perDay) {
    for (const o of day) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      occurrences.push(o);
    }
  }

  return { occurrences, scannedDays: dates.length, failedDays };
}
