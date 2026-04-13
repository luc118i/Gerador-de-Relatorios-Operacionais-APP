import { useCallback, useMemo, useRef, useState } from "react";
import { FileDown, Copy, Check, Loader2 } from "lucide-react";
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

type Status = "idle" | "generating" | "ready" | "error";

type DriverSnapshot = {
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
  const { occurrenceId, occurrenceTitle, eventDate, driver, driveContext, getOrCreateSignedUrl } = props;

  const [status, setStatus] = useState<Status>("idle");
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSent, setDriveSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cachedBlobRef = useRef<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fileName = useMemo(
    () => buildDriverPdfFileName({ registry: driver.registry, name: driver.name, base: driver.base ?? "", occurrenceTitle }),
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
      case "idle":      return { label: "idle",    cls: "border-slate-200 bg-slate-50 text-slate-700" };
      case "generating":return { label: "gerando", cls: "border-amber-200 bg-amber-50 text-amber-800" };
      case "ready":     return { label: "pronto",  cls: "border-emerald-200 bg-emerald-50 text-emerald-700" };
      case "error":     return { label: "erro",    cls: "border-red-200 bg-red-50 text-red-700" };
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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              Motorista {String(driver.position).padStart(2, "0")}
            </span>
            <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>

          <h3 className="mt-2 text-sm font-semibold text-gray-900 truncate">
            {driver.registry} — {driver.name}
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Base: <span className="font-medium text-gray-800">{driver.base ?? "—"}</span>
          </p>

          <div className="mt-2 flex items-center gap-2 group">
            <p className="text-xs text-gray-500 truncate" title={fileName}>
              Arquivo: <span className="font-medium text-gray-700">{fileName}</span>
            </p>
            <button
              type="button"
              onClick={handleCopyName}
              className="cursor-pointer p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
              title="Copiar nome"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {status === "error" && errorMsg ? (
            <p className="mt-2 text-xs text-red-700">{errorMsg}</p>
          ) : null}
        </div>

        {/* Ações */}
        <div className="shrink-0 flex items-center gap-2">
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
                ? "px-3 gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default"
                : "cursor-pointer w-10 border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50",
            ].join(" ")}
          >
            {driveLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
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
