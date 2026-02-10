import { Camera, Clock } from "lucide-react";
import { BaseChip } from "./base-chip";
import type { OccurrenceDTO } from "../../domain/occurrences";

interface OccurrenceCardDTOProps {
  occurrence: OccurrenceDTO;
  onClick?: () => void;
}

export function OccurrenceCardDTO({
  occurrence,
  onClick,
}: OccurrenceCardDTOProps) {
  const tempoParada = calcularTempoParada(
    occurrence.startTime,
    occurrence.endTime,
  );

  const driver1 = occurrence.drivers?.find((d) => d.position === 1);
  const driver2 = occurrence.drivers?.find((d) => d.position === 2);

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-lg text-gray-900">
              {occurrence.vehicleNumber}
            </span>

            {/* Chip de base (código). Se quiser nome, troco pra driver1?.baseCode */}
            <BaseChip base={driver1?.baseCode ?? occurrence.baseCode} />
          </div>

          <p className="text-sm text-gray-600">
            {occurrence.lineLabel
              ? `Linha ${occurrence.lineLabel}`
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

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>
            {occurrence.startTime} - {occurrence.endTime}
          </span>
          <span className="text-gray-400">({tempoParada})</span>
        </div>

        <p className="text-sm text-gray-600">📍 {occurrence.place}</p>

        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
          {driver1?.name ?? "—"}
          {driver2?.name ? ` • ${driver2.name}` : ""}
        </div>
      </div>
    </div>
  );
}

function calcularTempoParada(inicio: string, fim: string): string {
  const [hI, mI] = inicio.split(":").map(Number);
  const [hF, mF] = fim.split(":").map(Number);

  const totalMinutosInicio = hI * 60 + mI;
  const totalMinutosFim = hF * 60 + mF;
  const diff = totalMinutosFim - totalMinutosInicio;

  const horas = Math.floor(diff / 60);
  const minutos = diff % 60;

  if (horas > 0) return `${horas}h ${minutos}min`;
  return `${minutos}min`;
}
