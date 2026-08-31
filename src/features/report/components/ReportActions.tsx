import { useMemo, useState } from "react";
import {
  Copy,
  Check,
  ChevronDown,
  MessageCircle,
  Printer,
  CloudUpload,
  Send,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "../../../app/components/ui/utils";
import { useReport } from "../ReportContext";
import { buildDailyReport } from "../../../utils/relatorio-diario";
import { groupOccurrencesByManager } from "../../../utils/managerReport";
import { getDailyReportPdf } from "../../../api/occurrences.api";
import { baseResponsaveisApi } from "../../../api/baseResponsaveis.api";
import { reportsDriveApi } from "../../../api/reportsDrive.api";
import { whatsappAgentApi } from "../../../api/whatsappAgent.api";
import { useDriveFolder, type DriveFolderConfig } from "../../../hooks/useDriveFolder";
import { useWhatsAppAgent } from "../../../hooks/useWhatsAppAgent";
import { DrivePickerModal } from "../../../app/pages/occurrences/preview/components/DrivePickerModal";
import { WhatsAppConnectModal } from "../../../app/components/WhatsAppConnectModal";
import { SendManagersModal } from "../../../app/components/SendManagersModal";

/**
 * Ações do relatório (Copiar / Enviar pros gestores / PDF / Drive).
 * Operam sobre o recorte filtrado (`filtered`) para Copiar e Enviar pros
 * gestores; PDF e Drive são gerados no backend por data e mantêm o
 * comportamento anterior (dia inteiro).
 */
export function ReportActions() {
  const { filtered, date } = useReport();
  const { config: driveConfig, save: saveDriveConfig } = useDriveFolder();
  const whatsappAgent = useWhatsAppAgent();

  const [copied, setCopied] = useState<false | "padrao" | "whatsapp">(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [sendingToDrive, setSendingToDrive] = useState(false);
  const [driveSent, setDriveSent] = useState(false);
  const [showSendManagers, setShowSendManagers] = useState(false);
  const [showWhatsAppConnect, setShowWhatsAppConnect] = useState(false);

  const canActions = filtered.length > 0;
  const report = useMemo(() => buildDailyReport(filtered, date), [filtered, date]);

  const { data: baseResponsaveis = [] } = useQuery({
    queryKey: ["base-responsaveis"],
    queryFn: baseResponsaveisApi.list,
  });
  const managerReport = useMemo(
    () => groupOccurrencesByManager(filtered, baseResponsaveis),
    [filtered, baseResponsaveis],
  );

  async function handleCopiar(formato: "padrao" | "whatsapp") {
    if (!canActions) return;
    setShowCopyMenu(false);
    await navigator.clipboard.writeText(
      formato === "whatsapp" ? report.textForWhatsApp : report.textForCopy,
    );
    setCopied(formato);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExportarPDF() {
    if (!canActions || exportingPdf) return;
    setExportingPdf(true);
    try {
      const blob = await getDailyReportPdf(date);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const [yy, mm, dd] = date.split("-");
      a.download = `${dd}.${mm}.${yy} - RELATORIO DIARIO MONITORAMENTO.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Falha ao gerar PDF: ${(e as Error)?.message ?? "erro desconhecido"}`);
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleSendToDrive({
    config,
    accessToken,
    saveAsDefault,
  }: {
    config: DriveFolderConfig;
    accessToken: string;
    saveAsDefault: boolean;
  }) {
    if (saveAsDefault) saveDriveConfig(config);
    setShowDrivePicker(false);
    setSendingToDrive(true);
    setDriveSent(false);
    try {
      await reportsDriveApi.sendDailyReportToDrive({
        date,
        accessToken,
        folderId: config.folderId,
      });
      setDriveSent(true);
      setTimeout(() => setDriveSent(false), 4000);
    } catch (e) {
      alert(`Falha ao enviar para o Drive: ${(e as Error)?.message ?? "erro desconhecido"}`);
    } finally {
      setSendingToDrive(false);
    }
  }

  function handleAbrirEnvioGestores() {
    if (!canActions) return;
    if (!whatsappAgent.connected) {
      setShowWhatsAppConnect(true);
      return;
    }
    setShowSendManagers(true);
  }

  async function handleEnviarParaGestor(
    group: (typeof managerReport.groups)[number],
    message: string,
  ) {
    await whatsappAgentApi.send({ phone: group.telefone, message, banner: "gestor" });
  }

  const btnBase =
    "cursor-pointer h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors";

  return (
    <>
      {/* Copiar + dropdown */}
      <div className="relative">
        <div
          className={cn(
            "flex items-center rounded-lg border overflow-hidden",
            canActions
              ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950",
          )}
        >
          <button
            onClick={() => handleCopiar("padrao")}
            disabled={!canActions}
            className={cn(
              "cursor-pointer h-8 px-3 text-xs font-medium flex items-center gap-1.5",
              canActions
                ? "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                : "text-gray-400 dark:text-gray-500 cursor-not-allowed",
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {copied === "whatsapp" ? "WhatsApp!" : "Copiado!"}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </>
            )}
          </button>
          <button
            onClick={() => canActions && setShowCopyMenu((v) => !v)}
            disabled={!canActions}
            className={cn(
              "cursor-pointer h-8 px-1.5 border-l text-xs flex items-center",
              canActions
                ? "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                : "border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed",
            )}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        {showCopyMenu && canActions && (
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
            <button
              onClick={() => handleCopiar("padrao")}
              className="cursor-pointer w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-gray-400" />
              Formato padrão
            </button>
            <button
              onClick={() => handleCopiar("whatsapp")}
              className="cursor-pointer w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5 text-green-500" />
              Formato WhatsApp
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleAbrirEnvioGestores}
        disabled={!canActions}
        title="Enviar lista de ocorrências do recorte atual pros gestores responsáveis"
        className={cn(
          btnBase,
          canActions
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed",
        )}
      >
        <Send className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">Gestores</span>
      </button>

      <button
        onClick={handleExportarPDF}
        disabled={!canActions || exportingPdf}
        className={cn(
          btnBase,
          canActions && !exportingPdf
            ? "bg-gray-800 text-white hover:bg-gray-900"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed",
        )}
        title="Baixar relatório diário em PDF (dia inteiro)"
      >
        <Printer className="w-3.5 h-3.5" />
        {exportingPdf ? "Gerando..." : "PDF"}
      </button>

      <button
        onClick={() => canActions && !driveSent && setShowDrivePicker(true)}
        disabled={!canActions || sendingToDrive}
        className={cn(
          btnBase,
          !canActions
            ? "bg-blue-100 dark:bg-blue-950/40 text-blue-300 cursor-not-allowed"
            : sendingToDrive
              ? "bg-blue-500 text-white cursor-not-allowed"
              : driveSent
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-blue-600 text-white hover:bg-blue-700",
        )}
        title={driveSent ? "Relatório enviado ao Drive" : "Enviar relatório diário para o Google Drive"}
      >
        {driveSent ? <Check className="w-3.5 h-3.5" /> : <CloudUpload className="w-3.5 h-3.5" />}
        {sendingToDrive ? "Enviando..." : driveSent ? "Enviado!" : "Drive"}
      </button>

      {showDrivePicker && (
        <DrivePickerModal
          currentConfig={driveConfig}
          onConfirm={handleSendToDrive}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
      {showWhatsAppConnect && (
        <WhatsAppConnectModal whatsappAgent={whatsappAgent} onClose={() => setShowWhatsAppConnect(false)} />
      )}
      {showSendManagers && (
        <SendManagersModal
          open
          groups={managerReport.groups}
          occByBase={managerReport.occByBase}
          reportDate={date}
          basesSemTelefone={managerReport.basesSemTelefone}
          baseCodesSemCadastro={managerReport.baseCodesSemCadastro}
          onSendOne={handleEnviarParaGestor}
          onClose={() => setShowSendManagers(false)}
        />
      )}
    </>
  );
}
