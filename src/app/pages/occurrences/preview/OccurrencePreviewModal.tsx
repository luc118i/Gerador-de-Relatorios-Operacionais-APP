import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, FileText, MapPin, Clock, User, UserCheck, Lock, ChevronDown, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { occurrencesApi } from "../../../../api/occurrences.api";
import type { OccurrenceDTO } from "../../../../domain/occurrences";
import { useGetOccurrencePdf } from "../../../../features/reportsPdf/queries/reportsPdf.queries";
import { getApiErrorMessage } from "../../../../api/http";
import { TratativaSelect, type TratativaKey } from "../../../components/TratativaSelect";
import { useAuth } from "../../../context/AuthContext";

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

  // No OccurrencePreviewModal.tsx
  const {
    data: occ,
    isLoading,
    isError,
    error,
  } = useQuery<OccurrenceDTO>({
    queryKey: ["occurrence", occurrenceId],
    queryFn: () => occurrencesApi.getOccurrenceById(occurrenceId!),
    enabled: !!occurrenceId && open && occurrenceId.length > 10,
    staleTime: 0,      // sempre busca dado fresco ao abrir o modal
    retry: false,
  });

  // Use o useEffect para monitorar erros durante o desenvolvimento
  useEffect(() => {
    if (isError) {
      console.error("Erro detalhado da query:", error);
    }
  }, [isError, error]);
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
        force: true,
      });

      const signedUrl = res.data.pdf.signedUrl;
      const blob = await fetchBlobFromUrl(signedUrl);

      const d1 = occ.drivers?.[0];
      const fileName = buildDriverPdfFileName({
        registry: d1?.registry,
        name: d1?.name,
        base: d1?.baseCode,
        occurrenceTitle: (occ.typeCode === "GENERICO" && (occ as any).reportTitle)
          ? (occ as any).reportTitle
          : occ.typeTitle,
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
                  ? occ.startTime === occ.endTime
                    ? `${occ.startTime} • ${occ.eventDate}`
                    : `${occ.startTime} — ${occ.endTime} • ${occ.eventDate}`
                  : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={!occurrenceId || !occ || getPdf.isPending}
                className="cursor-pointer h-8 px-3 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-800 disabled:opacity-60 flex items-center gap-2"
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
                  {occ.typeCode === "EXCESSO_VELOCIDADE" ? (
                    <div className="rounded-xl bg-white border border-black/10 p-4">
                      <p className="text-xs text-gray-500">Velocidade</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {occ.speedKmh ? `${occ.speedKmh} km/h` : "—"}
                      </p>
                    </div>
                  ) : occ.typeCode === "GENERICO" ? (
                    <div className="rounded-xl bg-white border border-black/10 p-4">
                      <p className="text-xs text-gray-500">Nome do Relatório</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {(occ as any).reportTitle ?? "—"}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white border border-black/10 p-4">
                      <p className="text-xs text-gray-500">Local</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {occ.place ?? "—"}
                      </p>
                    </div>
                  )}

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

                  {occ.typeCode === "EXCESSO_VELOCIDADE" ? (
                    <InfoRow
                      icon={Clock}
                      label="Horário do Evento"
                      value={occ.startTime}
                    />
                  ) : (
                    <InfoRow
                      icon={Clock}
                      label={occ.typeCode === "GENERICO" ? "Horário" : "Duração"}
                      value={
                        occ.typeCode === "GENERICO"
                          ? occ.startTime
                          : formatTimeRangeWithDuration(occ.startTime, occ.endTime)
                      }
                    />
                  )}

                  {occ.typeCode === "GENERICO" && (
                    <>
                      {(occ as any).ccoOperator && (
                        <InfoRow
                          icon={User}
                          label="Operador CCO"
                          value={(occ as any).ccoOperator}
                        />
                      )}
                      {(occ as any).passengerCount != null && (
                        <InfoRow
                          icon={MapPin}
                          label="Passageiros"
                          value={String((occ as any).passengerCount)}
                        />
                      )}
                    </>
                  )}

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-black/10">
                    <span className="text-gray-500">Evidências</span>
                    <span className="font-medium text-gray-900">
                      {occ.evidenceCount}
                    </span>
                  </div>
                </div>

                <TratativaBlock occ={occ} />
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-black/10 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="cursor-pointer h-9 px-4 rounded-lg bg-white border border-black/10 hover:bg-gray-50 text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Bloco de Análise e Tratativa dentro do preview da ocorrência.
 * Permite definir a tratativa (Suspensão / Advertência / Vale / Só o Registro)
 * e uma justificativa opcional, persistindo via PATCH /occurrences/:id/tratativa.
 * O analista é preenchido automaticamente com o usuário logado.
 */
function TratativaBlock({ occ }: { occ: OccurrenceDTO }) {
  const { profileName } = useAuth();
  const qc = useQueryClient();

  const [tratativa, setTratativa] = useState<TratativaKey | null>(
    (occ.tratativa as TratativaKey) ?? null,
  );
  const [analista, setAnalista] = useState(occ.analisadoPor ?? "");
  const [justificativa, setJustificativa] = useState(occ.justificativaRegistro ?? "");
  const [showJustificativa, setShowJustificativa] = useState(
    () => (occ.justificativaRegistro ?? "").trim().length > 0,
  );
  const [justificativaDirty, setJustificativaDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Preenche o analista com o usuário logado quando ainda não há um.
  useEffect(() => {
    if (!analista && profileName) setAnalista(profileName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileName]);

  async function persist(t: TratativaKey | null, j: string) {
    const apurador = (profileName || analista).trim();
    setAnalista(apurador);
    setSaveState("saving");
    try {
      await occurrencesApi.patchTratativa(occ.id, t, apurador || null, j.trim() || null);
      setSaveState("saved");
      void qc.invalidateQueries({ queryKey: ["occurrence", occ.id] });
      void qc.invalidateQueries({ queryKey: ["occurrences"] });
      setTimeout(() => setSaveState("idle"), 1800);
    } catch (e) {
      setSaveState("idle");
      toast.error(getApiErrorMessage(e, "Falha ao salvar tratativa"));
    }
  }

  function handleJustificativaBlur() {
    if (!justificativaDirty) return;
    setJustificativaDirty(false);
    void persist(tratativa, justificativa);
  }

  return (
    <div className="rounded-xl bg-white border border-black/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Análise e Tratativa</p>
        {saveState === "saving" && (
          <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin" />
        )}
        {saveState === "saved" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
            <Check className="w-3.5 h-3.5" /> Salvo
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <TratativaSelect
          value={tratativa}
          onChange={(val) => {
            setTratativa(val);
            if (val === null) setShowJustificativa(false);
            void persist(val, justificativa);
          }}
        />

        <div
          className="relative w-44"
          title="Preenchido automaticamente pelo seu perfil"
        >
          <UserCheck className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 pointer-events-none" />
          <div className="text-xs pl-6 pr-6 py-1.5 border border-gray-100 rounded-lg w-full bg-gray-50 text-gray-600 truncate">
            {analista || <span className="text-gray-300">Quem apurou</span>}
          </div>
          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-300 pointer-events-none" />
        </div>

        {tratativa !== null && (
          <button
            type="button"
            onClick={() => setShowJustificativa((v) => !v)}
            className={`flex items-center gap-0.5 text-[11px] transition-colors cursor-pointer ${
              justificativa.trim()
                ? "text-amber-600 hover:text-amber-800 font-medium"
                : "text-gray-400 hover:text-gray-500"
            }`}
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-150 ${showJustificativa ? "rotate-180" : ""}`}
            />
            Justificativa
          </button>
        )}
      </div>

      {tratativa !== null && showJustificativa && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 shrink-0">Justificativa:</span>
          <input
            type="text"
            value={justificativa}
            placeholder="Ex: falha do comercial, veículo quebrado..."
            onChange={(e) => {
              setJustificativa(e.target.value);
              setJustificativaDirty(true);
            }}
            onBlur={handleJustificativaBlur}
            className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 placeholder:text-gray-300 bg-white"
          />
        </div>
      )}
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
