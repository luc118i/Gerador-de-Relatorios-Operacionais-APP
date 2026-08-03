import { request } from "./http";

export type BaseResponsavel = { sigla: string; responsavel: string; visibilidade: string };

export const baseResponsaveisApi = {
  async list(): Promise<BaseResponsavel[]> {
    const json = await request<{ data: BaseResponsavel[] }>({
      method: "GET",
      path: "/base-responsaveis",
    });
    return json.data ?? [];
  },

  async create(input: BaseResponsavel): Promise<BaseResponsavel> {
    const json = await request<{ data: BaseResponsavel }>({
      method: "POST",
      path: "/base-responsaveis",
      body: input,
    });
    return json.data;
  },

  async update(
    sigla: string,
    input: { responsavel?: string; visibilidade?: string },
  ): Promise<BaseResponsavel> {
    const json = await request<{ data: BaseResponsavel }>({
      method: "PATCH",
      path: `/base-responsaveis/${encodeURIComponent(sigla)}`,
      body: input,
    });
    return json.data;
  },

  async remove(sigla: string): Promise<void> {
    await request<{ ok: boolean }>({
      method: "DELETE",
      path: `/base-responsaveis/${encodeURIComponent(sigla)}`,
    });
  },
};
