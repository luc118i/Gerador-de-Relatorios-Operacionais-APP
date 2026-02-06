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
      // Se você enviar date, dá pra invalidar por dia também
      qc.invalidateQueries({ queryKey: occurrencesKeys.all });
      if (variables.date) {
        qc.invalidateQueries({
          queryKey: occurrencesKeys.byDate(variables.date),
        });
      }
    },
  });
}
