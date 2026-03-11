import { useMemo, useState } from "react";
import { Home, RefreshCw, PencilLine, Check, Copy } from "lucide-react";
import type { Ocorrencia } from "../../../types";
import {
  gerarTextoRelatorioIndividual,
  gerarTextoWhatsApp,
} from "../../../utils/relatorio";
import { useGetOccurrencePdf } from "../../../../features/reportsPdf/queries/reportsPdf.queries";

import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../api/http";

import { DriverPdfCard } from "./components/DriverPdfCard";

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

  function getViagemLinha(v: Ocorrencia["viagem"]): string {
    return "linha" in v ? String(v.linha ?? "") : "";
  }

  function getViagemPrefixo(v: Ocorrencia["viagem"]): string {
    return "prefixo" in v ? String(v.prefixo ?? "") : "";
  }

  function getViagemOrigem(v: Ocorrencia["viagem"]): string {
    return "origem" in v ? String(v.origem ?? "") : "";
  }

  function getViagemDestino(v: Ocorrencia["viagem"]): string {
    return "destino" in v ? String(v.destino ?? "") : "";
  }

  function getOccurrenceTitle(o: Ocorrencia): string {
    const titles: Record<string, string> = {
      DESCUMP_OP_VELOCIDADE: "EXCESSO DE VELOCIDADE",
      PARADA_FORA_PROG: "PARADA FORA DO PROGRAMADO",
    };
    return titles[o.type?.code ?? ""] || "OCORRÊNCIA OPERACIONAL";
  }

  type DriverSnapshot = {
    position: 1 | 2;
    registry: string;
    name: string;
    base?: string | null;
  };

  const drivers = useMemo(() => {
    const map = (raw: any, position: 1 | 2): DriverSnapshot | null => {
      if (!raw) return null;

      // Se o backend não enviou o nome/matricula, evite usar o ID (UUID)
      const code = raw.code || raw.registry || raw.matricula || "";
      const name = raw.name || raw.nome || "";
      const base = raw.base || "";

      return {
        position,
        // Se code ou name forem vazios, passamos string vazia para o Card tratar
        registry: String(code).trim(),
        name: String(name).trim(),
        base: String(base).trim() || null,
      };
    };

    return {
      d1: map(occurrence.motorista1, 1),
      d2: map(occurrence.motorista2, 2),
    };
  }, [occurrence.motorista1, occurrence.motorista2]);

  async function handleGenerate(force?: boolean) {
    try {
      const res = await getPdf.mutateAsync({
        occurrenceId,
        ttlSeconds: 3600,
        force: !!force,
      });

      const pdf = res.data.pdf;
      setSignedUrl(pdf.signedUrl);
      setTtl(pdf.ttlSeconds);
      setCached(pdf.cached);
    } catch (e) {
      setSignedUrl(null);
      setTtl(null);
      setCached(null);
      toast.error(getApiErrorMessage(e, "Falha ao gerar PDF"));
    }
  }

  function handleDownload() {
    if (!signedUrl) return;
    window.open(signedUrl, "_blank", "noopener,noreferrer");
  }

  async function getOrCreateSignedUrl(args: {
    force?: boolean;
    reason: "driver-download";
  }) {
    // Se já tem signedUrl e não for force, reaproveita sem bater no backend
    if (signedUrl && !args.force) {
      return { signedUrl, cached, ttlSeconds: ttl };
    }

    const res = await getPdf.mutateAsync({
      occurrenceId,
      ttlSeconds: 3600,
      force: !!args.force,
    });

    const pdf = res.data.pdf;
    setSignedUrl(pdf.signedUrl);
    setTtl(pdf.ttlSeconds);
    setCached(pdf.cached);

    return {
      signedUrl: pdf.signedUrl,
      cached: pdf.cached,
      ttlSeconds: pdf.ttlSeconds,
    };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5 text-gray-600" />
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
              className="cursor-pointer h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-2"
            >
              <PencilLine className="w-4 h-4" />
              Editar
            </button>

            <button
              onClick={() => handleGenerate(false)}
              disabled={getPdf.isPending}
              className="cursor-pointer h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {getPdf.isPending ? "Gerando..." : "Gerar PDF"}
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
        </div>
        {/* PDF por motorista */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              PDF por motorista
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {drivers.d1 ? (
              <DriverPdfCard
                occurrenceId={occurrenceId}
                occurrenceTitle={getOccurrenceTitle(occurrence)}
                eventDate={occurrence.dataEvento}
                driver={drivers.d1}
                getOrCreateSignedUrl={getOrCreateSignedUrl}
              />
            ) : null}

            {drivers.d2 ? (
              <DriverPdfCard
                occurrenceId={occurrenceId}
                occurrenceTitle={getOccurrenceTitle(occurrence)}
                eventDate={occurrence.dataEvento}
                driver={drivers.d2}
                getOrCreateSignedUrl={getOrCreateSignedUrl}
              />
            ) : null}
          </div>
        </div>

        {/* Resumo Adaptável */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Resumo</h2>
            {/* Badge de Tipo */}
            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              {occurrence.type?.code}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Linha</div>
              <div className="font-medium text-gray-900">
                {getViagemLinha(occurrence.viagem)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Prefixo</div>
              <div className="font-medium text-gray-900">
                {getViagemPrefixo(occurrence.viagem)}
              </div>
            </div>

            {/* EXIBIÇÃO DO KM: Somente se for velocidade */}
            {occurrence.type?.code === "DESCUMP_OP_VELOCIDADE" && (
              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-amber-700 text-xs font-bold uppercase tracking-wider">
                    Velocidade Atingida
                  </div>
                  <div className="text-2xl font-black text-amber-900">
                    {occurrence.details?.velocidade}{" "}
                    <span className="text-sm font-normal">km/h</span>
                  </div>
                </div>
                <div className="text-amber-400">
                  <RefreshCw className="w-8 h-8 opacity-20" />
                </div>
              </div>
            )}

            <div className="col-span-2">
              <div className="text-gray-500">Origem x Destino</div>
              <div className="font-medium text-gray-900">
                {getViagemOrigem(occurrence.viagem)} x{" "}
                {getViagemDestino(occurrence.viagem)}
              </div>
            </div>

            <div>
              <div className="text-gray-500">Data</div>
              <div className="font-medium text-gray-900">
                {occurrence.dataEvento}
              </div>
            </div>

            <div>
              <div className="text-gray-500">
                {occurrence.type?.code === "DESCUMP_OP_VELOCIDADE"
                  ? "Horário do Evento"
                  : "Horários"}
              </div>
              <div className="font-medium text-gray-900">
                {occurrence.type?.code === "DESCUMP_OP_VELOCIDADE"
                  ? occurrence.horarioInicial
                  : `${occurrence.horarioInicial} → ${occurrence.horarioFinal}`}
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
            {/* Novo botão com sensação de clique */}
            <CopyButton textToCopy={whatsappTxt} />
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
            {/* Novo botão com sensação de clique */}
            <CopyButton textToCopy={relatorioTxt} />
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

function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`cursor-pointer h-9 px-3 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${
        copied
          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
          : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700 active:scale-95"
      }`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copiar
        </>
      )}
    </button>
  );
}
