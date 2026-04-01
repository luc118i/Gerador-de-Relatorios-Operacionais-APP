import { Camera, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import { Ocorrencia } from "../types";
import { BaseChip } from "./base-chip";
import { useState } from "react";

interface OcorrenciaCardProps {
  ocorrencia: Ocorrencia;
  onClick?: () => void;
  onEditar?: () => void;
  onExcluir?: () => void;
}

export function OcorrenciaCard({
  ocorrencia,
  onClick,
  onEditar,
  onExcluir,
}: OcorrenciaCardProps) {
  const [loadingEdit, setLoadingEdit] = useState(false);
  const tempoParada =
    ocorrencia.horarioInicial && ocorrencia.horarioFinal
      ? calcularTempoParada(ocorrencia.horarioInicial, ocorrencia.horarioFinal)
      : "—";

  const viagem = ocorrencia.viagem;
  const identificadorViagem = viagem.prefixo || viagem.id || "N/A";
  const descricaoLinha = viagem.linha
    ? `Linha ${viagem.linha}`
    : viagem.codigoLinha
      ? `${viagem.codigoLinha} - ${viagem.nomeLinha || ""}`
      : "Linha não identificada";

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
      className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={onClick}
    >
      {/* ✅ Botões aparecem no hover */}
      <div
        className="absolute top-3 right-3 hidden group-hover:flex gap-1"
        onClick={(e) => e.stopPropagation()} // não dispara o onClick do card
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
          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-lg text-gray-900">
            {identificadorViagem}
          </span>
          <BaseChip base={ocorrencia.motorista1.base} />
        </div>
        <p className="text-sm text-gray-600">{descricaoLinha}</p>
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
          {ocorrencia.typeCode === "EXCESSO_VELOCIDADE" ? (
            <span>{ocorrencia.horarioInicial}</span>
          ) : (
            <>
              <span>
                {ocorrencia.horarioInicial} - {ocorrencia.horarioFinal}
              </span>
              <span className="text-gray-400">({tempoParada})</span>
            </>
          )}
        </div>

        {ocorrencia.typeCode === "EXCESSO_VELOCIDADE" ? (
          <p className="text-sm text-gray-600">
            🏎️{" "}
            <span className="font-semibold text-gray-800">
              {ocorrencia.speedKmh ? `${ocorrencia.speedKmh} km/h` : "—"}
            </span>
          </p>
        ) : (
          <p className="text-sm text-gray-600">📍 {ocorrencia.localParada}</p>
        )}

        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
          {ocorrencia.motorista1.nome}
          {ocorrencia.motorista2 && ` • ${ocorrencia.motorista2.nome}`}
        </div>
      </div>
    </div>
  );
}

function calcularTempoParada(inicio?: string, fim?: string) {
  if (!inicio || !fim) return "—";

  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);

  const inicioMin = h1 * 60 + m1;
  const fimMin = h2 * 60 + m2;

  const diff = fimMin - inicioMin;

  if (diff < 0) return "—";

  const h = Math.floor(diff / 60);
  const m = diff % 60;

  return `${h}h ${m}m`;
}
