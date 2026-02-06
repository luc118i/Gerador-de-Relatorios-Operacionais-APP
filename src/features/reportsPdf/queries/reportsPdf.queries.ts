import { useMutation } from "@tanstack/react-query";
import { reportsPdfApi } from "../../../api/reportsPdf.api";

export function useGetOccurrencePdf() {
  return useMutation({
    mutationFn: (args: {
      occurrenceId: string;
      ttlSeconds?: number;
      force?: boolean;
    }) => reportsPdfApi.getOccurrencePdf(args),
  });
}
