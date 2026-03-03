// src/modules/ocorrencias/pages/preview/components/DriverPdfCard.tsx
import { useCallback, useMemo, useRef, useState } from "react";
import { FileDown, Copy, Check } from "lucide-react"; // Importação dos novos ícones
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../api/http";
import {
  buildDriverPdfFileName,
  downloadBlob,
  fetchBlobFromUrl,
} from "../../../../../utils/pdfDownload";

type Status = "idle" | "generating" | "ready" | "error";

type DriverSnapshot = {
  position: 1 | 2;
  registry: string;
  name: string;
  base?: string | null;
};

export function DriverPdfCard(props: {
  occurrenceId: string;
  occurrenceTitle: string;
  eventDate: string;
  driver: DriverSnapshot;
  getOrCreateSignedUrl: (args: {
    force?: boolean;
    reason: "driver-download";
  }) => Promise<{
    signedUrl: string;
    cached?: boolean | null;
    ttlSeconds?: number | null;
  }>;
}) {
  const { occurrenceTitle, eventDate, driver, getOrCreateSignedUrl } = props;

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false); // Estado para feedback visual da cópia

  const cachedBlobRef = useRef<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fileName = useMemo(() => {
    return buildDriverPdfFileName({
      registry: driver.registry,
      name: driver.name,
      base: driver.base ?? "",
      occurrenceTitle,
    });
  }, [driver.registry, driver.name, driver.base, occurrenceTitle, eventDate]);

  // Função para copiar o nome do arquivo sem a extensão .pdf
  const handleCopyName = useCallback(() => {
    const nameWithoutExtension = fileName.replace(/\.pdf$/i, "");
    navigator.clipboard.writeText(nameWithoutExtension);
    setCopied(true);
    toast.success("Nome copiado para a área de transferência!");

    setTimeout(() => setCopied(false), 2000); // Reseta o ícone após 2 segundos
  }, [fileName]);

  const statusBadge = useMemo(() => {
    switch (status) {
      case "idle":
        return {
          label: "idle",
          cls: "border-slate-200 bg-slate-50 text-slate-700",
        };
      case "generating":
        return {
          label: "gerando",
          cls: "border-amber-200 bg-amber-50 text-amber-800",
        };
      case "ready":
        return {
          label: "pronto",
          cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
        };
      case "error":
        return { label: "erro", cls: "border-red-200 bg-red-50 text-red-700" };
    }
  }, [status]);

  const handleDownload = useCallback(async () => {
    if (status === "generating") return;
    setStatus("generating");
    setErrorMsg(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const blob =
        cachedBlobRef.current ??
        (await (async () => {
          const { signedUrl } = await getOrCreateSignedUrl({
            reason: "driver-download",
            force: false,
          });
          const b = await fetchBlobFromUrl(signedUrl, ac.signal);
          cachedBlobRef.current = b;
          return b;
        })());

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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              Motorista {String(driver.position).padStart(2, "0")}
            </span>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${statusBadge.cls}`}
            >
              {statusBadge.label}
            </span>
          </div>

          <h3 className="mt-2 text-sm font-semibold text-gray-900 truncate">
            {driver.registry} — {driver.name}
          </h3>

          <p className="mt-1 text-xs text-gray-600">
            Base:{" "}
            <span className="font-medium text-gray-800">
              {driver.base ?? "—"}
            </span>
          </p>

          {/* Área do Nome do Arquivo com Botão de Cópia */}
          <div className="mt-2 flex items-center gap-2 group">
            <p className="text-xs text-gray-500 truncate" title={fileName}>
              Nome do arquivo:{" "}
              <span className="font-medium text-gray-700">{fileName}</span>
            </p>
            <button
              type="button"
              onClick={handleCopyName}
              className="cursor-pointer p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
              title="Copiar nome"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {status === "error" && errorMsg ? (
            <p className="mt-2 text-xs text-red-700">{errorMsg}</p>
          ) : null}
        </div>

        <div className="shrink-0 flex items-center gap-2">
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
