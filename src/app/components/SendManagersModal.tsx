import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";
import type { OccurrenceDTO } from "../../domain/occurrences";
import type { ManagerGroup } from "../../utils/managerReport";
import { buildManagerDailyMessage } from "../../utils/managerReport";

type SendStatus = "idle" | "sending" | "sent" | "error";

interface Props {
  open: boolean;
  groups: ManagerGroup[];
  occByBase: Map<string, OccurrenceDTO[]>;
  reportDate: string;
  basesSemTelefone: string[];
  // Envia UM grupo — quem chama controla o loop, o rate-limit e o status de
  // cada envio (mesmo padrão dos envios individuais em OccurrenceCardDTO).
  onSendOne: (group: ManagerGroup, message: string) => Promise<void>;
  onClose: () => void;
}

// Confirmação antes de disparar o relatório diário pros gestores — mostra
// quem vai receber, o texto exato de cada mensagem (expansível) e quais
// bases ficaram de fora por falta de telefone cadastrado. Só depois de
// revisar aqui é que o envio de fato roda (ver relatorio-diario.tsx).
export function SendManagersModal({ open, groups, occByBase, reportDate, basesSemTelefone, onSendOne, onClose }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, SendStatus>>({});
  const [sendingAll, setSendingAll] = useState(false);

  if (!open) return null;

  const messages = new Map(groups.map((g) => [g.telefone, buildManagerDailyMessage(g, occByBase, reportDate)]));
  const allDone = groups.length > 0 && groups.every((g) => status[g.telefone] === "sent");

  async function handleSendAll() {
    setSendingAll(true);
    for (const group of groups) {
      if (status[group.telefone] === "sent") continue;
      setStatus((s) => ({ ...s, [group.telefone]: "sending" }));
      try {
        await onSendOne(group, messages.get(group.telefone)!);
        setStatus((s) => ({ ...s, [group.telefone]: "sent" }));
      } catch {
        setStatus((s) => ({ ...s, [group.telefone]: "error" }));
      }
    }
    setSendingAll(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={sendingAll ? undefined : onClose}>
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 shrink-0">
            <Send className="w-4 h-4 text-blue-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Enviar relatório diário —{" "}
              <span className="text-blue-600 dark:text-blue-400">
                {groups.length} gestor{groups.length !== 1 ? "es" : ""}
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Uma mensagem de WhatsApp por gestor, com as ocorrências de todas as bases dele.
            </p>
          </div>
        </div>

        {basesSemTelefone.length > 0 && (
          <div className="mx-5 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Sem telefone cadastrado — não vão receber: <strong>{basesSemTelefone.join(", ")}</strong>
            </span>
          </div>
        )}

        {/* Lista de gestores */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2 mt-1">
          {groups.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
              Nenhum gestor com telefone cadastrado pras bases com ocorrência hoje.
            </p>
          ) : (
            groups.map((group) => {
              const isExpanded = expanded === group.telefone;
              const st = status[group.telefone] ?? "idle";
              return (
                <div key={group.telefone} className="rounded-lg border border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : group.telefone)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{group.responsavel}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        {group.bases.map((b) => b.sigla).join(", ")} · {group.occurrenceCount} ocorrência{group.occurrenceCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {st === "sending" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                      {st === "sent" && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      {st === "error" && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <pre className="whitespace-pre-wrap break-words px-3 pb-3 text-[11px] text-gray-600 dark:text-gray-400 font-sans">
                      {messages.get(group.telefone)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={sendingAll}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {allDone ? "Fechar" : "Cancelar"}
          </button>
          {!allDone && (
            <button
              onClick={handleSendAll}
              disabled={sendingAll || groups.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {sendingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Confirmar envio ({groups.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
