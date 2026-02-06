import { request } from "./http";
import type { Driver, CreateDriverInput } from "../domain/drivers";

type DriversSearchResponse = { data: Driver[] };

export const driversApi = {
  searchDrivers(search: string) {
    return request<DriversSearchResponse>({
      method: "GET",
      path: "/drivers",
      query: { search },
    }).then((res) => res.data);
  },

  createDriver(input: CreateDriverInput) {
    return request<Driver>({
      method: "POST",
      path: "/drivers",
      body: input,
    });
  },
};
