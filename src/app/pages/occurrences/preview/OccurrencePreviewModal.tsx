import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  FileText,
  Bus,
  User,
  UserCheck,
  Lock,
  Paperclip,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { occurrencesApi } from "../../../../api/occurrences.api";
import { reportsDriveApi } from "../../../../api/reportsDrive.api";
import type { OccurrenceDTO } from "../../../../domain/occurrences";
import { useGetOccurrencePdf } from "../../../../features/reportsPdf/queries/reportsPdf.queries";
import { getApiErrorMessage } from "../../../../api/http";
import { TratativaSelect, type TratativaKey } from "../../../components/TratativaSelect";
import { useAuth } from "../../../context/AuthContext";
import { useDriveFolder } from "../../../../hooks/useDriveFolder";
import { requestDriveToken } from "../../../../utils/googleAuth";
import { getDriveLink, setDriveLink } from "../../../../utils/driveLinkCache";

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

/** Converte "YYYY-MM-DD" em "DD/MM/YYYY". */
function formatDateBR(date: string | undefined) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${d}/${m}/${y}`;
}

export function OccurrencePreviewModal({ occurrenceId, open, onClose }: Props) {
  const getPdf = useGetOccurrencePdf();

  const {
    data: occ,
    isLoading,
    isError,
    error,
  } = useQuery<OccurrenceDTO>({
    queryKey: ["occurrence", occurrenceId],
    queryFn: () => occurrencesApi.getOccurrenceById(occurrenceId!),
    enabled: !!occurrenceId && open && occurrenceId.length > 10,
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (isError) console.error("Erro detalhado da query:", error);
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
        occurrenceTitle:
          occ.typeCode === "GENERICO" && (occ as any).reportTitle
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

  const tipoTitulo =
    occ?.typeCode === "GENERICO" && (occ as any).reportTitle
      ? ((occ as any).reportTitle as string)
      : occ?.typeTitle ?? "Ocorrência";

  const driver = occ?.drivers?.[0];

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
          className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-gray-50 shadow-2xl border border-black/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-black/5 bg-white flex items-start justify-between gap-4 shrink-0">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-gray-900 truncate">
                {occ
                  ? `${occ.vehicleNumber} • ${occ.lineLabel ?? "—"}`
                  : "Ocorrência"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {occ
                  ? `${formatDateBR(occ.eventDate)} às ${occ.startTime}`
                  : ""}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {occ && <StatusBadge tratativa={occ.tratativa ?? null} />}
              <button
                onClick={handleDownloadPdf}
                disabled={!occurrenceId || !occ || getPdf.isPending}
                className="cursor-pointer h-8 px-3 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 disabled:opacity-60 flex items-center gap-1.5 transition-colors"
              >
                {getPdf.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                {getPdf.isPending ? "Baixando…" : "Baixar PDF"}
              </button>
              <button
                onClick={onClose}
                className="cursor-pointer h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-gray-600">Carregando…</p>
            ) : isError ? (
              <p className="text-sm text-red-600">
                Falha ao carregar a ocorrência.
              </p>
            ) : occ ? (
              <>
                {/* Tipo de ocorrência em destaque */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Tipo de ocorrência
                    </p>
                    <p className="text-base font-semibold text-gray-900 truncate">
                      {tipoTitulo}
                    </p>
                  </div>
                </div>

                {/* Cards de info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Dados da viagem */}
                  <InfoCard icon={Bus} title="Dados da viagem">
                    <InfoLine label="Prefixo" value={occ.vehicleNumber} />
                    <InfoLine label="Linha" value={occ.lineLabel ?? "—"} />
                    <InfoLine label="Horário" value={occ.startTime} />
                  </InfoCard>

                  {/* Motorista */}
                  <InfoCard icon={User} title="Motorista">
                    {driver ? (
                      <>
                        <p className="text-[13px] font-semibold text-gray-900 leading-snug">
                          {driver.registry} - {driver.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Base: {driver.baseCode}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">Sem motorista</p>
                    )}
                  </InfoCard>

                  {/* Evidências */}
                  <InfoCard icon={Paperclip} title="Evidências">
                    <p className="text-xs text-gray-500">
                      {occ.evidenceCount}{" "}
                      {occ.evidenceCount === 1
                        ? "evidência anexada"
                        : "evidências anexadas"}
                    </p>
                    <EvidenceViewerButton occ={occ} />
                  </InfoCard>
                </div>

                {/* Análise e Tratativa + Observações */}
                <TratativaBlock occ={occ} />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponentes                                                      */
/* ------------------------------------------------------------------ */

function StatusBadge({ tratativa }: { tratativa: TratativaKey | null }) {
  const tratada = tratativa !== null;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        tratada
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-600 border-rose-200"
      }`}
    >
      {tratada ? "TRATADA" : "ABERTA"}
    </span>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white border border-black/5 p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-gray-600 leading-relaxed">
      <span className="text-gray-400">{label}:</span>{" "}
      <span className="text-gray-800 font-medium">{value}</span>
    </p>
  );
}

/**
 * Botão "Visualizar evidências" que busca as URLs assinadas sob demanda
 * e abre uma galeria simples (thumbnails / links) inline.
 */
