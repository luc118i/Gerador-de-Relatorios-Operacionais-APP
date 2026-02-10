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
