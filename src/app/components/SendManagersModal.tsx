import { useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Clock, Loader2, Send } from "lucide-react";
import type { OccurrenceDTO } from "../../domain/occurrences";
import type { ManagerGroup } from "../../utils/managerReport";
import { buildManagerDailyMessage, collectReportLinks } from "../../utils/managerReport";
import { linksApi } from "../../api/links.api";

type SendStatus = "idle" | "sending" | "waiting" | "sent" | "error";

// Intervalo entre o envio de cada gestor — mandar tudo de uma vez, um atrás
// do outro sem pausa, é justamente o padrão que a Meta associa a spam/bot e
// pode banir o número do WhatsApp Web usado pelo RIZER Agent. Um intervalo
// com uma folga aleatória (menos robótico que um valor fixo) entre cada
// mensagem reduz esse risco.
const MIN_DELAY_MS = 4000;
const MAX_DELAY_MS = 9000;

function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Props {
  open: boolean;
  groups: ManagerGroup[];
  occByBase: Map<string, OccurrenceDTO[]>;
  reportDate: string;
  basesSemTelefone: string[];
  baseCodesSemCadastro: string[];
  // Envia UM grupo — quem chama controla o loop, o rate-limit e o status de
  // cada envio (mesmo padrão dos envios individuais em OccurrenceCardDTO).
  onSendOne: (group: ManagerGroup, message: string) => Promise<void>;
  onClose: () => void;
  // Título/subtítulo do header. Default: relatório diário.
  title?: string;
  subtitle?: string;
  // Monta o texto de cada mensagem. Default: buildManagerDailyMessage. A
  // seção "Ocorrências Pendentes de Tratamento" passa buildManagerCobrancaMessage.
  buildMessage?: (
    group: ManagerGroup,
    occByBase: Map<string, OccurrenceDTO[]>,
    reportDate: string,
    shortLinks: Map<string, string>,
  ) => string;
  // Encurtar os links do Drive antes de montar o texto (default true — usado
  // no relatório diário). A cobrança de devolutiva usa link do RIZER (curto),
  // não precisa e evita depender do endpoint /links/shorten.
  shortenLinks?: boolean;
}

// Confirmação antes de disparar o relatório diário pros gestores — mostra
// quem vai receber, o texto exato de cada mensagem (expansível) e quais
// bases ficaram de fora por falta de telefone cadastrado. Só depois de
// revisar aqui é que o envio de fato roda (ver relatorio-diario.tsx).
export function SendManagersModal({
  open,
  groups,
  occByBase,
  reportDate,
  basesSemTelefone,
  baseCodesSemCadastro,
  onSendOne,
  onClose,
  title = "Enviar relatório diário",
  subtitle = "Uma mensagem de WhatsApp por gestor, com as ocorrências de todas as bases dele. Envio com pausa entre cada gestor, pra não mandar tudo de uma vez.",
  buildMessage = buildManagerDailyMessage,
  shortenLinks = true,
}: Props) {
  // Todas as mensagens abrem expandidas por padrão — é justamente pra
  // revisar o texto exato antes de confirmar o envio, não pra esconder atrás
  // de clique. Guarda os RECOLHIDOS (conjunto vazio = tudo expandido).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Record<string, SendStatus>>({});
  const [sendingAll, setSendingAll] = useState(false);
  const [shortLinks, setShortLinks] = useState<Map<string, string>>(new Map());
  const [shorteningLinks, setShorteningLinks] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Encurta (TinyURL, via backend) todos os links de relatório das
  // ocorrências desse envio — uma chamada em lote, antes de montar o texto.
  // Falha na chamada não trava nada: buildManagerDailyMessage cai pro link
  // original quando não acha entrada no map.
  useEffect(() => {
    if (!open || !shortenLinks) return;
    const urls = collectReportLinks(groups, occByBase);
    if (urls.length === 0) return;
    let alive = true;
    setShorteningLinks(true);
    linksApi
      .shorten(urls)
      .then((map) => { if (alive) setShortLinks(new Map(Object.entries(map))); })
      .catch(() => { /* segue com os links originais */ })
      .finally(() => { if (alive) setShorteningLinks(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const messages = new Map(groups.map((g) => [g.telefone, buildMessage(g, occByBase, reportDate, shortLinks)]));
  const allDone = groups.length > 0 && groups.every((g) => status[g.telefone] === "sent");

  async function handleSendAll() {
    setSendingAll(true);
    setSendError(null);
    const pending = groups.filter((g) => status[g.telefone] !== "sent");
    for (let i = 0; i < pending.length; i++) {
      const group = pending[i]!;
      setStatus((s) => ({ ...s, [group.telefone]: "sending" }));
      let ok = true;
      try {
        const msg = messages.get(group.telefone);
        if (!msg) throw new Error("mensagem vazia (falha ao montar o texto)");
        await onSendOne(group, msg);
        setStatus((s) => ({ ...s, [group.telefone]: "sent" }));
      } catch (e) {
        ok = false;
        setStatus((s) => ({ ...s, [group.telefone]: "error" }));
        const detail = (e as Error)?.message ?? "erro desconhecido";
        setSendError(`${group.responsavel}: ${detail}`);
        console.error("[SendManagersModal] envio falhou:", group.telefone, e);
      }
      // Pausa entre um gestor e o próximo — não depois do último (nada mais
      // pra esperar) e só quando esse envio deu certo (erro já não chegou a
      // sair pro WhatsApp, não precisa do mesmo respiro).
      if (ok && i < pending.length - 1) {
        setStatus((s) => ({ ...s, [group.telefone]: "waiting" }));
        await sleep(randomDelay());
        setStatus((s) => ({ ...s, [group.telefone]: "sent" }));
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
              {title} —{" "}
              <span className="text-blue-600 dark:text-blue-400">
                {groups.length} gestor{groups.length !== 1 ? "es" : ""}
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          {shorteningLinks && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 shrink-0" title="Encurtando links dos relatórios">
              <Loader2 className="w-3 h-3 animate-spin" />
              links
            </span>
          )}
        </div>

        {basesSemTelefone.length > 0 && (
          <div className="mx-5 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Sem telefone cadastrado — não vão receber: <strong>{basesSemTelefone.join(", ")}</strong>
            </span>
          </div>
        )}

        {baseCodesSemCadastro.length > 0 && (
          <div className="mx-5 mt-2 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Base não encontrada em "Base e Responsáveis" (confira a cidade cadastrada): <strong>{baseCodesSemCadastro.join(", ")}</strong>
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
              const isExpanded = !collapsed.has(group.telefone);
              const st = status[group.telefone] ?? "idle";
              return (
                <div key={group.telefone} className="rounded-lg border border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() =>
                      setCollapsed((prev) => {
                        const next = new Set(prev);
                        if (isExpanded) next.add(group.telefone);
                        else next.delete(group.telefone);
                        return next;
                      })
                    }
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
                      {st === "waiting" && (
                        <span title="Aguardando pra não mandar tudo de uma vez">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                      {(st === "sent" || st === "waiting") && <Check className="w-3.5 h-3.5 text-emerald-500" />}
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

        {sendError && (
          <div className="mx-5 mb-1 mt-2 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Falha no envio — {sendError}</span>
          </div>
        )}

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
              disabled={sendingAll || shorteningLinks || groups.length === 0}
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
