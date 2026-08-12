import {
  Camera,
  Check,
  Clock,
  FileText,
  FolderOpen,
  Gavel,
  ImageOff,
  Loader2,
  MessageCircle,
  Pencil,
  Sparkles,
  Trash2,
  UserCheck,
  Zap,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Send,
  QrCode,
  Phone,
  PencilLine,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { registerDisciplinaryOccurrence, fillMedidaLink, verifyRizerOccurrence, updateRizerOccurrence } from "../../api/automation.api";
import { occurrencesApi } from "../../api/occurrences.api";
import { getApiErrorMessage } from "../../api/http";
import { useAgentStatus } from "../../hooks/useAgentStatus";
import { useWhatsAppAgent } from "../../hooks/useWhatsAppAgent";
import { useDriver } from "../../features/occurrences/queries/drivers.queries";
import { toast } from "sonner";
import { useAdminAuth } from "../context/AdminAuthContext";
import { AdminLoginModal } from "./AdminLoginModal";
import { WhatsAppConnectModal } from "./WhatsAppConnectModal";
import { DriverPhoneModal } from "./DriverPhoneModal";
import type { OccurrenceDTO } from "../../domain/occurrences";
import type { Ocorrencia } from "../types";
import {
  gerarTextoRelatorioIndividual,
  gerarTextoWhatsApp,
} from "../../utils/relatorio";
import { formatPhoneForWhatsApp, buildDriverNotificationMessage } from "../../utils/whatsapp";
import { whatsappAgentApi } from "../../api/whatsappAgent.api";
import { getBaseCanonicalKey, resolveBaseSigla } from "../../utils/base";
import { BaseChip } from "./base-chip";
import { aiApi } from "../../api/ai.api";
import { SuspensaoModal } from "./SuspensaoModal";
import { RizerRegisterModal, type TipoMedida } from "./RizerRegisterModal";
import { ConfirmTratativaModal } from "./ConfirmTratativaModal";
import { tratativaToTipoMedida } from "../../utils/tratativa";

// ── TratativaBadge ────────────────────────────────────────────────────────────
const TRATATIVA_META: Record<string, { label: string; dot: string; cls: string }> = {
  SUSPEICAO:   { label: "Suspensão",      dot: "bg-violet-500", cls: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800" },
  ADVERTENCIA: { label: "Advertência",    dot: "bg-amber-400",  cls: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"   },
  VALE:        { label: "Vale",           dot: "bg-red-500",    cls: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"         },
  REGISTRO:    { label: "Só o Registro",  dot: "bg-gray-400",   cls: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800"     },
};

function TratativaBadge({ value, size = "sm" }: { value: string; size?: "xs" | "sm" }) {
  const meta = TRATATIVA_META[value];
  if (!meta) return null;
  const textCls = size === "xs" ? "text-[10px]" : "text-xs";
  const dotCls  = size === "xs" ? "w-1.5 h-1.5"  : "w-2 h-2";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold leading-none ${textCls} ${meta.cls}`}>
      <span className={`rounded-full flex-shrink-0 ${dotCls} ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

// ── SVG Google Drive (inline, sem dependência externa) ────────────────────────
function DriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z" fill="#ea4335"/>
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
    </svg>
  );
}

// Logo do RIZER Agent no botão "Enviar ao RIZER" — substitui o ícone
// genérico (Gavel): já identifica a marca sozinho, então o texto ao lado
// pode ficar mais curto (economiza espaço no card, principalmente no modo
// compacto, que tem largura fixa).
function RizerLogo({ className }: { className?: string }) {
  return <img src="/rizer-agent-logo.png" alt="" className={`${className} object-contain flex-shrink-0`} />;
}

export type DriveStatus = "idle" | "sending" | "sent";
export type BatchOverlay = "queued" | "processing";

interface OccurrenceCardProps {
  occurrence: OccurrenceDTO;
  onOpen?: () => void;
  onEditar?: () => Promise<void> | void;
  onExcluir?: () => void;
  compact?: boolean;
  driveStatus?: DriveStatus;
  onSendToDrive?: () => void;
  batchOverlay?: BatchOverlay;
  tratativaOverlay?: BatchOverlay;
  revisarOverlay?: BatchOverlay;
  relatoriosFolderId?: string;
  medidasFolderId?: string;
  onNeedFolderConfig?: () => void;
  /** Ocorrências com 2 motoristas viram 2 cards (um por motorista); ações só no slot 1. */
  driverSlot?: 1 | 2;
  /** Quantas ocorrências deste veículo existem no dia (para destacar prefixo repetido). */
  duplicateVehicleCount?: number;
  /** true enquanto um lote (registro/tratativa/revisão) está rodando — evita editar
   * uma ocorrência que o robô pode estar lendo/escrevendo no RIZER nesse momento. */
  editDisabled?: boolean;
}

export type OccurrenceDetailDTO = OccurrenceDTO & {
  reportText: string;
  drivers: Array<{ name: string; registry?: string | null }>;
  evidences?: Array<{
    id: string;
    publicUrl?: string | null;
    caption?: string | null;
  }>;
};

/** Converte OccurrenceDTO para Ocorrencia mínima (suficiente para geração de texto). */
function dtoToMinimalOcorrencia(occ: OccurrenceDTO): Ocorrencia {
  const d1 = occ.drivers?.find((d) => d.position === 1);
  const d2 = occ.drivers?.find((d) => d.position === 2);
  return {
    id: occ.id,
    typeCode: occ.typeCode,
    typeTitle: occ.typeTitle,
    viagem: {
      id: "",
      linha: occ.lineLabel ?? "",
      prefixo: occ.vehicleNumber ?? "",
      horario: occ.tripTime ?? "",
    },
    motorista1: {
      id: d1?.driverId ?? "",
      matricula: d1?.registry ?? "",
      nome: d1?.name ?? "",
      base: d1?.baseCode ?? "",
    },
    motorista2: d2
      ? {
          id: d2.driverId ?? "",
          matricula: d2.registry ?? "",
          nome: d2.name ?? "",
          base: d2.baseCode ?? "",
        }
      : undefined,
    dataEvento: occ.eventDate,
    dataViagem: occ.tripDate,
    horarioInicial: occ.startTime,
    horarioFinal: occ.endTime,
    localParada: occ.place ?? "",
    points: occ.points,
    speedKmh: occ.speedKmh ?? null,
    evidencias: [],
    createdAt: occ.createdAt,
    reportTitle: occ.reportTitle ?? null,
    ccoOperator: occ.ccoOperator ?? null,
    vehicleKm: occ.vehicleKm ?? null,
    passengerCount: occ.passengerCount ?? null,
    passengerConnection: occ.passengerConnection ?? null,
    relatoHtml: occ.relatoHtml ?? null,
    devolutivaHtml: occ.devolutivaHtml ?? null,
    devolutivaStatus: occ.devolutivaStatus ?? null,
  };
}

type DisciplinaryState = "idle" | "loading" | "success" | "error";

export function OccurrenceCard({
  occurrence,
  onOpen,
  onEditar,
  onExcluir,
  compact = false,
  driveStatus = "idle",
  onSendToDrive,
  batchOverlay,
  tratativaOverlay,
  revisarOverlay,
  relatoriosFolderId,
  medidasFolderId,
  onNeedFolderConfig,
  driverSlot = 1,
  duplicateVehicleCount = 1,
  editDisabled = false,
}: OccurrenceCardProps) {
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [copiedWpp, setCopiedWpp] = useState(false);
  const [copiedRelat, setCopiedRelat] = useState(false);
  const [loadingAiWpp, setLoadingAiWpp] = useState(false);
  const [loadingAiRelat, setLoadingAiRelat] = useState(false);
  const { isAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const agentAvailable = useAgentStatus();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showSuspensaoModal, setShowSuspensaoModal] = useState(false);
  const [localSuspensao, setLocalSuspensao] = useState(occurrence.suspensao ?? null);

  const [disciplinaryState, setDisciplinaryState] = useState<DisciplinaryState>(
    occurrence.rizerRegistered ? "success" : "idle"
  );
  const [localFaltaTratativa, setLocalFaltaTratativa] = useState<boolean>(
    occurrence.faltaTratativa ?? false
  );
  const [fillMedidaState, setFillMedidaState] = useState<"idle" | "loading" | "success">("idle");
  const [showRizerModal, setShowRizerModal] = useState(false);
  const [showConfirmTratativaModal, setShowConfirmTratativaModal] = useState(false);
  const [tipoMedida, setTipoMedida] = useState<TipoMedida>("advertencia");
  const [disciplinaryAction, setDisciplinaryAction] = useState<"registering" | "verifying" | "updating" | null>(null);

  // Sincroniza estado local quando o servidor atualiza (após refetch)
  useEffect(() => {
    setLocalFaltaTratativa(occurrence.faltaTratativa ?? false);
  }, [occurrence.faltaTratativa]);
  useEffect(() => {
    if (occurrence.rizerRegistered) {
      setDisciplinaryState(prev => prev === "idle" ? "success" : prev);
    }
  }, [occurrence.rizerRegistered]);

  async function handleFillMedida(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isAdmin) { setShowAdminLogin(true); return; }
    if (fillMedidaState === "loading" || fillMedidaState === "success") return;
    if (!medidasFolderId) { onNeedFolderConfig?.(); return; }
    setFillMedidaState("loading");
    try {
      await fillMedidaLink(occurrence.id, medidasFolderId, { useAgent: agentAvailable });
      setFillMedidaState("success");
      setLocalFaltaTratativa(false);
      toast.success("Tratativa preenchida no RIZER!");
      queryClient.invalidateQueries({ queryKey: ["occurrences"] });
    } catch (err: unknown) {
      setFillMedidaState("idle");
      toast.error(getApiErrorMessage(err, "Erro ao preencher tratativa."));
    }
  }

  async function handleRizerClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isAdmin) { setShowAdminLogin(true); return; }
    if (disciplinaryState === "loading") return;

    // Já registrado no banco → reabre no RIZER e reescreve todos os campos
    if (disciplinaryState === "success") {
      void doUpdate(e);
      return;
    }

    if (!relatoriosFolderId || !medidasFolderId) { onNeedFolderConfig?.(); return; }

    // Antes de abrir o modal, verifica se já existe no RIZER para evitar duplicatas
    setDisciplinaryState("loading");
    setDisciplinaryAction("verifying");
    try {
      const res = await verifyRizerOccurrence(occurrence.id, { useAgent: agentAvailable });
      if (res.registered) {
        await queryClient.invalidateQueries({ queryKey: ["occurrences"] });
        setDisciplinaryState("success");
        setLocalFaltaTratativa(!res.hasTratativa && (occurrence.advertencia ?? true));
        toast.info("Esta ocorrência já está registrada no RIZER.");
        return;
      }
    } catch {
      // falha na verificação — deixa prosseguir para o modal
    } finally {
      setDisciplinaryAction(null);
    }

    setDisciplinaryState("idle");
    const mapped = tratativaToTipoMedida(occurrence.tratativa);
    if (mapped) {
      setTipoMedida(mapped);
      setShowConfirmTratativaModal(true);
    } else {
      setShowRizerModal(true);
    }
  }

  async function doUpdate(e: React.MouseEvent) {
    e.stopPropagation();
    if (!relatoriosFolderId || !medidasFolderId) { onNeedFolderConfig?.(); return; }
    setDisciplinaryState("loading");
    setDisciplinaryAction("updating");
    try {
      const res = await updateRizerOccurrence(
        occurrence.id,
        relatoriosFolderId,
        medidasFolderId,
        { useAgent: agentAvailable },
      );
      setDisciplinaryState("success");
      if (res.faltaTratativa) {
        setLocalFaltaTratativa(true);
        toast.warning("Campos atualizados no RIZER, mas a medida não foi encontrada no Drive.");
      } else {
        setLocalFaltaTratativa(false);
        toast.success("Campos atualizados no RIZER com sucesso!");
      }
      queryClient.invalidateQueries({ queryKey: ["occurrences"] });
    } catch (err: unknown) {
      setDisciplinaryState("success");
      toast.error(getApiErrorMessage(err, "Erro ao atualizar campos no RIZER."));
    } finally {
      setDisciplinaryAction(null);
    }
  }

  async function submitRizerRegister(tipo: TipoMedida) {
    setShowRizerModal(false);
    setShowConfirmTratativaModal(false);
    const advertencia = tipo === "advertencia";
    const suspensao = tipo === "suspensao";
    setDisciplinaryState("loading");
    setDisciplinaryAction("registering");
    try {
      const res = await registerDisciplinaryOccurrence(
        occurrence.id,
        relatoriosFolderId,
        medidasFolderId,
        { useAgent: agentAvailable, advertencia, suspensao },
      );
      setDisciplinaryState("success");
      if (res.faltaTratativa) {
        setLocalFaltaTratativa(true);
        toast.warning("Enviado ao RIZER, mas o arquivo de medida não foi encontrado no Drive.");
      } else {
        toast.success("Ocorrência enviada ao RIZER com sucesso!");
      }
    } catch (err: unknown) {
      setDisciplinaryState("error");
      toast.error(getApiErrorMessage(err, "Erro ao enviar ocorrência ao RIZER."));
    } finally {
      setDisciplinaryAction(null);
    }
  }

  const isAnaliseOp = occurrence.typeCode === "ANALISE_OP";

  const tempoParada = calcularTempoParada(
    occurrence.startTime,
    occurrence.endTime,
  );
  const driver1 = occurrence.drivers?.find((d) => d.position === 1);
  const driver2 = occurrence.drivers?.find((d) => d.position === 2);
  const isSecondDriverCard = driverSlot === 2;
  const hasSecondDriverCard = !!driver2?.name;
  const isDuplicateVehicle = duplicateVehicleCount > 1;

  // ── Notificação via WhatsApp (RIZER Agent) ────────────────────────────────
  // Motorista deste card específico (driverSlot 1 ou 2) — busca a ficha
  // completa (telefone) sob demanda, cacheada por id (ver DriverPdfCard, que
  // usa o mesmo padrão na preview de ocorrência).
  const cardDriver = isSecondDriverCard ? driver2 : driver1;
  const driverDetail = useDriver(cardDriver?.driverId || null);
  const driverPhone = driverDetail.data?.phone ?? null;
  const whatsappAgent = useWhatsAppAgent();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  // "send": aberto pelo botão de WhatsApp sem telefone (cadastra e já
  // dispara o envio). "edit": aberto pelo ícone de lápis, sempre visível
  // (só ajusta o número, sem side-effect de envio) — ver DriverPdfCard.
  const [phoneModalMode, setPhoneModalMode] = useState<"send" | "edit">("send");
  const [sendingWpp, setSendingWpp] = useState(false);

  // Contador de envios (por motorista — posição 1/2 tem contador próprio,
  // ver whatsappSentCountD1/D2) — persiste no backend, então sobrevive a
  // reload. O botão vira um "Nx" em vez de resetar a cada envio.
  const [localWhatsappSentCount, setLocalWhatsappSentCount] = useState<number>(
    (isSecondDriverCard ? occurrence.whatsappSentCountD2 : occurrence.whatsappSentCountD1) ?? 0
  );
  useEffect(() => {
    setLocalWhatsappSentCount(
      (isSecondDriverCard ? occurrence.whatsappSentCountD2 : occurrence.whatsappSentCountD1) ?? 0
    );
  }, [occurrence.whatsappSentCountD1, occurrence.whatsappSentCountD2, isSecondDriverCard]);

  // Dispara o envio de verdade — separado do clique pra poder ser chamado de
  // novo assim que o telefone é cadastrado no DriverPhoneModal.
  function sendNotification(rawPhone: string) {
    if (!cardDriver) return;
    const phone = formatPhoneForWhatsApp(rawPhone);
    if (!phone) {
      toast.error("Telefone do motorista inválido.");
      return;
    }

    const minimalOcc = dtoToMinimalOcorrencia(occurrence);
    const firstName = cardDriver.name.split(/\s+/)[0] || cardDriver.name;

    // Envio em segundo plano — não trava o card nem impede continuar
    // trabalhando (ver mesmo padrão em DriverPdfCard). toast.promise fica no
    // Toaster global, então o status continua visível mesmo navegando.
    setSendingWpp(true);
    const sendPromise = (async () => {
      let genericoRelatoIA: string | null = null;
      // Só GENERICO: tenta um resumo por IA do relato pra incluir na
      // notificação — sem bloquear o envio se a IA falhar/estiver em cooldown.
      if (occurrence.typeCode === "GENERICO") {
        try {
          const relatorioTxt = gerarTextoRelatorioIndividual(minimalOcc);
          if (relatorioTxt.trim()) {
            const { summary } = await aiApi.summarize(relatorioTxt, occurrence.reportTitle ?? undefined);
            genericoRelatoIA = summary;
          }
        } catch {
          /* segue sem o resumo — não impede o envio */
        }
      }
      const message = buildDriverNotificationMessage(cardDriver.name, minimalOcc, { genericoRelatoIA });
      await whatsappAgentApi.send({ phone, message });

      // Só conta envio que realmente saiu (depois do send, não antes) — se
      // essa chamada falhar, não desfaz o envio nem vira erro no toast, só
      // não incrementa o contador visual dessa vez.
      try {
        const result = await occurrencesApi.markWhatsappSent(occurrence.id, isSecondDriverCard ? 2 : 1);
        setLocalWhatsappSentCount(result.count);
      } catch {
        setLocalWhatsappSentCount((c) => c + 1);
      }
    })();

    toast.promise(sendPromise, {
      loading: `Enviando notificação para ${firstName} via WhatsApp...`,
      success: `Notificação enviada para ${firstName} via WhatsApp!`,
      error: (err) => getApiErrorMessage(err, "Falha ao enviar notificação via WhatsApp"),
    });

    sendPromise.catch(() => {}).finally(() => setSendingWpp(false));
  }

  function handleSendWpp(e: React.MouseEvent) {
    e.stopPropagation();
    if (!whatsappAgent.agentAvailable) {
      toast.error("O RIZER Agent não está em execução. Abra o agente e tente novamente.");
      return;
    }
    if (!whatsappAgent.connected) {
      setShowWhatsAppModal(true);
      return;
    }
    if (!cardDriver) return;
    if (!driverPhone) {
      setPhoneModalMode("send");
      setShowPhoneModal(true);
      return;
    }
    sendNotification(driverPhone);
  }

  function handleEditPhone(e: React.MouseEvent) {
    e.stopPropagation();
    if (!cardDriver) return;
    setPhoneModalMode("edit");
    setShowPhoneModal(true);
  }

  const whatsappSendBusy = sendingWpp || driverDetail.isLoading;
  const whatsappSendTitle = !whatsappAgent.agentAvailable
    ? "RIZER Agent offline — abra o agente para notificar"
    : !whatsappAgent.connected
      ? "Conectar WhatsApp (mostra o QR Code)"
      : driverDetail.isLoading
        ? "Carregando telefone…"
        : driverPhone
          ? `Notificar ${cardDriver?.name?.split(/\s+/)[0] ?? "motorista"} via WhatsApp${
              localWhatsappSentCount > 0 ? ` — já enviado ${localWhatsappSentCount}x, clique para enviar de novo` : ""
            }`
          : "Motorista sem telefone cadastrado — clique para cadastrar";
  const whatsappSendDisabled = !whatsappAgent.agentAvailable || whatsappSendBusy || !cardDriver;

  // No card: GENERICO → reportTitle, demais → linha (contexto da viagem)
  const subject =
    occurrence.typeCode === "GENERICO"
      ? (occurrence as any).reportTitle || occurrence.typeTitle
      : occurrence.lineLabel
        ? occurrence.lineLabel
        : occurrence.typeTitle;

  // Na lista: sempre mostra o nome da ocorrência; linha aparece como detalhe
  const subjectTitle = occurrence.typeCode === "GENERICO"
    ? (occurrence as any).reportTitle || occurrence.typeTitle
    : occurrence.typeTitle;
  const subjectDetail = occurrence.lineLabel || null;

  async function handleEditar() {
    if (!onEditar || editDisabled) return;
    setLoadingEdit(true);
    try {
      await onEditar();
    } finally {
      setLoadingEdit(false);
    }
  }

  function buildMotoristaStr() {
    const parts: string[] = [];
    if (driver1?.registry) parts.push(driver1.registry);
    if (driver1?.name)     parts.push(driver1.name);
    if (driver1?.baseCode) parts.push(driver1.baseCode);
    return parts.join(" – ") || undefined;
  }

  async function handleCopyWpp(e: React.MouseEvent) {
    e.stopPropagation();
    if (isAnaliseOp) {
      if (!occurrence.relatoHtml) {
        toast.error("Sem dados de análise disponíveis.");
        return;
      }
      setLoadingAiWpp(true);
      try {
        const { summary } = await aiApi.summarizeAnaliseOp(
          occurrence.relatoHtml,
          occurrence.reportTitle ?? "",
          "whatsapp",
          buildMotoristaStr(),
        );
        await navigator.clipboard.writeText(summary);
        setCopiedWpp(true);
        toast.success("Resumo WhatsApp copiado!");
        setTimeout(() => setCopiedWpp(false), 2500);
      } catch {
        toast.error("Falha ao gerar resumo com IA.");
      } finally {
        setLoadingAiWpp(false);
      }
      return;
    }
    try {
      const text = gerarTextoWhatsApp(dtoToMinimalOcorrencia(occurrence));
      await navigator.clipboard.writeText(text);
      setCopiedWpp(true);
      toast.success("Texto WhatsApp copiado!");
      setTimeout(() => setCopiedWpp(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function handleCopyRelat(e: React.MouseEvent) {
    e.stopPropagation();
    if (isAnaliseOp) {
      if (!occurrence.relatoHtml) {
        toast.error("Sem dados de análise disponíveis.");
        return;
      }
      setLoadingAiRelat(true);
      try {
        const { summary } = await aiApi.summarizeAnaliseOp(
          occurrence.relatoHtml,
          occurrence.reportTitle ?? "",
          "email",
          buildMotoristaStr(),
        );
        await navigator.clipboard.writeText(summary);
        setCopiedRelat(true);
        toast.success("Resumo para e-mail copiado!");
        setTimeout(() => setCopiedRelat(false), 2500);
      } catch {
        toast.error("Falha ao gerar resumo com IA.");
      } finally {
        setLoadingAiRelat(false);
      }
      return;
    }
    try {
      const text = gerarTextoRelatorioIndividual(
        dtoToMinimalOcorrencia(occurrence),
      );
      await navigator.clipboard.writeText(text);
      setCopiedRelat(true);
      toast.success("Relatório individual copiado!");
      setTimeout(() => setCopiedRelat(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  // ── Modo compacto (lista) ──────────────────────────────────────────────────
  if (compact) {
    const rawBase = driver1?.baseCode ?? occurrence.baseCode ?? "";
    const canonicalBase = getBaseCanonicalKey(rawBase);
    const baseSigla = resolveBaseSigla(rawBase) ?? abbreviate(canonicalBase);
    const baseColor = BASE_PALETTE[hashString(canonicalBase) % BASE_PALETTE.length];

    return (
      <>
      {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} />}
      {showWhatsAppModal && (
        <WhatsAppConnectModal whatsappAgent={whatsappAgent} onClose={() => setShowWhatsAppModal(false)} />
      )}
      {showPhoneModal && cardDriver && (
        <DriverPhoneModal
          driverId={cardDriver.driverId}
          driverName={cardDriver.name}
          currentPhone={phoneModalMode === "edit" ? driverPhone : null}
          onClose={() => setShowPhoneModal(false)}
          onSaved={phoneModalMode === "send" ? sendNotification : undefined}
        />
      )}
      {showSuspensaoModal && (
        <SuspensaoModal
          occurrence={{ ...occurrence, suspensao: localSuspensao }}
          onClose={() => setShowSuspensaoModal(false)}
          onSuspensaoGerada={(s) => setLocalSuspensao(s)}
        />
      )}
      <RizerRegisterModal
        open={showRizerModal}
        selected={tipoMedida}
        onSelect={setTipoMedida}
        onConfirm={submitRizerRegister}
        onCancel={() => setShowRizerModal(false)}
      />
      <ConfirmTratativaModal
        open={showConfirmTratativaModal}
        tipo={tipoMedida}
        onConfirm={() => submitRizerRegister(tipoMedida)}
        onCancel={() => setShowConfirmTratativaModal(false)}
      />
      <div
        className={`group relative flex items-center gap-0 border-b border-gray-100 dark:border-gray-800 transition-colors cursor-pointer ${
          isSecondDriverCard ? "bg-gray-50/60 dark:bg-gray-900/40" : "bg-white dark:bg-gray-900"
        } ${
          batchOverlay || tratativaOverlay || revisarOverlay || disciplinaryState === "loading" || fillMedidaState === "loading"
            ? "pointer-events-none"
            : localFaltaTratativa
              ? "hover:bg-amber-50/30 dark:hover:bg-amber-950/20"
              : "hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
        }`}
        style={{ borderLeft: `3px solid ${baseColor}` }}
        onClick={onOpen}
      >
        {batchOverlay && (
          <div className="absolute inset-0 z-10 flex items-center justify-end pr-3 bg-white/70 dark:bg-gray-900/80 backdrop-blur-[1px]">
            {batchOverlay === "processing"
              ? <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
              : <Clock className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />}
          </div>
        )}
        {disciplinaryState === "loading" && !batchOverlay && (
          <div className="absolute inset-0 z-10 flex items-center gap-1.5 px-3 bg-white/80 dark:bg-gray-900/85 backdrop-blur-[1px] pointer-events-none">
            <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin shrink-0" />
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
              {disciplinaryAction === "verifying"
                ? "Verificando no RIZER..."
                : disciplinaryAction === "updating"
                ? "Atualizando no RIZER..."
                : "Registrando no RIZER..."}
            </span>
          </div>
        )}
        {tratativaOverlay && !batchOverlay && disciplinaryState !== "loading" && (
          <div className="absolute inset-0 z-10 flex items-center gap-1.5 px-3 bg-amber-50/90 dark:bg-amber-950/40 backdrop-blur-[1px] pointer-events-none">
            {tratativaOverlay === "queued"
              ? <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              : <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />}
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {tratativaOverlay === "queued" ? "Aguardando tratativa..." : "Preenchendo tratativa..."}
            </span>
          </div>
        )}
        {revisarOverlay && !batchOverlay && !tratativaOverlay && disciplinaryState !== "loading" && (
          <div className="absolute inset-0 z-10 flex items-center gap-1.5 px-3 bg-emerald-50/90 dark:bg-emerald-950/40 backdrop-blur-[1px] pointer-events-none">
            {revisarOverlay === "queued"
              ? <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              : <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />}
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {revisarOverlay === "queued" ? "Aguardando revisão..." : "Revisando no RIZER..."}
            </span>
          </div>
        )}

        {/* Prefixo */}
        <div className="w-[70px] flex-shrink-0 px-3 py-2.5 flex items-center gap-1">
          {isSecondDriverCard ? (
            <span className="text-gray-300 dark:text-gray-600 text-sm" title="Mesma ocorrência do card acima">↳</span>
          ) : (
            <>
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100 tabular-nums">
                {occurrence.vehicleNumber}
              </span>
              {isDuplicateVehicle && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                  title={`Este veículo tem ${duplicateVehicleCount} ocorrências hoje`}
                />
              )}
            </>
          )}
        </div>

        {/* Base (abreviada) */}
        <div className="w-[80px] flex-shrink-0 px-1 py-2.5 hidden sm:block">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate block max-w-full"
            style={{ background: baseColor + "22", color: baseColor }}
            title={rawBase}
          >
            {baseSigla}
          </span>
        </div>

        {/* Assunto */}
        <div className="flex-1 min-w-0 px-2 py-2.5">
          {isSecondDriverCard ? (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic truncate block leading-tight">
              Mesma ocorrência acima — Motorista 02
            </span>
          ) : (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm text-gray-800 dark:text-gray-200 truncate leading-tight">
                  {subjectTitle}
                </span>
                {hasSecondDriverCard && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold text-[10px] leading-none whitespace-nowrap flex-shrink-0">
                    <UserCheck className="w-2.5 h-2.5" />
                    2 motoristas
                  </span>
                )}
                {occurrence.typeCode === "EXCESSO_VELOCIDADE" && occurrence.speedKmh != null && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-bold text-[10px] leading-none whitespace-nowrap flex-shrink-0">
                    <Zap className="w-2.5 h-2.5" />
                    {occurrence.speedKmh} km/h
                  </span>
                )}
                {occurrence.typeCode === "EXCESSO_PERMANENCIA" && (occurrence.points?.length ?? 0) > 1 && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold text-[10px] leading-none whitespace-nowrap flex-shrink-0"
                    title={occurrence.points!.map((p) => `${p.place} (${p.startTime}–${p.endTime})`).join(" · ")}
                  >
                    <MapPin className="w-2.5 h-2.5" />
                    {occurrence.points!.length} paradas
                  </span>
                )}
                {occurrence.typeCode === "DESCUMP_OP_PARADA_FORA" && (occurrence.evidenceCount ?? 0) === 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-semibold text-[10px] leading-none whitespace-nowrap flex-shrink-0">
                    <ImageOff className="w-2.5 h-2.5" />
                    Sem evidência
                  </span>
                )}
                {disciplinaryState === "idle" && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-semibold text-[10px] leading-none whitespace-nowrap flex-shrink-0">
                    <Gavel className="w-2.5 h-2.5" />
                    Pendente RIZER
                  </span>
                )}
                {localFaltaTratativa && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold text-[10px] leading-none whitespace-nowrap flex-shrink-0">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Falta a tratativa
                  </span>
                )}
                {occurrence.tratativa && (
                  <TratativaBadge value={occurrence.tratativa} size="xs" />
                )}
              </div>
              {subjectDetail && (
                <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate block leading-tight">
                  {subjectDetail}
                </span>
              )}
            </>
          )}
        </div>

        {/* Horário */}
        <div className="w-[115px] flex-shrink-0 px-2 py-2.5 hidden sm:flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {occurrence.typeCode === "EXCESSO_VELOCIDADE" || occurrence.startTime === occurrence.endTime
              ? occurrence.startTime
              : `${occurrence.startTime} – ${occurrence.endTime}`}
          </span>
        </div>

        {/* Motorista(s) */}
        <div className="w-[170px] flex-shrink-0 px-2 py-2.5 hidden lg:block">
          <span
            className={`text-xs truncate block ${isSecondDriverCard ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-500 dark:text-gray-400"}`}
            title={(isSecondDriverCard ? driver2?.name : driver1?.name) ?? undefined}
          >
            {(isSecondDriverCard ? driver2?.name : driver1?.name) ?? "—"}
          </span>
        </div>

        {/* Ações */}
        <div
          className="flex items-center gap-0 flex-shrink-0 px-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCopyWpp}
            disabled={loadingAiWpp}
            title={isAnaliseOp ? "Gerar resumo WhatsApp com IA" : "Copiar WhatsApp"}
            className={`p-2 rounded transition-colors disabled:opacity-50 ${
              copiedWpp ? "text-green-600 dark:text-green-400" : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:text-gray-500 dark:hover:text-green-400 dark:hover:bg-green-950/40"
            }`}
          >
            {loadingAiWpp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isAnaliseOp ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleSendWpp}
            disabled={whatsappSendDisabled}
            title={whatsappSendTitle}
            className={`relative p-2 rounded transition-colors disabled:opacity-40 ${
              localWhatsappSentCount > 0
                ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:text-gray-500 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/40"
            }`}
          >
            {whatsappSendBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : !whatsappAgent.connected ? (
              <QrCode className="w-4 h-4" />
            ) : !driverPhone ? (
              <Phone className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {localWhatsappSentCount > 0 && !whatsappSendBusy && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-[3px] rounded-full bg-emerald-500 text-white text-[9px] font-bold leading-[15px] text-center">
                {localWhatsappSentCount}
              </span>
            )}
          </button>
          {cardDriver && (
            <button
              onClick={handleEditPhone}
              title={driverPhone ? `Editar telefone (${driverPhone})` : "Cadastrar telefone"}
              className="p-2 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
            >
              <PencilLine className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleCopyRelat}
            disabled={loadingAiRelat}
            title={isAnaliseOp ? "Gerar resumo e-mail com IA" : "Copiar Relatório Individual"}
            className={`p-2 rounded transition-colors disabled:opacity-50 ${
              copiedRelat ? "text-green-600 dark:text-green-400" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-blue-950/40"
            }`}
          >
            {loadingAiRelat ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleEditar(); }}
            disabled={loadingEdit || editDisabled}
            title={editDisabled ? "Edição bloqueada enquanto o RIZER está processando" : "Editar"}
            className="p-2 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400"
          >
            {loadingEdit
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Pencil className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowSuspensaoModal(true); }}
            title={localSuspensao ? `Suspensão: ${localSuspensao.dias}d a partir de ${fmtDdMmCompact(localSuspensao.dataInicio)}` : "Gerar Suspensão Disciplinar"}
            className={`p-2 rounded transition-colors ${localSuspensao ? "text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40" : "text-gray-400 hover:text-red-700 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-950/40"}`}
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
          {localFaltaTratativa && (
            <button
              onClick={handleFillMedida}
              disabled={fillMedidaState === "loading"}
              title={
                fillMedidaState === "success"
                  ? "Tratativa preenchida!"
                  : "Completar tratativa"
              }
              className={`p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-wait ${
                fillMedidaState === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              }`}
            >
              {fillMedidaState === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : fillMedidaState === "success" ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </button>
          )}
          {/* Some quando falta tratativa: "Enviado ao RIZER" (check verde) ao
              lado de "Falta a tratativa" (alerta âmbar) é contraditório e
              redundante — o botão de completar tratativa já deixa claro que
              foi enviado (só falta esse passo). */}
          {!localFaltaTratativa && (
            <button
              onClick={handleRizerClick}
              disabled={disciplinaryState === "loading"}
              title={
                disciplinaryState === "success"
                  ? "Enviado ao RIZER — clique para verificar o status"
                  : disciplinaryState === "loading"
                    ? (disciplinaryAction === "verifying" ? "Verificando no RIZER..." : "Enviando ao RIZER...")
                    : disciplinaryState === "error"
                      ? "Falha ao enviar — clique para tentar novamente"
                      : !isAdmin
                        ? "Apenas administradores podem registrar no RIZER"
                        : "Enviar ocorrência ao RIZER"
              }
              className={`p-2 rounded flex-shrink-0 transition-colors disabled:opacity-60 disabled:cursor-wait ${
                disciplinaryState === "success"
                  ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  : disciplinaryState === "error"
                    ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    : !isAdmin
                      ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      : "text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:text-gray-500 dark:hover:text-orange-400 dark:hover:bg-orange-950/40"
              }`}
            >
              {disciplinaryState === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              ) : disciplinaryState === "success" ? (
                <Check className="w-4 h-4" />
              ) : disciplinaryState === "error" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <RizerLogo className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onExcluir?.(); }}
            title="Excluir"
            className="p-2 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {onSendToDrive && (
            <button
              onClick={(e) => { e.stopPropagation(); onSendToDrive(); }}
              disabled={driveStatus === "sending" || driveStatus === "sent"}
              title={driveStatus === "sent" ? "Enviado ao Drive" : "Enviar PDF ao Google Drive"}
              className={`p-2 rounded transition-colors disabled:cursor-default ${
                driveStatus === "sent"
                  ? "text-emerald-500"
                  : driveStatus === "sending"
                    ? "text-gray-300 dark:text-gray-600"
                    : "text-gray-400 hover:text-[#0066da] hover:bg-blue-50 dark:text-gray-500 dark:hover:bg-blue-950/40"
              }`}
            >
              {driveStatus === "sending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : driveStatus === "sent" ? (
                <Check className="w-4 h-4" />
              ) : (
                <DriveIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
      </>
    );
  }

  // ── Modo card ──────────────────────────────────────────────────────────────
  return (
    <>
    {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} />}
    {showWhatsAppModal && (
      <WhatsAppConnectModal whatsappAgent={whatsappAgent} onClose={() => setShowWhatsAppModal(false)} />
    )}
    {showPhoneModal && cardDriver && (
      <DriverPhoneModal
        driverId={cardDriver.driverId}
        driverName={cardDriver.name}
        currentPhone={phoneModalMode === "edit" ? driverPhone : null}
        onClose={() => setShowPhoneModal(false)}
        onSaved={phoneModalMode === "send" ? sendNotification : undefined}
      />
    )}
    {showSuspensaoModal && (
      <SuspensaoModal occurrence={occurrence} onClose={() => setShowSuspensaoModal(false)} />
    )}
    <RizerRegisterModal
      open={showRizerModal}
      selected={tipoMedida}
      onSelect={setTipoMedida}
      onConfirm={submitRizerRegister}
      onCancel={() => setShowRizerModal(false)}
    />
    <ConfirmTratativaModal
      open={showConfirmTratativaModal}
      tipo={tipoMedida}
      onConfirm={() => submitRizerRegister(tipoMedida)}
      onCancel={() => setShowConfirmTratativaModal(false)}
    />
    <div
      className={`group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 transition-shadow cursor-pointer ${batchOverlay ? "pointer-events-none" : "hover:shadow-md"}`}
      onClick={onOpen}
    >
      {batchOverlay && (
        <div className="absolute inset-0 z-10 rounded-lg flex flex-col items-center justify-center gap-2 bg-white/75 dark:bg-gray-900/85 backdrop-blur-[2px]">
          {batchOverlay === "processing"
            ? <><Loader2 className="w-6 h-6 text-orange-400 animate-spin" /><span className="text-xs font-medium text-orange-500">Registrando...</span></>
            : <><Clock className="w-5 h-5 text-gray-300 dark:text-gray-600" /><span className="text-xs text-gray-400 dark:text-gray-500">Na fila</span></>}
        </div>
      )}
      {disciplinaryState === "loading" && !batchOverlay && (
        <div className="absolute inset-0 z-10 rounded-lg flex flex-col items-center justify-center gap-2 bg-white/80 dark:bg-gray-900/85 backdrop-blur-[2px] pointer-events-none">
          <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
            {disciplinaryAction === "verifying"
              ? "Verificando no RIZER..."
              : disciplinaryAction === "updating"
              ? "Atualizando no RIZER..."
              : "Registrando no RIZER..."}
          </span>
        </div>
      )}
      {(tratativaOverlay || fillMedidaState === "loading") && !batchOverlay && disciplinaryState !== "loading" && (
        <div className="absolute inset-0 z-10 rounded-lg flex flex-col items-center justify-center gap-2 bg-amber-50/90 dark:bg-amber-950/40 backdrop-blur-[2px] pointer-events-none">
          {tratativaOverlay === "queued"
            ? <Clock className="w-5 h-5 text-amber-400" />
            : <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />}
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {tratativaOverlay === "queued" ? "Aguardando tratativa..." : "Preenchendo tratativa..."}
          </span>
        </div>
      )}
      {revisarOverlay && !batchOverlay && !tratativaOverlay && disciplinaryState !== "loading" && (
        <div className="absolute inset-0 z-10 rounded-lg flex flex-col items-center justify-center gap-2 bg-emerald-50/90 dark:bg-emerald-950/40 backdrop-blur-[2px] pointer-events-none">
          {revisarOverlay === "queued"
            ? <Clock className="w-5 h-5 text-emerald-400" />
            : <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />}
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {revisarOverlay === "queued" ? "Aguardando revisão..." : "Revisando no RIZER..."}
          </span>
        </div>
      )}
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isSecondDriverCard ? (
              <span className="text-gray-300 dark:text-gray-600 text-base" title="Mesma ocorrência do card acima">↳</span>
            ) : (
              <>
                <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                  {occurrence.vehicleNumber}
                </span>
                {isDuplicateVehicle && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                    title={`Este veículo tem ${duplicateVehicleCount} ocorrências hoje`}
                  />
                )}
                <BaseChip base={driver1?.baseCode ?? occurrence.baseCode} />
                {hasSecondDriverCard && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold text-[10px] leading-none whitespace-nowrap">
                    <UserCheck className="w-2.5 h-2.5" />
                    2 motoristas
                  </span>
                )}
              </>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isSecondDriverCard ? "Mesma ocorrência acima — Motorista 02" : subject}
          </p>
        </div>
        {!isSecondDriverCard && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {occurrence.typeCode === "EXCESSO_PERMANENCIA" && (occurrence.points?.length ?? 0) > 1 && (
            <div
              className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-2 py-1 rounded"
              title={occurrence.points!.map((p) => `${p.place} (${p.startTime}–${p.endTime})`).join(" · ")}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{occurrence.points!.length} paradas</span>
            </div>
          )}
          {occurrence.typeCode === "DESCUMP_OP_PARADA_FORA" && (occurrence.evidenceCount ?? 0) === 0 ? (
            <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 px-2 py-1 rounded">
              <ImageOff className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Sem evidência</span>
            </div>
          ) : occurrence.evidenceCount > 0 ? (
            <div className="flex items-center gap-1 text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-800 px-2 py-1 rounded">
              <Camera className="w-4 h-4" />
              <span className="text-sm font-medium">{occurrence.evidenceCount}</span>
            </div>
          ) : null}
          {disciplinaryState === "idle" && (
            <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">
              <Gavel className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Não enviado ao RIZER</span>
            </div>
          )}
          {localFaltaTratativa && (
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-2 py-1 rounded">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Falta a tratativa</span>
            </div>
          )}
          {occurrence.tratativa && (
            <TratativaBadge value={occurrence.tratativa} size="sm" />
          )}
        </div>
        )}
      </div>

      {/* Corpo */}
      <div className="space-y-2">
        {!isSecondDriverCard && (
        <>
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          {occurrence.typeCode === "EXCESSO_VELOCIDADE" || occurrence.startTime === occurrence.endTime ? (
            <span>{occurrence.startTime}</span>
          ) : (
            <>
              <span>
                {occurrence.startTime} - {occurrence.endTime}
              </span>
              <span className="text-gray-400 dark:text-gray-500">({tempoParada})</span>
            </>
          )}
        </div>

        {occurrence.typeCode === "EXCESSO_VELOCIDADE" ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-bold text-base leading-none">
              <Zap className="w-4 h-4 fill-red-200" />
              {occurrence.speedKmh != null ? `${occurrence.speedKmh} km/h` : "—"}
            </span>
          </div>
        ) : occurrence.typeCode === "GENERICO" ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">📋 {occurrence.place || "—"}</p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">📍 {occurrence.place}</p>
        )}
        </>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
          <span className={isSecondDriverCard ? "text-gray-700 dark:text-gray-300 font-medium" : undefined}>
            {isSecondDriverCard ? (driver2?.name ?? "—") : (driver1?.name ?? "—")}
          </span>
          {occurrence.analisadoPor && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 flex-shrink-0">
              <UserCheck className="w-3 h-3" />
              {occurrence.analisadoPor}
            </span>
          )}
        </div>
      </div>

      {/* Rodapé com botões */}
      <div
        className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Linha 1: Editar + Excluir */}
        <div className="flex gap-2">
          <button
            onClick={handleEditar}
            disabled={loadingEdit || editDisabled}
            title={editDisabled ? "Edição bloqueada enquanto o RIZER está processando" : undefined}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 rounded-md transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500"
          >
            {loadingEdit ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" /> Editar
              </>
            )}
          </button>
          <button
            onClick={onExcluir}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-950/40 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>

        {/* Linha 2: WhatsApp + Relatório + Drive */}
        <div className="flex gap-2">
          <button
            onClick={handleCopyWpp}
            disabled={loadingAiWpp}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-colors disabled:opacity-50 ${
              copiedWpp
                ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/40"
                : "text-gray-500 hover:text-green-700 hover:bg-green-50 dark:text-gray-400 dark:hover:text-green-400 dark:hover:bg-green-950/40"
            }`}
          >
            {loadingAiWpp ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isAnaliseOp ? (
              <Sparkles className="w-3.5 h-3.5" />
            ) : (
              <MessageCircle className="w-3.5 h-3.5" />
            )}
            {loadingAiWpp ? "Gerando..." : copiedWpp ? "Copiado!" : isAnaliseOp ? "WhatsApp IA" : "WhatsApp"}
          </button>
          <button
            onClick={handleSendWpp}
            disabled={whatsappSendDisabled}
            title={whatsappSendTitle}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors disabled:opacity-40 ${
              localWhatsappSentCount > 0
                ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60"
                : "text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 dark:text-gray-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/40"
            }`}
          >
            {whatsappSendBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : !whatsappAgent.connected ? (
              <QrCode className="w-3.5 h-3.5" />
            ) : !driverPhone ? (
              <Phone className="w-3.5 h-3.5" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {localWhatsappSentCount > 0 && `${localWhatsappSentCount}x`}
          </button>
          {cardDriver && (
            <button
              onClick={handleEditPhone}
              title={driverPhone ? `Editar telefone (${driverPhone})` : "Cadastrar telefone"}
              className="flex items-center justify-center px-2.5 py-1.5 text-xs rounded-md text-gray-500 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
            >
              <PencilLine className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCopyRelat}
            disabled={loadingAiRelat}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-colors disabled:opacity-50 ${
              copiedRelat
                ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/40"
                : "text-gray-500 hover:text-blue-700 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/40"
            }`}
          >
            {loadingAiRelat ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            {loadingAiRelat ? "Gerando..." : copiedRelat ? "Copiado!" : isAnaliseOp ? "E-mail IA" : "Relatório"}
          </button>
          {onSendToDrive && (
            <button
              onClick={(e) => { e.stopPropagation(); onSendToDrive(); }}
              disabled={driveStatus === "sending" || driveStatus === "sent"}
              title={driveStatus === "sent" ? "Arquivo já enviado ao Drive" : "Enviar PDF ao Google Drive"}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors disabled:cursor-default ${
                driveStatus === "sent"
                  ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40"
                  : driveStatus === "sending"
                    ? "text-gray-400 bg-gray-50 dark:text-gray-500 dark:bg-gray-800"
                    : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {driveStatus === "sending" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : driveStatus === "sent" ? (
                <><Check className="w-3.5 h-3.5" /><span>Drive</span></>
              ) : (
                <DriveIcon className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Linha 3: Suspensão + Registrar Disciplinar */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowSuspensaoModal(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-colors ${
              localSuspensao
                ? "text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40 dark:hover:bg-amber-950/60"
                : "text-gray-500 hover:text-red-700 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-950/40"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {localSuspensao ? "Ver Suspensão" : "Gerar Suspensão"}
          </button>
          <button
            onClick={handleRizerClick}
            disabled={disciplinaryState === "loading"}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-60 ${
              disciplinaryState === "success"
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/40"
                : disciplinaryState === "loading"
                  ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 cursor-wait"
                  : disciplinaryState === "error"
                    ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/40"
                    : !isAdmin
                      ? "text-gray-400 bg-gray-50 dark:text-gray-500 dark:bg-gray-800 cursor-not-allowed"
                      : "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-950/40"
            }`}
          >
            {disciplinaryState === "loading" ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />{disciplinaryAction === "verifying" ? "Verificando no RIZER..." : disciplinaryAction === "updating" ? "Atualizando no RIZER..." : "Enviando ao RIZER..."}</>
            ) : disciplinaryState === "success" ? (
              <><Check className="w-3.5 h-3.5" />Enviado ao RIZER <RefreshCw className="w-3 h-3 opacity-40" /></>
            ) : disciplinaryState === "error" ? (
              <><RizerLogo className="w-4 h-4" />Tentar novamente</>
            ) : (
              <><RizerLogo className="w-4 h-4" />Enviar ao RIZER</>
            )}
          </button>
        </div>

        {/* Linha 4: Completar tratativa — só aparece quando falta_tratativa e é admin */}
        {isAdmin && localFaltaTratativa && (
          <button
            onClick={handleFillMedida}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md border transition-colors ${
              fillMedidaState === "loading"
                ? "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                : fillMedidaState === "success"
                  ? "border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 cursor-default"
                  : "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/40"
            }`}
          >
            {fillMedidaState === "loading"
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : fillMedidaState === "success"
                ? <Check className="w-3.5 h-3.5" />
                : <AlertTriangle className="w-3.5 h-3.5" />}
            {fillMedidaState === "loading"
              ? "Completando tratativa..."
              : fillMedidaState === "success"
                ? "Tratativa preenchida!"
                : "Completar tratativa"}
          </button>
        )}

      </div>
    </div>
    </>
  );
}

// ── Helpers de base (modo lista) ─────────────────────────────────────────────

const BASE_PALETTE = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Abrevia o nome da base: "SANTA MARIA DA VITORIA" → "SMV" */
function abbreviate(name: string): string {
  if (!name) return "—";
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 6);
  return words
    .filter((w) => !["DA", "DE", "DO", "DAS", "DOS"].includes(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 5);
}

function fmtDdMmCompact(iso: string): string {
  const [, m, d] = (iso ?? "").split("-");
  if (!m || !d) return iso;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}`;
}

function calcularTempoParada(inicio: string, fim: string): string {
  const [hI, mI] = inicio.split(":").map(Number);
  const [hF, mF] = fim.split(":").map(Number);
  let diff = hF * 60 + mF - (hI * 60 + mI);
  if (diff < 0) diff += 24 * 60;
  const horas = Math.floor(diff / 60);
  const minutos = diff % 60;
  if (horas > 0) return `${horas}h ${minutos}min`;
  return `${minutos}min`;
}
