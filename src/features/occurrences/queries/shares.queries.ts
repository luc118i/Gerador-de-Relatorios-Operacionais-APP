import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  occurrenceSharesApi,
  type OccurrenceShare,
  type ShareSections,
} from "../../../api/occurrenceShares.api";

const shareKey = (occId: string) => ["occurrence-share", occId] as const;

export function useOccurrenceShare(occurrenceId: string) {
  return useQuery({
    queryKey: shareKey(occurrenceId),
    queryFn: () => occurrenceSharesApi.getShare(occurrenceId),
  });
}

export function useRotateShare(occurrenceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts?: { createdBy?: string; sections?: ShareSections }) =>
      occurrenceSharesApi.rotateShare(occurrenceId, opts),
    onSuccess: (data: OccurrenceShare) => qc.setQueryData(shareKey(occurrenceId), data),
  });
}

export function usePatchShare(occurrenceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      token,
      patch,
    }: {
      token: string;
      patch: { active?: boolean; sections?: ShareSections };
    }) => occurrenceSharesApi.patchShare(token, patch),
    onSuccess: (data: OccurrenceShare) => qc.setQueryData(shareKey(occurrenceId), data),
  });
}
