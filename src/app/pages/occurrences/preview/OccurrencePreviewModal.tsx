import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, FileText, MapPin, Clock, User } from "lucide-react";
import { toast } from "sonner";

import { occurrencesApi } from "../../../../api/occurrences.api";
import type { OccurrenceDTO } from "../../../../domain/occurrences";
import { useGetOccurrencePdf } from "../../../../features/reportsPdf/queries/reportsPdf.queries";
import { getApiErrorMessage } from "../../../../api/http";

import { formatTimeRangeWithDuration } from "../../../utils/time";

import {
  buildDriverPdfFileName,
  fetchBlobFromUrl,
  downloadBlob,
} from "../../../../utils/pdfDownload";

type Props = {
  occurrenceId: string | null;
  open: boolean;
  onClose: () => void;
};

export function OccurrencePreviewModal({ occurrenceId, open, onClose }: Props) {
  const getPdf = useGetOccurrencePdf();

  const {
    data: occ,
    isLoading,
    isError,
  } = useQuery<OccurrenceDTO>({
    queryKey: ["occurrence", occurrenceId],
    queryFn: () => occurrencesApi.getOccurrenceById(occurrenceId!),
    enabled: !!occurrenceId && open,
  });

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function handleDownloadPdf() {
    if (!occurrenceId || !occ) return;

    try {
      const res = await getPdf.mutateAsync({
        occurrenceId,
        ttlSeconds: 3600,
        force: false,
      });

      const signedUrl = res.data.pdf.signedUrl;
      const blob = await fetchBlobFromUrl(signedUrl);

      const d1 = occ.drivers?.[0];
      const fileName = buildDriverPdfFileName({
        registry: d1?.registry,
        name: d1?.name,
        base: d1?.baseCode,
        occurrenceTitle: occ.typeTitle,
        eventDate: occ.eventDate,
      });

      downloadBlob(blob, fileName);
      toast.success("PDF baixado!");
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Falha ao baixar PDF"));
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <div
          className="w-full max-w-3xl rounded-2xl bg-gray-100 shadow-2xl border border-black/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-black/10 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {occ
                  ? `${occ.vehicleNumber} • ${occ.lineLabel ?? "—"}`
                  : "Ocorrência"}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                {occ
                  ? `${occ.startTime} — ${occ.endTime} • ${occ.eventDate}`
                  : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={!occurrenceId || !occ || getPdf.isPending}
                className="h-8 px-3 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-800 disabled:opacity-60 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {getPdf.isPending ? "Baixando…" : "Baixar PDF"}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {isLoading ? (
              <p className="text-sm text-gray-600">Carregando…</p>
            ) : isError ? (
              <p className="text-sm text-red-600">
                Falha ao carregar a ocorrência.
              </p>
            ) : occ ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white border border-black/10 p-4">
                    <p className="text-xs text-gray-500">Local</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {occ.place ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white border border-black/10 p-4">
                    <p className="text-xs text-gray-500">Tipo</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {occ.typeTitle}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-black/10 p-4 space-y-3">
                  <InfoRow
                    icon={User}
                    label="Motoristas"
                    value={
                      occ.drivers?.length
                        ? occ.drivers
                            .map(
                              (d) =>
                                `${d.registry} - ${d.name} (${d.baseCode})`,
                            )
                            .join(" | ")
                        : "—"
                    }
                  />

                  <InfoRow
                    icon={Clock}
                    label="Duração"
                    value={formatTimeRangeWithDuration(
                      occ.startTime,
                      occ.endTime,
                    )}
                  />

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-black/10">
                    <span className="text-gray-500">Evidências</span>
                    <span className="font-medium text-gray-900">
                      {occ.evidenceCount}
                    </span>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-black/10 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-white border border-black/10 hover:bg-gray-50 text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="w-4 h-4 mt-1 text-gray-500" />
      <div>
        <p className="text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
