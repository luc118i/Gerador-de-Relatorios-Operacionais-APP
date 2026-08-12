import { request } from "./http";
import type {
  Driver,
  CreateDriverInput,
  DriverStats,
  DriverSituation,
  DriverMonthlyOccurrence,
  DriverDashboardSummary,
  DriverOccurrenceHistoryEntry,
  DriverRizerComparison,
} from "../domain/drivers";

const BASE_URL = import.meta.env.VITE_API_URL as string;

type DriversSearchResponse = { data: Driver[] };

// Update parcial: todos opcionais
export type UpdateDriverInput = {
  code?: string;
  name?: string;
  base?: string | null;
  phone?: string | null;
};

export const driversApi = {
  // já existia, mas agora aceita filtros extras se você quiser
  searchDrivers(search: string) {
    return request<DriversSearchResponse>({
      method: "GET",
      path: "/drivers",
      query: { search },
    }).then((res) => res.data);
  },

  // usar para listagem geral na tela de motoristas
  listDrivers(params?: { search?: string; active?: boolean; limit?: number }) {
    return request<DriversSearchResponse>({
      method: "GET",
      path: "/drivers",
      query: {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.active !== undefined
          ? { active: params.active ? "true" : "false" }
          : {}),
        ...(params?.limit !== undefined ? { limit: params.limit } : {}),
      },
    }).then((res) => res.data);
  },

  createDriver(input: CreateDriverInput) {
    return request<Driver>({
      method: "POST",
      path: "/drivers",
      body: input,
    });
  },

  // Ficha completa do motorista (inclui telefone) — usada pelo botão de WhatsApp na preview.
  getDriver(id: string) {
    return request<{ data: Driver }>({
      method: "GET",
      path: `/drivers/${id}`,
    }).then((res) => res.data);
  },

  updateDriver(id: string, input: UpdateDriverInput) {
    return request<void>({
      method: "PATCH",
      path: `/drivers/${id}`,
      body: input,
    });
  },

  deleteDriver(id: string) {
    return request<void>({
      method: "DELETE",
      path: `/drivers/${id}`,
    });
  },

  // Recorrência do motorista no período retido pelo banco (mês corrente).
  getDriverStats(id: string) {
    return request<{ data: DriverStats }>({
      method: "GET",
      path: `/drivers/${id}/stats`,
    }).then((res) => res.data);
  },

  // Situação disciplinar calculada (REGULAR/ATENCAO/CRITICO) + índice.
  getDriverSituation(id: string) {
    return request<{ data: DriverSituation }>({
      method: "GET",
      path: `/drivers/${id}/situation`,
    }).then((res) => res.data);
  },

  // Evolução mensal de ocorrências do motorista (perfil disciplinar).
  getDriverMonthlyOccurrences(id: string, months?: number) {
    return request<{ data: DriverMonthlyOccurrence[] }>({
      method: "GET",
      path: `/drivers/${id}/monthly-occurrences`,
      query: months !== undefined ? { months } : undefined,
    }).then((res) => res.data);
  },

  // BI geral: totais, ocorrências por base e ranking dos piores motoristas.
  getDashboardSummary() {
    return request<{ data: DriverDashboardSummary }>({
      method: "GET",
      path: "/dashboard/motoristas",
    }).then((res) => res.data);
  },

  // Histórico de ocorrências do motorista (perfil disciplinar).
  getDriverOccurrenceHistory(id: string) {
    return request<{ data: DriverOccurrenceHistoryEntry[] }>({
      method: "GET",
      path: `/drivers/${id}/occurrences`,
    }).then((res) => res.data);
  },

  // Ficha de Conduta em PDF (relatório disciplinar consolidado).
  async getDriverConductPdf(id: string): Promise<Blob> {
    const res = await fetch(`${BASE_URL}/reports/drivers/${id}/conduct-pdf`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
    }
    return res.blob();
  },

  // Compara contagem de ocorrências por tipo com a listagem do RIZER
  // (automação de browser real — ~10-30s de resposta).
  compareDriverWithRizer(id: string) {
    return request<{ data: DriverRizerComparison }>({
      method: "POST",
      path: `/drivers/${id}/rizer-check`,
    }).then((res) => res.data);
  },
};
