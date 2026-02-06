import { request } from "./http";
import type { OccurrencePdfResponse } from "../domain/pdf";

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
};
