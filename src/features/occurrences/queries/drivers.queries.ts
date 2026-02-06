import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { driversApi } from "../../../api/drivers.api";
import type { Driver, CreateDriverInput } from "../../../domain/drivers";
import { driversKeys } from "./drivers.keys";

export function useDriversSearch(term: string) {
  const q = term.trim();

  return useQuery({
    queryKey: driversKeys.search(q),
    queryFn: () => driversApi.searchDrivers(q),
    enabled: q.length >= 1,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCreateDriver() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDriverInput) => driversApi.createDriver(input),
    onSuccess: (created: Driver) => {
      // Garante que listas futuras e buscas antigas se atualizem
      qc.invalidateQueries({ queryKey: driversKeys.all });

      // Opcional: você pode “injectar” no cache da busca atual se quiser,
      // mas não é obrigatório para selecionar no form.
    },
  });
}
