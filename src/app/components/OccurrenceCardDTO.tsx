import { Camera, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { BaseChip } from "./base-chip";

interface OccurrenceCardProps {
  occurrence: OccurrenceDTO;
  onOpen?: () => void;
  onEditar?: () => Promise<void> | void; // ✅ aceita async
  onExcluir?: () => void;
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

export function OccurrenceCard({
  occurrence,
  onOpen,
  onEditar,
  onExcluir,
}: OccurrenceCardProps) {
  const [loadingEdit, setLoadingEdit] = useState(false);

  const tempoParada = calcularTempoParada(
    occurrence.startTime,
    occurrence.endTime,
  );
  const driver1 = occurrence.drivers?.find((d) => d.position === 1);
  const driver2 = occurrence.drivers?.find((d) => d.position === 2);

  async function handleEditar() {
    if (!onEditar) return;
    setLoadingEdit(true);
    try {
      await onEditar();
    } finally {
      setLoadingEdit(false);
    }
  }

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
          <p className="text-sm text-gray-600">
            {occurrence.typeCode === "GENERICO"
              ? (occurrence as any).reportTitle || occurrence.typeTitle
              : occurrence.lineLabel
              ? occurrence.lineLabel
              : occurrence.typeTitle}
          </p>
        </div>
        {occurrence.evidenceCount > 0 && (
          <div className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded">
            <Camera className="w-4 h-4" />
            <span className="text-sm font-medium">
              {occurrence.evidenceCount}
            </span>
          </div>
        )}
      </div>

      {/* Corpo */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock className="w-4 h-4 text-gray-400" />
          {occurrence.typeCode === "EXCESSO_VELOCIDADE" ? (
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
        className="flex gap-2 mt-3 pt-3 border-t border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
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
    </div>
  );
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
