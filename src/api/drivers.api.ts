import { request } from "./http";
import type { Driver, CreateDriverInput } from "../domain/drivers";

type DriversSearchResponse = { data: Driver[] };

// Update parcial: todos opcionais
export type UpdateDriverInput = {
  code?: string;
  name?: string;
  base?: string | null;
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
};
