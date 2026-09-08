import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { centralSettingsApi, type CentralCover } from "../../api/centralSettings.api";

const COVER_KEY = ["central", "cover"] as const;

/** Imagem de fundo do cabeçalho da Central — compartilhada entre todos. */
export function useCentralCover() {
  return useQuery({
    queryKey: COVER_KEY,
    queryFn: centralSettingsApi.getCover,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetCentralCover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, actorNome }: { file: Blob; actorNome?: string }) =>
      centralSettingsApi.setCover(file, actorNome),
    onSuccess: (data: CentralCover) => {
      qc.setQueryData(COVER_KEY, data);
    },
  });
}

export function useUpdateCentralCoverSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      patch,
      actorNome,
    }: {
      patch: { posY?: number; opacity?: number };
      actorNome?: string;
    }) => centralSettingsApi.patchCover(patch, actorNome),
    onSuccess: (data: CentralCover) => {
      qc.setQueryData(COVER_KEY, data);
    },
  });
}

export function useClearCentralCover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actorNome?: string) => centralSettingsApi.clearCover(actorNome),
    onSuccess: (data: CentralCover) => {
      qc.setQueryData(COVER_KEY, data);
    },
  });
}
