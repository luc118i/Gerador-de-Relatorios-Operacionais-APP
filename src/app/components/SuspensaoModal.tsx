import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { reportsPdfApi } from "../../api/reportsPdf.api";
import type { OccurrenceDTO } from "../../domain/occurrences";

interface SuspensaoModalProps {
  occurrence: OccurrenceDTO;
  onClose: () => void;
}

function fmtDdMm(iso: string): string {
  const [, m, d] = (iso ?? "").split("-");
  if (!m || !d) return iso;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}`;
}

function buildWppText(occurrence: OccurrenceDTO, dataInicio: string): string {
  const d1 = occurrence.drivers?.find((d) => d.position === 1);
  const motoristaParts: string[] = [];
  if (d1?.registry) motoristaParts.push(d1.registry);
  if (d1?.name)     motoristaParts.push(d1.name);
  if (d1?.baseCode) motoristaParts.push(d1.baseCode);
  const motorista = motoristaParts.join(" - ") || "—";

  return `Relatório de Suspensão

Motivo: *${occurrence.typeTitle ?? occurrence.typeCode ?? "—"}*
👨‍✈️ Motorista: \`${motorista}\`
🗓️ Data da suspensão: *${fmtDdMm(dataInicio)}*
🗓️ Data da Ocorrência: *${fmtDdMm(occurrence.eventDate)}*
❗Email enviado`;
}

export function SuspensaoModal({ occurrence, onClose }: SuspensaoModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(today);
  const [quantidadeDias, setQuantidadeDias] = useState(1);
  const [loading, setLoading] = useState(false);

  async function handleGerar() {
    if (!dataInicio) {
      toast.error("Informe a data de início da suspensão.");
      return;
    }
    if (quantidadeDias < 1 || quantidadeDias > 30) {
      toast.error("Quantidade de dias deve ser entre 1 e 30.");
      return;
    }

    setLoading(true);
    try {
      const blob = await reportsPdfApi.getSuspensaoPdf({
        occurrenceId: occurrence.id,
        dataInicioSuspensao: dataInicio,
        quantidadeDias,
      });

      // Dispara o download do PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `suspensao-${dataInicio}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Copia o texto padrão para mensagens
      const texto = buildWppText(occurrence, dataInicio);
      await navigator.clipboard.writeText(texto);

      toast.success("PDF gerado e texto copiado!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao gerar PDF de suspensão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Gerar Suspensão Disciplinar</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Data de início da suspensão
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Quantidade de dias
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={quantidadeDias}
              onChange={(e) => setQuantidadeDias(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGerar}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar PDF"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
