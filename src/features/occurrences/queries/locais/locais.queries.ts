import { useQuery } from "@tanstack/react-query";
import { locaisApi } from "../../../../api/locais.api";
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
