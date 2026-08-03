import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { locaisApi } from "../../../../api/locais.api";
import type { CreateLocalInput, Local } from "../../../../api/locais.api";
import { locaisKeys } from "./locais.keys";

export function useLocaisSearch(term: string) {
  return useQuery({
    queryKey: locaisKeys.search(term),
    queryFn: () => locaisApi.searchLocais(term || undefined),
    staleTime: 5 * 60_000, // locais mudam raramente
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCreateLocal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLocalInput) => locaisApi.createLocal(input),
    onSuccess: (created: Local) => {
      qc.invalidateQueries({ queryKey: locaisKeys.all });
    },
  });
}
