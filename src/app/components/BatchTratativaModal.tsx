import { useState } from "react";
import { AlertTriangle, Check, Copy, ListChecks } from "lucide-react";
import { toast } from "sonner";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { dtoToMinimalOcorrencia } from "../../utils/occurrenceDto";
import { gerarTextoRelatorioIndividual } from "../../utils/relatorio";

interface Props {
  open: boolean;
  subject: string;
  occs: OccurrenceDTO[];
  onConfirm: () => void;
  onCancel: () => void;
}

// Confirmação do lote "Enviar tratativas pendentes" — o preenchimento no
// RIZER (fillMedidaLink) busca no Drive um arquivo de medida com o nome
// exato "matrícula - nome - base - tipo - data" (ver buildDriverPdfFileName);
// sem esse documento já existir lá, a tratativa fica marcada como
// pendente de novo. Este modal lista nome de arquivo + texto de cada
// ocorrência (mesmo texto do botão "Copiar Relatório Individual") pra
// facilitar gerar os documentos de medida antes de rodar o lote.
export function BatchTratativaModal({ open, subject, occs, onConfirm, onCancel }: Props) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!open) return null;

  const entries = occs.map((occ) => ({
    occ,
    text: gerarTextoRelatorioIndividual(dtoToMinimalOcorrencia(occ)),
  }));

  async function handleCopyAll() {
    const all = entries.map((e) => e.text).join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(all);
      setCopiedAll(true);
      toast.success(`${entries.length} texto${entries.length !== 1 ? "s" : ""} copiado${entries.length !== 1 ? "s" : ""}!`);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function handleCopyOne(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Enviar tratativas —{" "}
              <span className="text-amber-600 dark:text-amber-400">{occs.length} ocorrência{occs.length !== 1 ? "s" : ""}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{subject}</p>
          </div>
          <button
            onClick={handleCopyAll}
            title="Copiar nome de arquivo + texto de todas as ocorrências"
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              copiedAll
                ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {copiedAll ? <Check className="w-3.5 h-3.5" /> : <ListChecks className="w-3.5 h-3.5" />}
            {copiedAll ? "Copiado!" : "Copiar tudo"}
          </button>
        </div>

        <p className="px-5 pt-3 text-[11px] text-gray-400 dark:text-gray-500">
          Nome de arquivo + texto de cada ocorrência — use pra gerar os documentos de medida antes de confirmar o envio.
        </p>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
          {entries.map(({ occ, text }) => {
            const driver = occ.drivers.find((d) => d.position === 1);
            const fileName = text.split("\n", 1)[0];
            const isCopied = copiedId === occ.id;
            return (
              <div
                key={occ.id}
                className="rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" title={fileName}>
                      {fileName}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                      {driver?.name ?? "—"} · {occ.vehicleNumber} · {occ.baseCode}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyOne(occ.id, text)}
                    title="Copiar nome de arquivo + texto"
                    className={`shrink-0 p-1.5 rounded-md transition-colors ${
                      isCopied
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-blue-950/40"
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            Confirmar ({occs.length})
          </button>
        </div>
      </div>
    </div>
  );
}
