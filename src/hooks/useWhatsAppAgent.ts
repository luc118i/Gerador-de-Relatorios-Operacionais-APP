import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAgentStatus } from "./useAgentStatus";
import { whatsappAgentApi } from "../api/whatsappAgent.api";

const STATUS_KEY = ["whatsapp-agent-status"];

// Estado de conexão do WhatsApp (via RIZER Agent) — usado pelo botão de
// notificação na preview de ocorrência. Um único hook no topo da tela,
// compartilhado por todos os cards de motorista.
export function useWhatsAppAgent() {
  const agentAvailable = useAgentStatus();
  const qc = useQueryClient();

  const statusQuery = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => whatsappAgentApi.getStatus(),
    enabled: agentAvailable,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const connectMutation = useMutation({
    mutationFn: () => whatsappAgentApi.connect(),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUS_KEY }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => whatsappAgentApi.disconnect(),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUS_KEY }),
  });

  return {
    agentAvailable,
    connected: statusQuery.data?.connected ?? false,
    checkingStatus: agentAvailable && statusQuery.isLoading,
    connect: connectMutation.mutateAsync,
    connecting: connectMutation.isPending,
    connectError: connectMutation.error as Error | null,
    disconnect: disconnectMutation.mutateAsync,
    disconnecting: disconnectMutation.isPending,
  };
}

export type WhatsAppAgentState = ReturnType<typeof useWhatsAppAgent>;
