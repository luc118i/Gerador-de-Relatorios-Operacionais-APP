import { request } from "./http";

export interface Local {
  id: number;
  nome: string;
  sigla?: string | null;
}

export interface CreateLocalInput {
  nome: string;
  sigla?: string | null;
  tipo?: string | null;
  lat?: number | null;
  lng?: number | null;
}

type LocaisSearchResponse = { data: Local[] };

export const locaisApi = {
  searchLocais(search?: string) {
    return request<LocaisSearchResponse>({
      method: "GET",
      path: "/locais",
      query: { ...(search ? { search } : {}) },
    }).then((res) => res.data);
  },

  createLocal(input: CreateLocalInput) {
    return request<Local>({
      method: "POST",
      path: "/locais",
      body: input,
    });
  },
};
