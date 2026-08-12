import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Home, PencilLine, Check, Copy, Sparkles, Loader2, X, MessageCircle } from "lucide-react";
import type { Ocorrencia } from "../../../types";
import {
  gerarTextoRelatorioIndividual,
  gerarTextoWhatsApp,
} from "../../../../utils/relatorio";
import { useGetOccurrencePdf } from "../../../../features/reportsPdf/queries/reportsPdf.queries";

import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../api/http";
import { aiApi } from "../../../../api/ai.api";
import { reportsDriveApi } from "../../../../api/reportsDrive.api";

import { DriverPdfCard } from "./components/DriverPdfCard";
import { DrivePickerModal } from "./components/DrivePickerModal";
import { WhatsAppConnectModal } from "../../../components/WhatsAppConnectModal";
import { OccurrencePrintView } from "./OccurrencePrintView";
import { useDriveFolder } from "../../../../hooks/useDriveFolder";
import { useWhatsAppAgent } from "../../../../hooks/useWhatsAppAgent";

export function OccurrencePreviewPage(props: {
  occurrenceId: string;
  occurrence: Ocorrencia;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { occurrenceId, occurrence, onBack, onEdit } = props;

  const getPdf = useGetOccurrencePdf();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [ttl, setTtl] = useState<number | null>(null);
  const [cached, setCached] = useState<boolean | null>(null);

  // ── IA: resumo (Relato em Texto Plano) ───────────────────────────────────
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ── IA: resumo WhatsApp ───────────────────────────────────────────────────
  const [wppAiSummary, setWppAiSummary] = useState<string | null>(null);
  const [wppAiLoading, setWppAiLoading] = useState(false);

  // ── WhatsApp (via RIZER Agent) ──────────────────────────────────────────
  const whatsappAgent = useWhatsAppAgent();

  // ── Google Drive ─────────────────────────────────────────────────────────
  const driveFolder = useDriveFolder();
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  async function handleDriveConfirm(args: {
    config: { folderId: string; folderName: string };
    accessToken: string;
    saveAsDefault: boolean;
  }) {
    if (args.saveAsDefault) driveFolder.save(args.config);
    setDriveToken(args.accessToken);
    setShowDriveModal(false);
  }

  // ── Cooldown compartilhado (mesmo endpoint / mesmo rate-limit) ────────────
  const [aiCooldown, setAiCooldown] = useState(0);
  const [aiCooldownTotal, setAiCooldownTotal] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown(seconds: number) {
    setAiCooldown(seconds);
    setAiCooldownTotal(seconds);
    cooldownRef.current = setInterval(() => {
      setAiCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const relatorioTxt = useMemo(
    () => gerarTextoRelatorioIndividual(occurrence),
    [occurrence],
  );
  const whatsappTxt = useMemo(
    () => gerarTextoWhatsApp(occurrence),
    [occurrence],
  );

  function getViagemLinha(v: Ocorrencia["viagem"]): string {
    return "linha" in v ? String(v.linha ?? "") : "";
  }

  function getViagemPrefixo(v: Ocorrencia["viagem"]): string {
    return "prefixo" in v ? String(v.prefixo ?? "") : "";
  }

  function getViagemOrigem(v: Ocorrencia["viagem"]): string {
    return "origem" in v ? String(v.origem ?? "") : "";
  }

  function getViagemDestino(v: Ocorrencia["viagem"]): string {
    return "destino" in v ? String(v.destino ?? "") : "";
  }

  function getOccurrenceTitle(o: Ocorrencia): string {
    if (o.typeCode === "GENERICO" && o.reportTitle) return o.reportTitle;
    return o.typeTitle || o.typeCode || "PARADA FORA DO PROGRAMADO";
  }

  type DriverSnapshot = {
    id: string;
    position: 1 | 2;
    registry: string;
    name: string;
    base?: string | null;
  };

  const isGenerico = occurrence.typeCode === "GENERICO";

  // Relato pra notificação de WhatsApp em GENERICO: só entra na mensagem
  // quando já foi resumido por IA (mesmo texto da seção "Relato em Texto
  // Plano") — sem resumo gerado ainda, a notificação sai sem essa seção em
  // vez de mandar o relato bruto.
  const genericoRelatoIA = isGenerico ? aiSummary : null;

  const drivers = useMemo(() => {
    const map = (raw: any, position: 1 | 2): DriverSnapshot | null => {
      if (!raw) return null;

      const code = raw.code || raw.registry || raw.matricula || "";
      const name = raw.name || raw.nome || "";
      const base = raw.base || "";

      // Ignora motorista "vazio" (quando seção de tripulação foi desabilitada)
      if (!code && !name) return null;

      return {
        id: String(raw.id || "").trim(),
        position,
        registry: String(code).trim(),
        name: String(name).trim(),
        base: String(base).trim() || null,
      };
    };

    return {
      d1: map(occurrence.motorista1, 1),
      d2: map(occurrence.motorista2, 2),
    };
  }, [occurrence.motorista1, occurrence.motorista2]);

  const hasDrivers = !!(drivers.d1 || drivers.d2);

  async function handleSummarize() {
    if (!relatorioTxt.trim() || aiCooldown > 0) return;
    setAiLoading(true);
    setAiSummary(null);
    try {
      const { summary } = await aiApi.summarize(relatorioTxt, occurrence.reportTitle ?? undefined);
      setAiSummary(summary);
    } catch (e) {
      const msg = getApiErrorMessage(e, "Falha ao gerar resumo com IA");
      const match = msg.match(/em (\d+) segundo/);
      if (match) startCooldown(parseInt(match[1], 10));
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleWppSummarize() {
    if (!relatorioTxt.trim() || aiCooldown > 0) return;
    setWppAiLoading(true);
    setWppAiSummary(null);
    try {
      const { summary } = await aiApi.summarize(relatorioTxt, occurrence.reportTitle ?? undefined);
      setWppAiSummary(summary);
    } catch (e) {
      const msg = getApiErrorMessage(e, "Falha ao gerar resumo com IA");
      const match = msg.match(/em (\d+) segundo/);
      if (match) startCooldown(parseInt(match[1], 10));
      toast.error(msg);
    } finally {
      setWppAiLoading(false);
    }
  }

  // Texto final do WhatsApp: base + resumo IA (se gerado)
  const wppDisplayText = wppAiSummary
    ? `${whatsappTxt}\n\n${wppAiSummary}`
    : whatsappTxt;

  // Garante o resumo IA do relato (GENERICO) antes de notificar o motorista
  // via WhatsApp — se o usuário ainda não clicou em "Gerar resumo com IA" na
  // seção "Relato em Texto Plano", gera aqui sob demanda em vez de mandar a
  // notificação sem o relato. Se já existe (aiSummary), reaproveita.
  const ensureGenericoRelatoIA = useCallback(async (): Promise<string | null> => {
    if (!isGenerico) return null;
    if (aiSummary) return aiSummary;
    if (!relatorioTxt.trim()) return null;
    if (aiCooldown > 0) {
      throw new Error(`Resumo por IA disponível em ${aiCooldown} segundos`);
    }
    setAiLoading(true);
    try {
      const { summary } = await aiApi.summarize(relatorioTxt, occurrence.reportTitle ?? undefined);
      setAiSummary(summary);
      return summary;
    } catch (e) {
      const msg = getApiErrorMessage(e, "Falha ao gerar resumo com IA");
      const match = msg.match(/em (\d+) segundo/);
      if (match) startCooldown(parseInt(match[1], 10));
      throw new Error(msg);
    } finally {
      setAiLoading(false);
    }
  }, [isGenerico, aiSummary, relatorioTxt, occurrence.reportTitle, aiCooldown]);

  async function handleGenerate(force?: boolean) {
    try {
      const res = await getPdf.mutateAsync({
        occurrenceId,
        ttlSeconds: 3600,
        force: !!force,
      });

      const pdf = res.data.pdf;
      setSignedUrl(pdf.signedUrl);
      setTtl(pdf.ttlSeconds);
      setCached(pdf.cached);
    } catch (e) {
      setSignedUrl(null);
      setTtl(null);
      setCached(null);
      toast.error(getApiErrorMessage(e, "Falha ao gerar PDF"));
    }
  }

  function handleDownload() {
    if (!signedUrl) return;
    window.open(signedUrl, "_blank", "noopener,noreferrer");
  }

  async function getOrCreateSignedUrl(args: {
    force?: boolean;
    reason: "driver-download";
  }) {
    // Se já tem signedUrl e não for force, reaproveita sem bater no backend
    if (signedUrl && !args.force) {
      return { signedUrl, cached, ttlSeconds: ttl };
    }

    const res = await getPdf.mutateAsync({
      occurrenceId,
      ttlSeconds: 3600,
      force: !!args.force,
    });

    const pdf = res.data.pdf;
    setSignedUrl(pdf.signedUrl);
    setTtl(pdf.ttlSeconds);
    setCached(pdf.cached);

    return {
      signedUrl: pdf.signedUrl,
      cached: pdf.cached,
      ttlSeconds: pdf.ttlSeconds,
    };
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 print:bg-white dark:print:bg-gray-900 print:min-h-0">
      <header className="screen-only bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          {/* Esquerda: Home + título */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
            >
              <Home className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
              Preview da Ocorrência
            </h1>
          </div>

          {/* Direita: Editar + Drive */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="cursor-pointer h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm"
            >
              <PencilLine className="w-4 h-4" />
              Editar
            </button>

            {/* Botão de conexão Drive */}
            {driveFolder.config ? (
              <div className="flex items-center gap-1 h-9 pl-3 pr-1 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 text-sm">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
                <span
                  className="text-green-800 dark:text-green-400 font-medium max-w-[120px] truncate cursor-pointer hover:underline"
                  onClick={() => setShowDriveModal(true)}
                  title={driveFolder.config.folderName}
                >
                  {driveFolder.config.folderName}
                </span>
                <button
                  onClick={() => { driveFolder.clear(); setDriveToken(null); }}
                  className="cursor-pointer p-1 ml-0.5 hover:bg-green-100 dark:hover:bg-green-950/40 rounded transition-colors"
                  title="Desconectar pasta"
                >
                  <X className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDriveModal(true)}
                className="cursor-pointer h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <svg className="w-4 h-4 shrink-0 opacity-50" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
                Conectar Drive
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="screen-only max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* PDF por motorista — só exibe quando há motoristas vinculados */}
        {hasDrivers && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">PDF por motorista</h2>

              {/* WhatsApp conectado — desconectar a conta do RIZER Agent */}
              {whatsappAgent.connected && (
                <div className="flex items-center gap-1 h-8 pl-3 pr-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-sm">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-emerald-800 dark:text-emerald-400 font-medium">WhatsApp conectado</span>
                  <button
                    onClick={async () => {
                      try {
                        await whatsappAgent.disconnect();
                        toast.success("WhatsApp desconectado.");
                      } catch (e) {
                        toast.error(getApiErrorMessage(e, "Falha ao desconectar o WhatsApp"));
                      }
                    }}
                    disabled={whatsappAgent.disconnecting}
                    className="cursor-pointer p-1 ml-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 rounded transition-colors disabled:opacity-50"
                    title="Desconectar WhatsApp"
                  >
                    {whatsappAgent.disconnecting ? (
                      <Loader2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              {drivers.d1 ? (
                <DriverPdfCard
                  occurrenceId={occurrenceId}
                  occurrenceTitle={getOccurrenceTitle(occurrence)}
                  eventDate={occurrence.dataEvento}
                  driver={drivers.d1}
                  occurrence={occurrence}
                  genericoRelatoIA={genericoRelatoIA}
                  ensureGenericoRelatoIA={ensureGenericoRelatoIA}
                  whatsappAgent={whatsappAgent}
                  onNeedWhatsAppConnect={() => setShowWhatsAppModal(true)}
                  getOrCreateSignedUrl={getOrCreateSignedUrl}
                  driveContext={{
                    config: driveFolder.config,
                    token: driveToken,
                    clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || null,
                    onNeedConnect: () => setShowDriveModal(true),
                    onTokenRefreshed: setDriveToken,
                  }}
                />
              ) : null}
              {drivers.d2 ? (
                <DriverPdfCard
                  occurrenceId={occurrenceId}
                  occurrenceTitle={getOccurrenceTitle(occurrence)}
                  eventDate={occurrence.dataEvento}
                  driver={drivers.d2}
                  occurrence={occurrence}
                  genericoRelatoIA={genericoRelatoIA}
                  ensureGenericoRelatoIA={ensureGenericoRelatoIA}
                  whatsappAgent={whatsappAgent}
                  onNeedWhatsAppConnect={() => setShowWhatsAppModal(true)}
                  getOrCreateSignedUrl={getOrCreateSignedUrl}
                  driveContext={{
                    config: driveFolder.config,
                    token: driveToken,
                    clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || null,
                    onNeedConnect: () => setShowDriveModal(true),
                    onTokenRefreshed: setDriveToken,
                  }}
                />
              ) : null}
            </div>
          </div>
        )}

        {/* Resumo */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Resumo</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {occurrence.typeCode === "GENERICO" ? (
              // Layout GENERICO (CCO)
              <>
                <div className="col-span-2">
                  <div className="text-gray-500 dark:text-gray-400">Nome do Relatório</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {occurrence.reportTitle || "—"}
                  </div>
                </div>
                {occurrence.showSectionDados !== false && (
                  <>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Operador CCO</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {occurrence.ccoOperator || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Data Origem</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {occurrence.dataEvento}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Horário</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {occurrence.horarioInicial}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Prefixo do Veículo</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {getViagemPrefixo(occurrence.viagem)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Itinerário</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {getViagemLinha(occurrence.viagem)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Local</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {occurrence.localParada || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">KM do Veículo</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {occurrence.vehicleKm ?? "—"}
                      </div>
                    </div>
                  </>
                )}
                {occurrence.showSectionPassageiros !== false && (
                  <>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Qtd. Passageiros</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {occurrence.passengerCount ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Passageiros Conexão</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {occurrence.passengerConnection || "—"}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              // Layout padrão (DESCUMP e EXCESSO)
              <>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Linha</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {getViagemLinha(occurrence.viagem)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Prefixo</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {getViagemPrefixo(occurrence.viagem)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-500 dark:text-gray-400">Origem x Destino</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {getViagemOrigem(occurrence.viagem)} x{" "}
                    {getViagemDestino(occurrence.viagem)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Data</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {occurrence.dataEvento}
                  </div>
                </div>

                {occurrence.typeCode === "EXCESSO_VELOCIDADE" ? (
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Horário do Evento</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {occurrence.horarioInicial}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Horários</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {occurrence.horarioInicial} → {occurrence.horarioFinal}
                    </div>
                  </div>
                )}

                {occurrence.typeCode === "EXCESSO_VELOCIDADE" ? (
                  <div className="col-span-2">
                    <div className="text-gray-500 dark:text-gray-400">Velocidade Atingida</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {occurrence.speedKmh ? `${occurrence.speedKmh} km/h` : "—"}
                    </div>
                  </div>
                ) : (
                  <div className="col-span-2">
                    <div className="text-gray-500 dark:text-gray-400">Local</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {occurrence.localParada || "—"}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Relato e Devolutiva (apenas GENERICO) */}
        {occurrence.typeCode === "GENERICO" && occurrence.relatoHtml && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                📝 Relato da Ocorrência
              </h2>
              <div
                className="text-sm text-gray-800 dark:text-gray-200 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: occurrence.relatoHtml }}
              />
            </div>
            {!!occurrence.devolutivaHtml?.replace(/<[^>]+>/g, "").trim() && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  ✅ Devolutiva / Solução Adotada
                  {occurrence.devolutivaStatus && (
                    <span
                      className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${
                        occurrence.devolutivaStatus === "RESOLVIDO"
                          ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                          : "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400"
                      }`}
                    >
                      {occurrence.devolutivaStatus === "RESOLVIDO"
                        ? "✅ Resolvido"
                        : "⚠️ Em Andamento"}
                    </span>
                  )}
                </h2>
                <div
                  className="text-sm text-gray-800 dark:text-gray-200 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: occurrence.devolutivaHtml }}
                />
              </div>
            )}
          </div>
        )}

        {/* Texto WhatsApp */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Texto WhatsApp</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Texto informativo para envio ao gestor</p>
            </div>
            <div className="flex items-center gap-2">
              {isGenerico && (
                <div className="relative flex flex-col items-center gap-1">
                  <button
                    onClick={handleWppSummarize}
                    disabled={wppAiLoading || aiCooldown > 0}
                    className="cursor-pointer h-9 px-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-950/40 text-violet-700 dark:text-violet-400 transition-all flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {wppAiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Resumindo...
                      </>
                    ) : wppAiSummary ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Regenerar
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Resumir com IA
                      </>
                    )}
                  </button>
                  {aiCooldown > 0 && aiCooldownTotal > 0 && (
                    <div className="w-full flex flex-col items-center gap-0.5">
                      <div className="w-full h-1 rounded-full bg-violet-100 dark:bg-violet-950/40 overflow-hidden">
                        <div
                          className="h-full bg-violet-400 rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${(aiCooldown / aiCooldownTotal) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-violet-400 tabular-nums">{aiCooldown}s</span>
                    </div>
                  )}
                </div>
              )}
              <CopyButton textToCopy={wppDisplayText} />
            </div>
          </div>

          {wppAiLoading ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4 space-y-3 animate-pulse">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-2/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              {whatsappTxt}
              {wppAiSummary && (
                <span className="text-violet-700 dark:text-violet-400">{`\n\n${wppAiSummary}`}</span>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isGenerico ? "Relato em Texto Plano" : "Relatório Individual"}
              </h2>
              {isGenerico && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Texto para advertência ou suspensão
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isGenerico && (
                <div className="relative flex flex-col items-center gap-1">
                  <button
                    onClick={handleSummarize}
                    disabled={aiLoading || aiCooldown > 0}
                    className="cursor-pointer h-9 px-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-950/40 text-violet-700 dark:text-violet-400 transition-all flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando...
                      </>
                    ) : aiSummary ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Regenerar
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Gerar com IA
                      </>
                    )}
                  </button>
                  {aiCooldown > 0 && aiCooldownTotal > 0 && (
                    <div className="w-full flex flex-col items-center gap-0.5">
                      <div className="w-full h-1 rounded-full bg-violet-100 dark:bg-violet-950/40 overflow-hidden">
                        <div
                          className="h-full bg-violet-400 rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${(aiCooldown / aiCooldownTotal) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-violet-400 tabular-nums">{aiCooldown}s</span>
                    </div>
                  )}
                </div>
              )}
              {/* Copia o resultado da IA se disponível, senão o texto bruto */}
              <CopyButton textToCopy={isGenerico ? (aiSummary ?? relatorioTxt) : relatorioTxt} />
            </div>
          </div>

          {/* GENERICO: apenas card IA (sem pré-texto bruto) */}
          {isGenerico ? (
            aiSummary ? (
              /* ── Resultado gerado ── */
              <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-400 mb-1">
                  <Sparkles className="w-4 h-4" />
                  Texto gerado por IA
                </div>
                <p className="text-sm text-violet-900 dark:text-violet-300 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
              </div>
            ) : aiLoading ? (
              /* ── Gerando: skeleton pulsante ── */
              <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                  <span className="text-sm font-semibold text-violet-400 dark:text-violet-300">Gerando texto...</span>
                </div>
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-violet-200 dark:bg-violet-800/60 rounded-full w-full" />
                  <div className="h-3 bg-violet-200 dark:bg-violet-800/60 rounded-full w-5/6" />
                  <div className="h-3 bg-violet-200 dark:bg-violet-800/60 rounded-full w-4/6" />
                </div>
              </div>
            ) : (
              /* ── Empty state ── */
              <button
                onClick={handleSummarize}
                disabled={aiCooldown > 0}
                className="group w-full rounded-lg border border-dashed border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/40 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:border-violet-300 transition-all duration-200 p-5 flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/40 group-hover:bg-violet-200 transition-colors flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-violet-700 dark:text-violet-400">Gerar texto com IA</p>
                  <p className="text-xs text-violet-400 mt-0.5">
                    {aiCooldown > 0 ? `Disponível em ${aiCooldown}s` : "Clique para gerar o texto de advertência automaticamente"}
                  </p>
                </div>
              </button>
            )
          ) : (
            /* Outros tipos: exibe texto direto */
            <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              {relatorioTxt}
            </pre>
          )}
        </div>

        {/* Erro PDF */}
        {getPdf.isError ? (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-4 text-sm">
            Falha ao gerar o PDF. Tente novamente.
          </div>
        ) : null}
      </main>

      {/* Modal de configuração do Drive */}
      {showDriveModal && (
        <DrivePickerModal
          currentConfig={driveFolder.config}
          onConfirm={handleDriveConfirm}
          onClose={() => setShowDriveModal(false)}
        />
      )}

      {/* Modal de conexão do WhatsApp (QR Code) */}
      {showWhatsAppModal && (
        <WhatsAppConnectModal
          whatsappAgent={whatsappAgent}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}

      {/* Vista de impressão — visível apenas no print */}
      <OccurrencePrintView occurrence={occurrence} drivers={drivers} />
    </div>
  );
}

function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`cursor-pointer h-9 px-3 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${
        copied
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 active:scale-95"
      }`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copiar
        </>
      )}
    </button>
  );
}
