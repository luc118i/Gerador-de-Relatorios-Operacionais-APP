import { useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { reportsPdfApi } from "../../api/reportsPdf.api";
import type { OccurrenceDTO, OccurrenceDriverDTO } from "../../domain/occurrences";

interface SuspensaoModalProps {
  occurrence: OccurrenceDTO;
  onClose: () => void;
  onSuspensaoGerada?: (suspensao: { dataInicio: string; dias: number }) => void;
}

function fmtDdMm(iso: string): string {
  const [, m, d] = (iso ?? "").split("-");
  if (!m || !d) return iso;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}`;
}

function buildWppText(occurrence: OccurrenceDTO, dataInicio: string, dias: number): string {
  const d1 = occurrence.drivers?.find((d) => d.position === 1);
  const motoristaParts: string[] = [];
  if (d1?.registry) motoristaParts.push(d1.registry);
  if (d1?.name)     motoristaParts.push(d1.name);
  if (d1?.baseCode) motoristaParts.push(d1.baseCode);
  const motorista = motoristaParts.join(" - ") || "—";

  return `Relatório de Suspensão

Motivo: *${occurrence.typeTitle ?? occurrence.typeCode ?? "—"}*
👨‍✈️ Motorista: \`${motorista}\`
🗓️ Data da suspensão: *${fmtDdMm(dataInicio)}* (${dias} ${dias === 1 ? "dia" : "dias"})
🗓️ Data da Ocorrência: *${fmtDdMm(occurrence.eventDate)}*
❗Email enviado`;
}

function buildFilename(
  occurrence: OccurrenceDTO,
  d1: OccurrenceDriverDTO | undefined,
  tipoOcorrencia: string,
): string {
  const matricula = d1?.registry ?? "";
  const nome = d1?.name?.split(" ").slice(0, 2).join(" ") ?? "";
  const base = d1?.baseCode ?? "";
  const date = (occurrence.tripDate ?? occurrence.eventDate ?? "").replace(/-/g, ".");
  return [matricula, nome, base, tipoOcorrencia, date, "SUSPENSAO"]
    .filter(Boolean)
    .join(" - ") + ".pdf";
}

async function downloadFromUrl(signedUrl: string, filename: string) {
  const res = await fetch(signedUrl);
  if (!res.ok) throw new Error("Falha ao baixar PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SuspensaoModal({ occurrence, onClose, onSuspensaoGerada }: SuspensaoModalProps) {
  const existingSuspensao = occurrence.suspensao ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(existingSuspensao?.dataInicio ?? today);
  const [quantidadeDias, setQuantidadeDias] = useState(existingSuspensao?.dias ?? 1);
  const [loading, setLoading] = useState(false);
  const [loadingBaixar, setLoadingBaixar] = useState(false);

  const tipoOcorrencia = occurrence.typeCode === "GENERICO"
    ? (occurrence.reportTitle ?? occurrence.typeTitle ?? "Ocorrência")
    : (occurrence.typeTitle ?? occurrence.typeCode ?? "Ocorrência");

  async function handleBaixarSalvo() {
    setLoadingBaixar(true);
    try {
      const { suspensao } = await reportsPdfApi.getSuspensaoInfo(occurrence.id);
      if (!suspensao) {
        toast.error("Suspensão não encontrada.");
        return;
      }
      const d1 = occurrence.drivers?.find((d) => d.position === 1);
      const filename = buildFilename(occurrence, d1, tipoOcorrencia);
      await downloadFromUrl(suspensao.signedUrl, filename);
      toast.success("PDF baixado!");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao baixar PDF.");
    } finally {
      setLoadingBaixar(false);
    }
  }

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
      const { signedUrl, dataInicio: dataInicioResp, dias, filename } =
        await reportsPdfApi.getSuspensaoPdf({
          occurrenceId: occurrence.id,
          dataInicioSuspensao: dataInicio,
          quantidadeDias,
        });

      await downloadFromUrl(signedUrl, filename);

      const texto = buildWppText(occurrence, dataInicioResp, dias);
      await navigator.clipboard.writeText(texto);

      toast.success("PDF gerado e texto copiado!");
      onSuspensaoGerada?.({ dataInicio: dataInicioResp, dias });
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

        {existingSuspensao && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs font-medium text-amber-800 mb-2">
              Suspensão registrada: {existingSuspensao.dias} dia(s) a partir de{" "}
              {fmtDdMm(existingSuspensao.dataInicio)}
            </p>
            <button
              onClick={handleBaixarSalvo}
              disabled={loadingBaixar}
              className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-amber-700 border border-amber-300 bg-white rounded-md hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              {loadingBaixar ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Baixando...</>
              ) : (
                <><Download className="w-3.5 h-3.5" /> Baixar PDF salvo</>
              )}
            </button>
          </div>
        )}

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
              <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
            ) : existingSuspensao ? (
              "Re-gerar PDF"
            ) : (
              "Gerar PDF"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
