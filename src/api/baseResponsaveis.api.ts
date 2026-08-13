import { request } from "./http";

export type BaseResponsavel = {
  sigla: string;
  responsavel: string;
  visibilidade: string;
  // WhatsApp do responsável — usado no envio do relatório diário por base
  // (ver managerReport.ts). Null pra bases cadastradas antes desse campo.
  telefone: string | null;
};

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
    input: { responsavel?: string; visibilidade?: string; telefone?: string | null },
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