function EvidenceViewerButton({ occ }: { occ: OccurrenceDTO }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<
    Array<{ id: string; url: string; caption: string; linkTexto: string; linkUrl: string }>
  >([]);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (items.length === 0 && occ.evidenceCount > 0) {
      setLoading(true);
      try {
        const res = await occurrencesApi.getEvidenceSignedUrls(occ.id);
        setItems(res ?? []);
      } catch (e) {
        toast.error(getApiErrorMessage(e, "Falha ao carregar evidências"));
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={occ.evidenceCount === 0}
        className="mt-2 w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Paperclip className="w-3.5 h-3.5" />
        )}
        {open ? "Ocultar evidências" : "Visualizar evidências"}
      </button>

      {open && !loading && items.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {items.map((ev) => (
            <a
              key={ev.id}
              href={ev.linkUrl || ev.url}
              target="_blank"
              rel="noopener noreferrer"
              title={ev.caption || ev.linkTexto || "Evidência"}
              className="aspect-square rounded-md overflow-hidden border border-gray-200 bg-gray-50 hover:ring-2 hover:ring-gray-300 transition-all flex items-center justify-center"
            >
              {ev.url ? (
                <img
                  src={ev.url}
                  alt={ev.caption || "Evidência"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <FileText className="w-4 h-4 text-gray-400" />
              )}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Bloco de Análise e Tratativa + Observações adicionais.
 *
 * As edições ficam em rascunho local e só são persistidas via
 * PATCH /occurrences/:id/tratativa ao clicar em "Salvar tratativa".
 * O analista é preenchido automaticamente com o usuário logado.
 */
function TratativaBlock({ occ }: { occ: OccurrenceDTO }) {
  const { profileName } = useAuth();
  const qc = useQueryClient();

  const initialTratativa = (occ.tratativa as TratativaKey) ?? null;
  const initialObs = occ.justificativaRegistro ?? "";

  const [tratativa, setTratativa] = useState<TratativaKey | null>(initialTratativa);
  const [observacoes, setObservacoes] = useState(initialObs);
  const [analista, setAnalista] = useState(occ.analisadoPor ?? "");
  const [saving, setSaving] = useState(false);

  // Preenche o analista com o usuário logado quando ainda não há um.
  useEffect(() => {
    if (!analista && profileName) setAnalista(profileName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileName]);

  const dirty = useMemo(
    () => tratativa !== initialTratativa || observacoes !== initialObs,
    [tratativa, observacoes, initialTratativa, initialObs],
  );

  async function handleSave() {
    const apurador = (profileName || analista).trim();
    setAnalista(apurador);
    setSaving(true);
    try {
      await occurrencesApi.patchTratativa(
        occ.id,
        tratativa,
        apurador || null,
        observacoes.trim() || null,
      );
      toast.success("Tratativa salva!");
      void qc.invalidateQueries({ queryKey: ["occurrence", occ.id] });
      void qc.invalidateQueries({ queryKey: ["occurrences"] });
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Falha ao salvar tratativa"));
    } finally {
      setSaving(false);
    }
  }

  const obsLen = observacoes.length;
  const MAX_OBS = 500;

  return (
    <div className="space-y-4">
      {/* Caixa Análise e Tratativa */}
      <div className="rounded-xl bg-white border border-black/5 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-3">
          Análise e Tratativa
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <TratativaSelect value={tratativa} onChange={setTratativa} />

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
        </div>
      </div>

      {/* Relatório no Google Drive */}
      <DriveReportRow occ={occ} />

      {/* Observações adicionais */}
      <div className="rounded-xl bg-white border border-black/5 p-4">
        <p className="text-xs text-gray-500 mb-2">Observações adicionais</p>
        <textarea
          value={observacoes}
          maxLength={MAX_OBS}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Adicione observações sobre a ocorrência..."
          rows={3}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 placeholder:text-gray-300 bg-white"
        />
        <p className="text-right text-[11px] text-gray-400 mt-1">
          {obsLen}/{MAX_OBS}
        </p>
      </div>

      {/* Footer de ações */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setTratativa(initialTratativa);
            setObservacoes(initialObs);
          }}
          disabled={!dirty || saving}
          className="cursor-pointer h-9 px-4 rounded-lg bg-white border border-black/10 hover:bg-gray-50 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="cursor-pointer h-9 px-4 rounded-lg bg-gray-800 text-white text-sm hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Salvar tratativa
        </button>
      </div>
    </div>
  );
}

/** Logo do Google Drive (SVG). */
function DriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  );
}

/**
 * Linha do relatório no Google Drive.
 *
 * Se o relatório já foi enviado (link em cache), mostra "Abrir no Drive";
 * caso contrário, oferece o botão para enviar. O link é descoberto apenas no
 * envio (o backend não o retorna no DTO), então é persistido via driveLinkCache.
 */
function DriveReportRow({ occ }: { occ: OccurrenceDTO }) {
  const driveFolder = useDriveFolder();
  const [link, setLink] = useState<string | null>(() => getDriveLink(occ.id));
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (sending) return;

    if (!driveFolder.config) {
      toast.error(
        "Configure a pasta do Drive na tela inicial (botão Drive) antes de enviar.",
      );
      return;
    }

    setSending(true);
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
      const token = await requestDriveToken(clientId);

      const res = await reportsDriveApi.sendOccurrenceToDrive({
        occurrenceId: occ.id,
        accessToken: token,
        folderId: driveFolder.config.folderId,
        force: !!link, // já existia → atualiza o arquivo
      });

      const { webViewLink } = res.data.drive;
      setDriveLink(occ.id, webViewLink);
      setLink(webViewLink);
      toast.success(link ? "Relatório atualizado no Drive!" : "Relatório enviado ao Drive!");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Falha ao enviar ao Drive"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl bg-white border border-black/5 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <DriveIcon className="w-5 h-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-gray-700">Relatório no Drive</p>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Abrir no Drive <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-xs text-gray-400">Ainda não enviado</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        className={`shrink-0 cursor-pointer h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-60 ${
          link
            ? "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        {sending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : link ? (
          <RefreshCw className="w-3.5 h-3.5" />
        ) : (
          <DriveIcon className="w-4 h-4" />
        )}
        {sending ? "Enviando…" : link ? "Reenviar" : "Enviar ao Drive"}
      </button>
    </div>
  );
}
