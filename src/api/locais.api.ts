import { request } from "./http";

export interface Local {
  id: number;
  nome: string;
  sigla?: string | null;
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
};
