import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { getOccurrencesByDay } from "../../api/occurrences.api";

export interface RangeResult {
  /** Ocorrências de todos os dias já carregados do intervalo. */
  data: OccurrenceDTO[];
  /** true enquanto NENHUM dia carregou ainda (mostrar skeleton). */
  initialLoading: boolean;
  /** true enquanto ainda há dias em voo (mostrar barra de progresso). */
  fetching: boolean;
  /** só vira erro se TODOS os dias falharem. */
  error: string | null;
  loaded: number;
  total: number;
  refetch: () => void;
}

/**
 * Busca um intervalo de datas dia-a-dia. Cada dia usa a MESMA queryKey da
 * visão diária (`["report","day",iso]`), então:
 *  - trocar de mês reaproveita os dias já em cache;
 *  - abrir a visão diária depois do mês é instantâneo.
 * O navegador já limita ~6 conexões simultâneas por host, o que naturalmente
 * escalona as ~30 requisições de um mês.
 */
export function useRangeOccurrences(days: string[]): RangeResult {
  const results = useQueries({
    queries: days.map((d) => ({
      queryKey: ["report", "day", d] as const,
      queryFn: () => getOccurrencesByDay(d),
      staleTime: 30_000,
    })),
  });

  return useMemo(() => {
    const settled = results.filter((r) => r.isSuccess || r.isError);
    const data = results.flatMap((r) => r.data ?? []);
    const allFailed = results.length > 0 && results.every((r) => r.isError);

    return {
      data,
      initialLoading: results.length > 0 && settled.length === 0,
      fetching: results.some((r) => r.isLoading || r.isFetching),
      error: allFailed
        ? (results.find((r) => r.isError)?.error as Error)?.message ?? "Falha ao carregar o período"
        : null,
      loaded: settled.length,
      total: results.length,
      refetch: () => results.forEach((r) => void r.refetch()),
    };
    // results é um array novo a cada render; comparamos pelo conteúdo relevante
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    results.map((r) => `${r.status}:${(r.data?.length ?? 0)}`).join("|"),
  ]);
}
