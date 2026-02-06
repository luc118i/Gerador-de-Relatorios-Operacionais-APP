import { useMemo, useState } from "react";
import { ArrowLeft, FileDown, RefreshCw, PencilLine } from "lucide-react";
import type { Ocorrencia } from "../../../types";
import {
  gerarTextoRelatorioIndividual,
  gerarTextoWhatsApp,
} from "../../../utils/relatorio";
import { useGetOccurrencePdf } from "../../../../features/reportsPdf/queries/reportsPdf.queries";

export function OccurrencePreviewPage(props: {
  occurrenceId: string;
  occurrence: Ocorrencia;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { occurrenceId, occurrence, onBack, onEdit } = props;

  const getPdf = useGetOccurrencePdf();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [ttl, setTtl] = useState<number | null>(null);
  const [cached, setCached] = useState<boolean | null>(null);

  const relatorioTxt = useMemo(
    () => gerarTextoRelatorioIndividual(occurrence),
    [occurrence],
  );
  const whatsappTxt = useMemo(
    () => gerarTextoWhatsApp(occurrence),
    [occurrence],
  );

  async function handleGenerate(force?: boolean) {
    const res = await getPdf.mutateAsync({
      occurrenceId,
      ttlSeconds: 3600,
      force: !!force,
    });

    const pdf = res.data.pdf;
    setSignedUrl(pdf.signedUrl);
    setTtl(pdf.ttlSeconds);
    setCached(pdf.cached);
  }

  function handleDownload() {
    if (!signedUrl) return;
    window.open(signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Preview da Ocorrência
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">ID: {occurrenceId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-2"
            >
              <PencilLine className="w-4 h-4" />
              Editar
            </button>

            <button
              onClick={() => handleGenerate(false)}
              disabled={getPdf.isPending}
              className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {getPdf.isPending ? "Gerando..." : "Gerar PDF"}
            </button>

            <button
              onClick={handleDownload}
              disabled={!signedUrl}
              className="h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Baixar PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Status PDF */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {signedUrl ? (
              <>
                PDF pronto{" "}
                {cached != null
                  ? cached
                    ? "(cache)"
                    : "(gerado agora)"
                  : null}
                {ttl ? ` • expira em ~${Math.round(ttl / 60)} min` : null}
              </>
            ) : (
              "Gere o PDF para habilitar o download."
            )}
          </div>

          <button
            onClick={() => handleGenerate(true)}
            disabled={getPdf.isPending}
            className="h-9 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 text-sm"
            title="Forçar regeneração"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerar (force)
          </button>
        </div>

        {/* Resumo (simples por enquanto) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Linha</div>
              <div className="font-medium text-gray-900">
                {occurrence.viagem.linha}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Prefixo</div>
              <div className="font-medium text-gray-900">
                {occurrence.viagem.prefixo}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-500">Origem x Destino</div>
              <div className="font-medium text-gray-900">
                {occurrence.viagem.origem} x {occurrence.viagem.destino}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Data</div>
              <div className="font-medium text-gray-900">
                {occurrence.dataEvento}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Horários</div>
              <div className="font-medium text-gray-900">
                {occurrence.horarioInicial} → {occurrence.horarioFinal}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-500">Local</div>
              <div className="font-medium text-gray-900">
                {occurrence.localParada}
              </div>
            </div>
          </div>
        </div>

        {/* Textos */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Texto WhatsApp
            </h2>
            <button
              onClick={() => navigator.clipboard.writeText(whatsappTxt)}
              className="h-9 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm"
            >
              Copiar
            </button>
          </div>
          <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4">
            {whatsappTxt}
          </pre>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Relatório Individual
            </h2>
            <button
              onClick={() => navigator.clipboard.writeText(relatorioTxt)}
              className="h-9 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm"
            >
              Copiar
            </button>
          </div>
          <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4">
            {relatorioTxt}
          </pre>
        </div>

        {/* Erro PDF */}
        {getPdf.isError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            Falha ao gerar o PDF. Tente novamente.
          </div>
        ) : null}
      </main>
    </div>
  );
}
