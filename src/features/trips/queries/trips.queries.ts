import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tripsApi } from "../../../api/trips.api";
import type { CreateTripInput } from "../../../domain/trips";
import { tripsKeys } from "./trips.keys";

export function useTrips(search?: string) {
  return useQuery({
    queryKey: tripsKeys.list(search),
    queryFn: () => tripsApi.listTrips({ search }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTripInput) => tripsApi.createTrip(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tripsKeys.all });
    },
  });
}
