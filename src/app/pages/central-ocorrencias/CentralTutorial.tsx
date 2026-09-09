import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  CalendarClock,
  CheckCircle2,
  Flag,
  History,
  X,
} from "lucide-react";

const SEEN_KEY = "central_tutorial_v1";

export function hasSeenCentralTutorial(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // sem storage: não incomoda o usuário abrindo sozinho
  }
}

const TIPS: { icon: typeof Flag; title: string; body: string }[] = [
  {
    icon: Flag,
    title: "Marque o nível de prioridade",
    body:
      "Defina Crítica, Alta, Média ou Baixa no card (menu de prioridade) ou no painel da ocorrência. Críticas e Altas ganham uma faixa colorida no topo do card para não passarem batidas.",
  },
  {
    icon: ArrowLeftRight,
    title: "Mova entre as colunas de tratamento",
    body:
      "Arraste o card para outra coluna, use as setas ← → na alça direita do card, ou troque o Status direto no card. O fluxo é Pendente → Em tratamento → Aguardando retorno → Tratada. Mover para Tratada ou Cancelada pede confirmação.",
  },
  {
    icon: CalendarClock,
    title: "Fique de olho no período de corte",
    body:
      "O quadro é diário: o filtro De/Até define a janela exibida. Ocorrências fora desse intervalo não aparecem — ajuste as datas ou use os atalhos Hoje / Ontem / Essa semana. O período fica salvo e reabre igual na próxima vez.",
  },
  {
    icon: CheckCircle2,
    title: "Confirme o status da devolutiva",
    body:
      "Ao gerar o relatório, a devolutiva já vem como “Resolvido”. Antes de salvar aparece um aviso do status — deixe em “Em andamento” só se a tratativa ainda não terminou.",
  },
  {
    icon: History,
    title: "Acompanhe pelo card e pela linha do tempo",
    body:
      "Clique no card para abrir a ficha (com relatório) ou o painel lateral. Toda mudança de status, prioridade e tratativa fica registrada na linha do tempo da ocorrência.",
  },
];

export function CentralTutorial({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [render, setRender] = useState(open);

  useEffect(() => {
    if (open) setRender(true);
  }, [open]);

  if (!render) return null;

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    onClose();
    setRender(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={close}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
              Como usar
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-gray-900 dark:text-gray-100">
              Central de Ocorrências em 1 minuto
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Fechar"
            className="flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ol className="space-y-4">
            {TIPS.map((t, i) => {
              const Icon = t.icon;
              return (
                <li key={i} className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {i + 1}. {t.title}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
                      {t.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex justify-end border-t border-gray-100 px-5 py-3.5 dark:border-gray-800">
          <button
            onClick={close}
            className="cursor-pointer rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
