import { request } from "./http";
import type { OccurrencePdfResponse } from "../domain/pdf";

const BASE_URL = import.meta.env.VITE_API_URL as string;

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
  }): Promise<Blob> {
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
    return res.blob();
  },
};
