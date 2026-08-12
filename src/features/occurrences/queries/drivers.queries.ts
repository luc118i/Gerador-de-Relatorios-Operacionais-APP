import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { driversApi, type UpdateDriverInput } from "../../../api/drivers.api";
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

// Ficha completa do motorista (inclui telefone) — usada pelo botão de WhatsApp na preview.
export function useDriver(id: string | null) {
  return useQuery({
    queryKey: driversKeys.detail(id ?? ""),
    queryFn: () => driversApi.getDriver(id as string),
    enabled: !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useDriverStats(id: string | null) {
  return useQuery({
    queryKey: driversKeys.stats(id ?? ""),
    queryFn: () => driversApi.getDriverStats(id as string),
    enabled: !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// Situação disciplinar calculada (REGULAR/ATENCAO/CRITICO) + índice.
// Fórmula do índice documentada em domain/drivers.ts (DriverSituation).
export function useDriverSituation(id: string | null) {
  return useQuery({
    queryKey: driversKeys.situation(id ?? ""),
    queryFn: () => driversApi.getDriverSituation(id as string),
    enabled: !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// Evolução mensal de ocorrências do motorista (gráfico do perfil disciplinar).
// Default 3: occurrences tem retenção de 90 dias (purge mensal no banco),
// pedir mais meses por padrão só mostraria buracos vazios.
export function useDriverMonthlyOccurrences(id: string | null, months = 3) {
  return useQuery({
    queryKey: driversKeys.monthlyOccurrences(id ?? "", months),
    queryFn: () => driversApi.getDriverMonthlyOccurrences(id as string, months),
    enabled: !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// BI geral da tela de Motoristas (cards + por base + ranking).
export function useDriverDashboard() {
  return useQuery({
    queryKey: driversKeys.dashboard,
    queryFn: () => driversApi.getDashboardSummary(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// Histórico de ocorrências do motorista (seção "Histórico Disciplinar" do perfil).
export function useDriverOccurrenceHistory(id: string | null) {
  return useQuery({
    queryKey: driversKeys.occurrenceHistory(id ?? ""),
    queryFn: () => driversApi.getDriverOccurrenceHistory(id as string),
    enabled: !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// Usado pelo cadastro rápido de telefone (botão de WhatsApp sem número
// cadastrado, na Home e na preview de ocorrência) — mas serve pra qualquer
// edição pontual de motorista.
export function useUpdateDriver() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDriverInput }) =>
      driversApi.updateDriver(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: driversKeys.detail(id) });
      qc.invalidateQueries({ queryKey: driversKeys.all });
    },
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
