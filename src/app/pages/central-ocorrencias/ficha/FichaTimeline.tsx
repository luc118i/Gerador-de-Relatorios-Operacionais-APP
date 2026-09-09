import { Clock } from "lucide-react";
import type { OccurrenceHistoryEntry } from "../../../../domain/occurrences";
import { HISTORY_META, fmtDateTime, historyLine } from "./fichaHelpers";

type Props = {
  entries: OccurrenceHistoryEntry[] | undefined;
  loading: boolean;
};

export function FichaTimeline({ entries, loading }: Props) {
  return (
    <section>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Linha do tempo
      </h2>

      {loading ? (
        <p className="mt-2 text-sm text-gray-400">Carregando…</p>
      ) : !entries || entries.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">Sem eventos registrados.</p>
      ) : (
        <ol className="mt-3 space-y-4">
          {entries.map((h, i) => {
            const Icon = HISTORY_META[h.action]?.Icon ?? Clock;
            const last = i === entries.length - 1;
            return (
              <li key={h.id} className="relative flex gap-3">
                {!last && (
                  <span className="absolute left-[15px] top-8 bottom-[-16px] w-px bg-gray-200 dark:bg-gray-800" />
                )}
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {historyLine(h)}
                  </p>
                  <p className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                    {fmtDateTime(h.createdAt)}
                    {h.actorNome ? ` · ${h.actorNome}` : ""}
                  </p>
                  {h.note && h.action !== "NOTA" && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{h.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
