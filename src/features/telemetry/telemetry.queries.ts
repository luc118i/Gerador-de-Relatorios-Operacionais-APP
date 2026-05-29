import { useQuery } from "@tanstack/react-query";
import { telemetryApi } from "../../api/telemetry.api";

export const telemetryKeys = {
  all:      ["telemetry"] as const,
  lists:    () => [...telemetryKeys.all, "list"] as const,
  list:     (params: object) => [...telemetryKeys.lists(), params] as const,
  details:  () => [...telemetryKeys.all, "detail"] as const,
  detail:   (id: string) => [...telemetryKeys.details(), id] as const,
};

export function useListAnalyses(params: {
  veiculo?: string;
  motorista?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: telemetryKeys.list(params),
    queryFn:  () => telemetryApi.listAnalyses(params),
  });
}

export function useAnalysis(id: string | null) {
  return useQuery({
    queryKey: telemetryKeys.detail(id ?? ""),
    queryFn:  () => telemetryApi.getAnalysis(id!),
    enabled:  !!id,
  });
}
