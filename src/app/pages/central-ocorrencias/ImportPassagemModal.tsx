import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import { AppDialog } from "../../components/ui/app-dialog";
import { DatePicker } from "../../components/ui/date-picker";
import { getApiErrorMessage } from "../../../api/http";
import { getLocalDateString } from "../../../utils/dateUtils";
import { useImportPassagem } from "../../../features/occurrences/queries/occurrences.queries";
import {
  parsePassagem,
  SUBJECT_OPTIONS,
  type ParsedRow,
} from "../../../features/occurrences/passagemParser";
import { PickSelect } from "./ui/PickSelect";

type Row = ParsedRow & { include: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  /** eventDate usado no import — o quadro pula pra essa data pra mostrar o que entrou. */
  onImported: (eventDate: string) => void;
};

const inputCls =
  "w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400";
const label = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

/**
 * Importar passagem de serviço (WhatsApp): cola o texto → parser regex/dicionário
 * (`passagemParser`) → revisa a tabela → cria N ocorrências GENERICO na Central.
 */
export function ImportPassagemModal({ open, onClose, onImported }: Props) {
  const importMut = useImportPassagem();

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(false);
  const [operador, setOperador] = useState("");
  const [eventDate, setEventDate] = useState(getLocalDateString(new Date()));
  const [rows, setRows] = useState<Row[]>([]);

  const includedCount = useMemo(() => rows.filter((r) => r.include).length, [rows]);

  function reset() {
    setText("");
    setParsed(false);
    setOperador("");
    setEventDate(getLocalDateString(new Date()));
    setRows([]);
  }

  function handleInterpretar() {
    const p = parsePassagem(text);
    if (p.rows.length === 0) {
      toast.error("Nenhuma linha reconhecida. Confira o formato (prefixo – descrição).");
      return;
    }
    setOperador(p.operador);
    if (p.eventDate) setEventDate(p.eventDate);
    setRows(p.rows.map((r) => ({ ...r, include: r.matched })));
    setParsed(true);
  }

  function patchRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleImport() {
    const toImport = rows.filter((r) => r.include && r.vehicleNumber.trim() && r.subject.trim());
    if (toImport.length === 0) {
      toast.error("Marque ao menos uma linha para importar.");
      return;
    }
    try {
      const res = await importMut.mutateAsync({
        eventDate,
        operador: operador || null,
        rows: toImport.map((r) => ({
          vehicleNumber: r.vehicleNumber.trim(),
          subject: r.subject.trim(),
          detalhes: r.detalhes.trim(),
        })),
      });
      const okMsg = `${res.created.length} ocorrência${res.created.length !== 1 ? "s" : ""} importada${res.created.length !== 1 ? "s" : ""}.`;
      if (res.failed.length) toast.warning(`${okMsg} ${res.failed.length} falharam.`);
      else toast.success(okMsg);
      const importedDate = eventDate;
      reset();
      onClose();
      onImported(importedDate);
    } catch (err) {
      toast.error(`Falha ao importar: ${getApiErrorMessage(err)}`);
    }
  }

  const saving = importMut.isPending;

  return (
    <AppDialog
      open={open}
      onOpenChange={(v) => !v && !saving && onClose()}
      title="Importar passagem de serviço"
      subtitle="Cole o texto do WhatsApp — cada linha vira uma ocorrência na Central."
      size="lg"
      closeOnOutside={!saving}
    >
      {!parsed ? (
        <div className="space-y-3">
          <label className={label}>Texto da passagem</label>
          <textarea
            className={`${inputCls} min-h-[220px] resize-y font-mono`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"13/09/2026 — FULANO - CCO 123\n\n24422 – para-brisa trincado\n24512 – pane seca km 100\n24007 – pax perdeu o ônibus"}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleInterpretar}
              disabled={text.trim().length < 8}
              className="cursor-pointer px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Interpretar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className={label}>Data</label>
              <DatePicker value={eventDate} onChange={setEventDate} className="w-[168px] py-1.5 text-xs" />
            </div>
            {operador && (
              <div>
                <label className={label}>Operador (passagem)</label>
                <div className={`${inputCls} bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400`}>
                  {operador}
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-[10px] uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="w-8 px-2 py-2" />
                  <th className="w-20 px-2 py-2 text-left">Prefixo</th>
                  <th className="px-2 py-2 text-left">Detalhes</th>
                  <th className="w-44 px-2 py-2 text-left">Assunto</th>
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t border-gray-100 dark:border-gray-800 ${
                      r.include ? "" : "opacity-45"
                    }`}
                  >
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => patchRow(r.id, { include: e.target.checked })}
                        className="cursor-pointer accent-blue-600"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className={inputCls}
                        value={r.vehicleNumber}
                        onChange={(e) => patchRow(r.id, { vehicleNumber: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className={inputCls}
                        value={r.detalhes}
                        onChange={(e) => patchRow(r.id, { detalhes: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <PickSelect
                        size="sm"
                        ariaLabel="Assunto"
                        value={r.subject}
                        onChange={(v) => patchRow(r.id, { subject: v, matched: true })}
                        options={SUBJECT_OPTIONS.map((s) => ({ value: s, label: s }))}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                        className="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                        aria-label="Remover linha"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setParsed(false)}
              disabled={saving}
              className="cursor-pointer text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              ← Editar texto
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !saving && onClose()}
                disabled={saving}
                className="cursor-pointer px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={saving || includedCount === 0}
                className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Importar {includedCount} ocorrência{includedCount !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppDialog>
  );
}
