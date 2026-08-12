import { useCallback, useMemo, useRef, useState } from "react";
import { FileDown, Copy, Check, Loader2, MessageCircle, QrCode, Phone, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../api/http";
import { reportsDriveApi } from "../../../../../api/reportsDrive.api";
import {
  buildDriverPdfFileName,
  downloadBlob,
  fetchBlobFromUrl,
} from "../../../../../utils/pdfDownload";
import { requestDriveToken } from "../../../../../utils/googleAuth";
import type { DriveFolderConfig } from "../../../../../hooks/useDriveFolder";
import type { Ocorrencia } from "../../../../types";
import { useDriver } from "../../../../../features/occurrences/queries/drivers.queries";
import type { WhatsAppAgentState } from "../../../../../hooks/useWhatsAppAgent";
import { whatsappAgentApi } from "../../../../../api/whatsappAgent.api";
import { formatPhoneForWhatsApp, buildDriverNotificationMessage } from "../../../../../utils/whatsapp";
import { DriverPhoneModal } from "../../../../components/DriverPhoneModal";
import { occurrencesApi } from "../../../../../api/occurrences.api";

type Status = "idle" | "generating" | "ready" | "error";

type DriverSnapshot = {
  id: string;
  position: 1 | 2;
  registry: string;
  name: string;
  base?: string | null;
};

type DriveContext = {
  config: DriveFolderConfig | null;
  token: string | null;
  onNeedConnect: () => void;
  onTokenRefreshed: (token: string) => void;
  clientId: string | null;
};

// ── SVG do Google Drive ───────────────────────────────────────────────────────
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

export function DriverPdfCard(props: {
  occurrenceId: string;
  occurrenceTitle: string;
  eventDate: string;
  driver: DriverSnapshot;
  // Ocorrência completa — a mensagem de notificação é montada aqui, no
  // formato institucional (ver buildDriverNotificationMessage).
  occurrence: Ocorrencia;
  // Só pra GENERICO: resumo do relato gerado por IA — vem da preview porque
  // é estado da tela (IA é gerada sob demanda ali). Sem resumo gerado ainda,
  // a notificação sai sem a seção de relato (não manda o texto bruto).
  genericoRelatoIA?: string | null;
  // Gera o resumo IA do relato sob demanda (GENERICO), caso o usuário ainda
  // não tenha clicado em "Gerar resumo com IA" na seção "Relato em Texto
  // Plano" — evita mandar a notificação sem o relato resumido.
  ensureGenericoRelatoIA?: () => Promise<string | null>;
  whatsappAgent: WhatsAppAgentState;
  // Abre o modal de conexão (QR Code) na preview — a conexão em si (POST
  // /whatsapp/connect) não bloqueia mais, então não dá mais pra só "esperar"
  // no clique do card; precisa de UI própria pra mostrar o QR.
  onNeedWhatsAppConnect: () => void;
  driveContext: DriveContext;
  getOrCreateSignedUrl: (args: {
    force?: boolean;
    reason: "driver-download";
  }) => Promise<{
    signedUrl: string;
    cached?: boolean | null;
    ttlSeconds?: number | null;
  }>;
}) {
  const { occurrenceId, occurrenceTitle, eventDate, driver, occurrence, genericoRelatoIA, ensureGenericoRelatoIA, whatsappAgent, onNeedWhatsAppConnect, driveContext, getOrCreateSignedUrl } = props;

  // Ficha completa do motorista (telefone) — busca sob demanda, cacheada por id.
  const driverDetail = useDriver(driver.id || null);
  const driverPhone = driverDetail.data?.phone ?? null;

  const [whatsappSending, setWhatsappSending] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  // "send": aberto pelo botão de WhatsApp sem telefone (cadastra e já
  // dispara o envio). "edit": aberto pelo ícone de lápis, sempre visível
  // (só ajusta o número, sem side-effect de envio).
  const [phoneModalMode, setPhoneModalMode] = useState<"send" | "edit">("send");

  // Dispara o envio de verdade — separado do clique pra poder ser chamado
  // de novo assim que o telefone é cadastrado no DriverPhoneModal, sem o
  // usuário precisar clicar duas vezes.
  const sendNotification = useCallback((rawPhone: string) => {
    const phone = formatPhoneForWhatsApp(rawPhone);
    if (!phone) {
      toast.error("Telefone do motorista inválido.");
      return;
    }

    // O envio roda em segundo plano — não trava o botão "voltar" nem impede o
    // usuário de ir criar outra ocorrência enquanto o RIZER Agent manda a
    // mensagem. O toast.promise fica preso ao Toaster global (main.tsx), não
    // a este componente, então o status (enviando/enviado/falhou) continua
    // visível mesmo que o usuário já tenha saído desta tela.
    const firstName = driver.name.split(/\s+/)[0] || driver.name;
    setWhatsappSending(true);
    const sendPromise = (async () => {
      let relatoIA = genericoRelatoIA;
      if (occurrence.typeCode === "GENERICO" && !relatoIA?.trim() && ensureGenericoRelatoIA) {
        relatoIA = await ensureGenericoRelatoIA();
      }
      const message = buildDriverNotificationMessage(driver.name, occurrence, { genericoRelatoIA: relatoIA });
      await whatsappAgentApi.send({ phone, message });

      // Mesmo contador da Home (occurrence.whatsappSentCountD1/D2) — só não
      // falha o envio nem vira erro no toast se isso aqui não gravar.
      occurrencesApi.markWhatsappSent(occurrence.id, driver.position).catch(() => {});
    })();

    toast.promise(sendPromise, {
      loading: `Enviando notificação para ${firstName} via WhatsApp...`,
      success: `Notificação enviada para ${firstName} via WhatsApp!`,
      error: (err) => getApiErrorMessage(err, "Falha ao enviar notificação via WhatsApp"),
    });

    sendPromise.catch(() => {}).finally(() => setWhatsappSending(false));
  }, [driver.name, occurrence, genericoRelatoIA, ensureGenericoRelatoIA]);

  // Envio 100% automatizado pelo RIZER Agent (whatsapp-web.js, sessão já
  // conectada) — a única ação manual do usuário foi escanear o QR Code uma
  // vez. Sem sessão conectada, o clique abre o modal de conexão; sem
  // telefone cadastrado, abre o cadastro rápido — em vez de enviar.
  const handleWhatsAppClick = useCallback(() => {
    if (!whatsappAgent.agentAvailable) {
      toast.error("O RIZER Agent não está em execução. Abra o agente e tente novamente.");
      return;
    }

    if (!whatsappAgent.connected) {
      onNeedWhatsAppConnect();
      return;
    }

    if (!driverPhone) {
      setPhoneModalMode("send");
      setShowPhoneModal(true);
      return;
    }

    sendNotification(driverPhone);
  }, [whatsappAgent, driverPhone, onNeedWhatsAppConnect, sendNotification]);

  const handleEditPhoneClick = useCallback(() => {
    setPhoneModalMode("edit");
    setShowPhoneModal(true);
  }, []);

  const whatsappBusy = whatsappSending || driverDetail.isLoading;

  const whatsappTitle = !whatsappAgent.agentAvailable
    ? "RIZER Agent offline — abra o agente para notificar"
    : !whatsappAgent.connected
      ? "Conectar WhatsApp (mostra o QR Code)"
      : driverDetail.isLoading
        ? "Carregando telefone…"
        : driverPhone
          ? `Notificar ${driver.name.split(/\s+/)[0]} via WhatsApp`
          : "Motorista sem telefone cadastrado — clique para cadastrar";

  const whatsappDisabled = !whatsappAgent.agentAvailable || whatsappBusy;

  const [status, setStatus] = useState<Status>("idle");
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSent, setDriveSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cachedBlobRef = useRef<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fileName = useMemo(
    () => buildDriverPdfFileName({ registry: driver.registry, name: driver.name, base: driver.base ?? "", occurrenceTitle, eventDate }),
    [driver.registry, driver.name, driver.base, occurrenceTitle, eventDate],
  );

  const handleCopyName = useCallback(() => {
    navigator.clipboard.writeText(fileName.replace(/\.pdf$/i, ""));
    setCopied(true);
    toast.success("Nome copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  }, [fileName]);

  const statusBadge = useMemo(() => {
    switch (status) {
      case "idle":      return { label: "idle",    cls: "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-400" };
      case "generating":return { label: "gerando", cls: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400" };
      case "ready":     return { label: "pronto",  cls: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" };
      case "error":     return { label: "erro",    cls: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400" };
    }
  }, [status]);

  // ── Download local ────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (status === "generating") return;
    setStatus("generating");
    setErrorMsg(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const blob = cachedBlobRef.current ?? await (async () => {
        const { signedUrl } = await getOrCreateSignedUrl({ reason: "driver-download", force: false });
        const b = await fetchBlobFromUrl(signedUrl, ac.signal);
        cachedBlobRef.current = b;
        return b;
      })();
      downloadBlob(blob, fileName);
      setStatus("ready");
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      const msg = getApiErrorMessage(e, "Falha ao baixar PDF do motorista");
      setErrorMsg(msg);
      setStatus("error");
      toast.error(msg);
    }
  }, [status, getOrCreateSignedUrl, fileName]);

  // ── Enviar ao Drive ───────────────────────────────────────────────────────
  const handleSendToDrive = useCallback(async () => {
    if (driveLoading) return;

    // Sem pasta configurada → abrir modal de configuração
    if (!driveContext.config) {
      driveContext.onNeedConnect();
      return;
    }

    setDriveLoading(true);
    try {
      // Token ausente (expirou ou página foi recarregada) → reautenticar silenciosamente
      let token = driveContext.token;
      if (!token) {
        if (!driveContext.clientId) {
          toast.error("Google Client ID não configurado.");
          setDriveLoading(false);
          return;
        }
        token = await requestDriveToken(driveContext.clientId);
        driveContext.onTokenRefreshed(token);
      }

      const res = await reportsDriveApi.sendOccurrenceToDrive({
        occurrenceId,
        accessToken: token,
        folderId: driveContext.config.folderId,
        fileName,
      });
      const { webViewLink } = res.data.drive;
      setDriveSent(true);
      toast.success(
        <span>
          <strong>{fileName}</strong> enviado!{" "}
          <a href={webViewLink} target="_blank" rel="noreferrer" className="underline">
            Abrir no Drive
          </a>
        </span>,
        { duration: 8000 },
      );
    } catch (err) {
      toast.error(`Falha ao enviar ao Drive: ${getApiErrorMessage(err)}`);
    } finally {
      setDriveLoading(false);
    }
  }, [driveLoading, driveContext, occurrenceId, fileName]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
              Motorista {String(driver.position).padStart(2, "0")}
            </span>
            <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>

          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {driver.registry} — {driver.name}
          </h3>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Base: <span className="font-medium text-gray-800 dark:text-gray-200">{driver.base ?? "—"}</span>
          </p>
          <div className="mt-1 flex items-center gap-1 group/phone">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Tel:{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {driverDetail.isLoading ? "…" : driverPhone ?? "sem telefone"}
              </span>
            </p>
            <button
              type="button"
              onClick={handleEditPhoneClick}
              className="cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title={driverPhone ? "Editar telefone" : "Cadastrar telefone"}
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2 group">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={fileName}>
              Arquivo: <span className="font-medium text-gray-700 dark:text-gray-300">{fileName}</span>
            </p>
            <button
              type="button"
              onClick={handleCopyName}
              className="cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Copiar nome"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {status === "error" && errorMsg ? (
            <p className="mt-2 text-xs text-red-700 dark:text-red-400">{errorMsg}</p>
          ) : null}
        </div>

        {/* Ações */}
        <div className="shrink-0 flex items-center gap-2">
          {/* Notificar via WhatsApp (RIZER Agent) */}
          <button
            type="button"
            onClick={handleWhatsAppClick}
            disabled={whatsappDisabled}
            title={whatsappTitle}
            className="cursor-pointer w-10 h-10 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {whatsappBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : !whatsappAgent.connected ? (
              <QrCode className="w-4 h-4" />
            ) : !driverPhone ? (
              <Phone className="w-4 h-4" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
          </button>

          {showPhoneModal && (
            <DriverPhoneModal
              driverId={driver.id}
              driverName={driver.name}
              currentPhone={phoneModalMode === "edit" ? driverPhone : null}
              onClose={() => setShowPhoneModal(false)}
              onSaved={phoneModalMode === "send" ? sendNotification : undefined}
            />
          )}

          {/* Enviar ao Drive */}
          <button
            type="button"
            onClick={handleSendToDrive}
            disabled={driveLoading || driveSent}
            title={
              driveSent
                ? "Arquivo já enviado ao Drive"
                : driveContext.config
                  ? `Enviar para "${driveContext.config.folderName}"`
                  : "Conecte o Drive para enviar"
            }
            className={[
              "h-10 rounded-lg border flex items-center justify-center transition-colors",
              driveSent
                ? "px-3 gap-1.5 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 cursor-default"
                : "cursor-pointer w-10 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50",
            ].join(" ")}
          >
            {driveLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-gray-400" />
            ) : driveSent ? (
              <>
                <Check className="w-4 h-4" />
                <span className="text-xs font-medium">Enviado</span>
              </>
            ) : (
              <DriveIcon className="w-5 h-5" />
            )}
          </button>

          {/* Baixar PDF */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={status === "generating"}
            className="cursor-pointer h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            <FileDown className="w-4 h-4" />
            {status === "generating" ? "Baixando..." : "Baixar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
