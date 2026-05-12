import { request } from "./http";
import type { OccurrencePdfResponse } from "../domain/pdf";

const BASE_URL = import.meta.env.VITE_API_URL as string;

export type SuspensaoPdfResponse = {
  signedUrl: string;
  dataInicio: string;
  dias: number;
  filename: string;
};

export type SuspensaoInfoResponse = {
  suspensao: {
    dataInicio: string;
    dias: number;
    signedUrl: string;
  } | null;
};

export const reportsPdfApi = {
  getOccurrencePdf(args: {
    occurrenceId: string;
    ttlSeconds?: number;
    force?: boolean;
  }) {
    return request<OccurrencePdfResponse>({
      method: "GET",
      path: `/reports/occurrences/${args.occurrenceId}/pdf`,
      query: {
        ttl: args.ttlSeconds ?? undefined,
        force: args.force ? "1" : undefined,
      },
    });
  },

  async getSuspensaoPdf(args: {
    occurrenceId: string;
    dataInicioSuspensao: string;
    quantidadeDias: number;
  }): Promise<SuspensaoPdfResponse> {
    const res = await fetch(
      `${BASE_URL}/reports/occurrences/${args.occurrenceId}/suspensao-pdf`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataInicioSuspensao: args.dataInicioSuspensao,
          quantidadeDias: args.quantidadeDias,
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Erro ${res.status} ao gerar suspensão`);
    }
    return res.json() as Promise<SuspensaoPdfResponse>;
  },

  async getSuspensaoInfo(occurrenceId: string): Promise<SuspensaoInfoResponse> {
    const res = await fetch(
      `${BASE_URL}/reports/occurrences/${occurrenceId}/suspensao-info`,
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Erro ${res.status} ao buscar suspensão`);
    }
    return res.json() as Promise<SuspensaoInfoResponse>;
  },
};
