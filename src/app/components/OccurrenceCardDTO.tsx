import {
  Camera,
  Clock,
  FileText,
  Loader2,
  MessageCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { OccurrenceDTO } from "../../domain/occurrences";
import type { Ocorrencia } from "../types";
import {
  gerarTextoRelatorioIndividual,
  gerarTextoWhatsApp,
} from "../utils/relatorio";
import { getBaseCanonicalKey, resolveBaseSigla } from "../utils/base";
import { BaseChip } from "./base-chip";

interface OccurrenceCardProps {
  occurrence: OccurrenceDTO;
  onOpen?: () => void;
  onEditar?: () => Promise<void> | void;
  onExcluir?: () => void;
  compact?: boolean;
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

export function OccurrenceCard({
  occurrence,
  onOpen,
  onEditar,
  onExcluir,
  compact = false,
}: OccurrenceCardProps) {
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [copiedWpp, setCopiedWpp] = useState(false);
  const [copiedRelat, setCopiedRelat] = useState(false);

  const tempoParada = calcularTempoParada(
    occurrence.startTime,
    occurrence.endTime,
  );
  const driver1 = occurrence.drivers?.find((d) => d.position === 1);
  const driver2 = occurrence.drivers?.find((d) => d.position === 2);

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
    if (!onEditar) return;
    setLoadingEdit(true);
    try {
      await onEditar();
    } finally {
      setLoadingEdit(false);
    }
  }

  async function handleCopyWpp(e: React.MouseEvent) {
    e.stopPropagation();
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
      <div
        className="group flex items-center gap-0 bg-white border-b border-gray-100 hover:bg-blue-50/40 transition-colors cursor-pointer"
        style={{ borderLeft: `3px solid ${baseColor}` }}
        onClick={onOpen}
      >
        {/* Prefixo */}
        <div className="w-[70px] flex-shrink-0 px-3 py-2.5">
          <span className="font-bold text-sm text-gray-900 tabular-nums">
            {occurrence.vehicleNumber}
          </span>
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
          <span className="text-sm text-gray-800 truncate block leading-tight">
            {subjectTitle}
          </span>
          {subjectDetail && (
            <span className="text-[11px] text-gray-400 truncate block leading-tight">
              {subjectDetail}
            </span>
          )}
        </div>

        {/* Horário */}
        <div className="w-[115px] flex-shrink-0 px-2 py-2.5 hidden sm:flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-300 flex-shrink-0" />
          <span className="text-xs text-gray-500 tabular-nums">
            {occurrence.typeCode === "EXCESSO_VELOCIDADE" || occurrence.startTime === occurrence.endTime
              ? occurrence.startTime
              : `${occurrence.startTime} – ${occurrence.endTime}`}
          </span>
        </div>

        {/* Motorista(s) */}
        <div className="w-[170px] flex-shrink-0 px-2 py-2.5 hidden lg:block">
          <span className="text-xs text-gray-500 truncate block">
            {driver1?.name ?? "—"}
            {driver2?.name ? ` · ${driver2.name}` : ""}
          </span>
        </div>

        {/* Ações */}
        <div
          className="flex items-center gap-0 flex-shrink-0 px-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCopyWpp}
            title="Copiar WhatsApp"
            className={`p-2 rounded transition-colors ${
              copiedWpp ? "text-green-600" : "text-gray-400 hover:text-green-600 hover:bg-green-50"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopyRelat}
            title="Copiar Relatório Individual"
            className={`p-2 rounded transition-colors ${
              copiedRelat ? "text-green-600" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleEditar(); }}
            disabled={loadingEdit}
            title="Editar"
            className="p-2 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {loadingEdit
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Pencil className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onExcluir?.(); }}
            title="Excluir"
            className="p-2 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ── Modo card ──────────────────────────────────────────────────────────────
  return (
    <div
      className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onOpen}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-lg text-gray-900">
              {occurrence.vehicleNumber}
            </span>
            <BaseChip base={driver1?.baseCode ?? occurrence.baseCode} />
          </div>
          <p className="text-sm text-gray-600">{subject}</p>
        </div>
        {occurrence.evidenceCount > 0 && (
          <div className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded">
            <Camera className="w-4 h-4" />
            <span className="text-sm font-medium">{occurrence.evidenceCount}</span>
          </div>
        )}
      </div>

      {/* Corpo */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock className="w-4 h-4 text-gray-400" />
          {occurrence.typeCode === "EXCESSO_VELOCIDADE" || occurrence.startTime === occurrence.endTime ? (
            <span>{occurrence.startTime}</span>
          ) : (
            <>
              <span>
                {occurrence.startTime} - {occurrence.endTime}
              </span>
              <span className="text-gray-400">({tempoParada})</span>
            </>
          )}
        </div>

        {occurrence.typeCode === "EXCESSO_VELOCIDADE" ? (
          <p className="text-sm text-gray-600">
            🏎️{" "}
            <span className="font-semibold text-gray-800">
              {occurrence.speedKmh ? `${occurrence.speedKmh} km/h` : "—"}
            </span>
          </p>
        ) : occurrence.typeCode === "GENERICO" ? (
          <p className="text-sm text-gray-600">📋 {occurrence.place || "—"}</p>
        ) : (
          <p className="text-sm text-gray-600">📍 {occurrence.place}</p>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
          {driver1?.name ?? "—"}
          {driver2?.name ? ` • ${driver2.name}` : ""}
        </div>
      </div>

      {/* Rodapé com botões */}
      <div
        className="mt-3 pt-3 border-t border-gray-100 space-y-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Linha 1: Editar + Excluir */}
        <div className="flex gap-2">
          <button
            onClick={handleEditar}
            disabled={loadingEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
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
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>

        {/* Linha 2: Copiar WhatsApp + Copiar Relatório */}
        <div className="flex gap-2">
          <button
            onClick={handleCopyWpp}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-colors ${
              copiedWpp
                ? "text-green-700 bg-green-50"
                : "text-gray-500 hover:text-green-700 hover:bg-green-50"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {copiedWpp ? "Copiado!" : "WhatsApp"}
          </button>
          <button
            onClick={handleCopyRelat}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-colors ${
              copiedRelat
                ? "text-green-700 bg-green-50"
                : "text-gray-500 hover:text-blue-700 hover:bg-blue-50"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {copiedRelat ? "Copiado!" : "Relatório"}
          </button>
        </div>
      </div>
    </div>
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
