import { Camera, Clock } from "lucide-react";
import { Ocorrencia } from "../types";
import { BaseChip } from "./base-chip";

interface OcorrenciaCardProps {
  ocorrencia: Ocorrencia;
  onClick?: () => void;
}

function isViagemFull(
  v: Ocorrencia["viagem"],
): v is Extract<Ocorrencia["viagem"], { prefixo: string }> {
  return typeof (v as any).prefixo === "string";
}

export function OcorrenciaCard({ ocorrencia, onClick }: OcorrenciaCardProps) {
  const tempoParada = calcularTempoParada(
    ocorrencia.horarioInicial,
    ocorrencia.horarioFinal,
  );

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-lg text-gray-900">
            {isViagemFull(ocorrencia.viagem)
              ? ocorrencia.viagem.prefixo
              : ocorrencia.viagem.id}
          </span>

          <BaseChip base={ocorrencia.motorista1.base} />
        </div>

        <p className="text-sm text-gray-600">
          {isViagemFull(ocorrencia.viagem)
            ? `Linha ${ocorrencia.viagem.linha}`
            : `${ocorrencia.viagem.codigoLinha} - ${ocorrencia.viagem.nomeLinha}`}
        </p>

        {ocorrencia.evidencias.length > 0 && (
          <div className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded">
            <Camera className="w-4 h-4" />
            <span className="text-sm font-medium">
              {ocorrencia.evidencias.length}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>
            {ocorrencia.horarioInicial} - {ocorrencia.horarioFinal}
          </span>
          <span className="text-gray-400">({tempoParada})</span>
        </div>

        <p className="text-sm text-gray-600">📍 {ocorrencia.localParada}</p>

        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
          {ocorrencia.motorista1.nome}
          {ocorrencia.motorista2 && ` • ${ocorrencia.motorista2.nome}`}
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

  if (horas > 0) {
    return `${horas}h ${minutos}min`;
  }
  return `${minutos}min`;
}
