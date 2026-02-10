import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Copy, Download, Check, Camera } from "lucide-react";
import { getOccurrencesByDay } from "../../api/occurrences.api";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { buildDailyReport } from "../utils/relatorio-diario";

interface RelatorioDiarioProps {
  onVoltar: () => void;
}

export function RelatorioDiario({ onVoltar }: RelatorioDiarioProps) {
  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [copiado, setCopiado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<OccurrenceDTO[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErrorMsg(null);

    getOccurrencesByDay(dataSelecionada)
      .then((data) => {
        if (!alive) return;
        setOccurrences(data);
      })
      .catch((e) => {
        if (!alive) return;
        setOccurrences([]);
        setErrorMsg(e?.message ?? "Falha ao carregar ocorrências");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [dataSelecionada]);

  const report = useMemo(() => buildDailyReport(occurrences), [occurrences]);
  const textoRelatorio = report.textWithMarkers;

  const canActions = report.totals.occurrences > 0 && !loading && !errorMsg;

  const handleCopiar = async () => {
    if (!canActions) return;
    try {
      await navigator.clipboard.writeText(report.textForCopy);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback: selecionar tudo
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  const handleExportar = () => {
    if (!canActions) return;
    const blob = new Blob([report.textForCopy], { type: "text/plain" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-diario-${dataSelecionada}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scrollToAnchor = (startIndex: number, key: string) => {
    const el = textareaRef.current;
    if (!el) return;

    setActiveKey(key);

    // Conta linhas até o offset
    const before = textoRelatorio.slice(0, startIndex);
    const lines = before.split("\n").length - 1;

    const style = window.getComputedStyle(el);
    const lineHeightPx = parseFloat(style.lineHeight || "18");
    const paddingTopPx = parseFloat(style.paddingTop || "0");

    el.scrollTop = Math.max(0, lines * lineHeightPx - paddingTopPx);

    // feedback: posiciona cursor no início do bloco
    el.focus();
    el.setSelectionRange(startIndex, startIndex);

    // remove highlight “ativo” depois de um tempo
    window.setTimeout(() => {
      setActiveKey((cur) => (cur === key ? null : cur));
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onVoltar}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Relatório Diário Consolidado
                </h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Todas as ocorrências em formato padronizado
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopiar}
                disabled={!canActions}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                  canActions
                    ? "bg-gray-700 text-white hover:bg-gray-800"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                {copiado ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copiar Tudo
                  </>
                )}
              </button>

              <button
                onClick={handleExportar}
                disabled={!canActions}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                  canActions
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-blue-200 text-blue-900/40 cursor-not-allowed"
                }`}
              >
                <Download className="w-5 h-5" />
                Exportar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {/* Filtro de Data */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a Data
            </label>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {loading && (
                <span className="text-sm text-gray-500">Carregando…</span>
              )}
              {errorMsg && (
                <span className="text-sm text-red-600">{errorMsg}</span>
              )}
            </div>

            <div className="mt-3 text-sm text-gray-600">
              {report.totals.occurrences} ocorrência
              {report.totals.occurrences !== 1 ? "s" : ""}
            </div>

            {/* Resumo compacto */}
            {report.totals.occurrences > 0 && !loading && !errorMsg && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip label={`Evidências: ${report.totals.evidences}`} />
                <Chip label={`Veículos: ${report.totals.vehicles}`} />
                <Chip label={`Linhas: ${report.totals.lines}`} />
                <Chip
                  label={`Janela: ${report.totals.windowStart} → ${report.totals.windowEnd}`}
                />
              </div>
            )}
          </div>

          {/* Área do Relatório */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Relatório Consolidado
              </label>
              <span className="text-xs text-gray-500">
                Formato oficial padronizado
              </span>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={textoRelatorio}
                readOnly
                rows={30}
                className="w-full px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-800 focus:outline-none resize-none"
              />

              {!loading && !errorMsg && report.totals.occurrences === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-gray-500 font-medium mb-2">
                      Nenhuma ocorrência registrada nesta data
                    </p>
                    <p className="text-sm text-gray-400">
                      Selecione outra data
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Footer */}
          {report.totals.occurrences > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  📋 Informações do Relatório
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• O relatório segue o formato oficial padronizado</li>
                  <li>
                    • Cada ocorrência é separada por uma linha de 80 caracteres
                  </li>
                  <li>• Total de {report.totals.evidences} evidência(s)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="text-xs text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded">
      {label}
    </span>
  );
}
