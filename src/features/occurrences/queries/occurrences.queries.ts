import { useMutation, useQueryClient } from "@tanstack/react-query";
import { occurrencesApi } from "../../../api/occurrences.api";
import type { CreateOccurrenceInput } from "../../../domain/occurrences";
import { occurrencesKeys } from "./occurrences.keys";

export function useCreateOccurrence() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOccurrenceInput) =>
      occurrencesApi.createOccurrence(input),

    onSuccess: (_created, variables) => {
      qc.invalidateQueries({ queryKey: occurrencesKeys.all });

      // invalidar o dia do evento (eventDate)
      if (variables.eventDate) {
        qc.invalidateQueries({
          queryKey: occurrencesKeys.byDate(variables.eventDate),
        });
      }
    },
  });
}

export function useUpdateOccurrence() {
  const qc = useQueryClient();

  return useMutation({
    // Recebe um objeto contendo o id e os dados (input)
    mutationFn: ({ id, input }: { id: string; input: CreateOccurrenceInput }) =>
      occurrencesApi.updateOccurrence(id, input),

    onSuccess: (_updated, variables) => {
      // 1. Limpa o cache geral
      qc.invalidateQueries({ queryKey: occurrencesKeys.all });

      // 2. Limpa o cache da data específica para atualizar a lista
      if (variables.input.eventDate) {
        qc.invalidateQueries({
          queryKey: occurrencesKeys.byDate(variables.input.eventDate),
        });
      }

      // 3. Limpa o cache do detalhe desta ocorrência específica (se você tiver uma key para detalhe)
      qc.invalidateQueries({ queryKey: ["occurrence", variables.id] });
    },
  });
}
