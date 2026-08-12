import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAgentStatus } from "./useAgentStatus";
import { whatsappAgentApi } from "../api/whatsappAgent.api";

const STATUS_KEY = ["whatsapp-agent-status"];

// Estados em que o agente está no meio da conexão (aguardando o cliente
// subir ou o usuário escanear o QR Code) — enquanto isso, faz polling rápido
// pra pegar o QR assim que ele aparecer e detectar quando conecta.
const PENDING_STATUSES = new Set(["connecting", "qr"]);

// Estado de conexão do WhatsApp (via RIZER Agent, whatsapp-web.js) — usado
// pelo botão de notificação na preview de ocorrência. Um único hook no topo
// da tela, compartilhado por todos os cards de motorista.
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
    // Enquanto está conectando/aguardando QR, poll rápido (o QR muda e a
    // conexão finaliza de forma assíncrona no agente, sem SSE por trás).
    refetchInterval: (query) =>
      PENDING_STATUSES.has(query.state.data?.status ?? "") ? 1500 : false,
  });

  const status = statusQuery.data?.status ?? "idle";

  // connect() não bloqueia mais (o agente sobe o cliente em segundo plano) —
  // só dispara e deixa o polling do status pegar QR/conectado.
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
    status,
    connected: status === "connected",
    qrDataUrl: statusQuery.data?.qrDataUrl ?? null,
    error: statusQuery.data?.error ?? null,
    checkingStatus: agentAvailable && statusQuery.isLoading,
    connect: connectMutation.mutateAsync,
    connecting: connectMutation.isPending,
    connectError: connectMutation.error as Error | null,
    disconnect: disconnectMutation.mutateAsync,
    disconnecting: disconnectMutation.isPending,
  };
}

export type WhatsAppAgentState = ReturnType<typeof useWhatsAppAgent>;
