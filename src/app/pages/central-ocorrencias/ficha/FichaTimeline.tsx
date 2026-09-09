import type { OccurrenceHistoryEntry } from "../../../../domain/occurrences";
import { fmtDateTime, historyLine } from "./fichaHelpers";

type Props = {
  entries: OccurrenceHistoryEntry[] | undefined;
  loading: boolean;
  /** sem `<h2>` e `<section>` — o pai fornece o título */
  bare?: boolean;
  title?: string;
};

export function FichaTimeline({ entries, loading, bare = false, title = "Linha do tempo" }: Props) {
  const body = loading ? (
    <p className="mt-2 text-sm text-gray-400">Carregando…</p>
  ) : !entries || entries.length === 0 ? (
    <p className="mt-2 text-sm text-gray-400">Sem eventos registrados.</p>
  ) : (
    <ol className="mt-3 space-y-3.5">
      {entries.map((h, i) => {
        const last = i === entries.length - 1;
        return (
          <li key={h.id} className="relative flex gap-3">
            {!last && (
              <span className="absolute left-[3.5px] top-3 bottom-[-14px] w-px bg-gray-200 dark:bg-gray-800" />
            )}
            <span className="relative z-10 mt-[5px] h-2 w-2 shrink-0 rounded-full bg-gray-300 ring-2 ring-white dark:bg-gray-600 dark:ring-gray-900" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800 dark:text-gray-100">{historyLine(h)}</p>
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
  );

  if (bare) return body;

  return (
    <section>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
        {title}
      </h2>
      {body}
    </section>
  );
}
