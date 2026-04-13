import { request } from "./http";
import type { Trip, CreateTripInput } from "../domain/trips";

type TripsResponse = { data: Trip[] };

export const tripsApi = {
  listTrips(params?: { search?: string }) {
    return request<TripsResponse>({
      method: "GET",
      path: "/trips",
      query: params?.search ? { search: params.search } : undefined,
    }).then((res) => res.data);
  },

  createTrip(input: CreateTripInput) {
    return request<Trip>({
      method: "POST",
      path: "/trips",
      body: input,
    });
  },
};
