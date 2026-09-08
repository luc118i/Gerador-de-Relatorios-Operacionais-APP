import type { OccurrenceDTO } from "../../../domain/occurrences";
import {
  BOARD_COLUMNS,
  getWorkflowStatusConfig,
  treatmentProgress,
} from "../../config/occurrenceWorkflow";
import { getOccurrenceTypeConfig } from "../../config/occurrenceTypes";
import { avatarColor, initialsOf } from "../../../utils/avatar";
import { DENSITY_ROW_PADDING, type CentralLayout } from "./useCentralLayout";
import { CardMenu } from "./CardMenu";

function subject(o: OccurrenceDTO): string {
  if (o.typeCode === "GENERICO") return o.reportTitle || o.typeTitle || "Ocorrência";
  return o.occurrenceName || getOccurrenceTypeConfig(o.typeCode).title || o.typeTitle || "Ocorrência";
}
function shortDate(d?: string) {
  if (!d) return "";
  const [, m, day] = (d ?? "").split("-");
  return m && day ? `${day}/${m}` : "";
}

type Props = {
  occurrences: OccurrenceDTO[];
  layout: CentralLayout;
  actor: { actorUserId?: string | null; actorNome?: string | null };
  onOpen: (o: OccurrenceDTO) => void;
  onEdit: (id: string) => void;
};

export function BoardListView({ occurrences, layout, actor, onOpen, onEdit }: Props) {
  const groups = BOARD_COLUMNS.map((s) => ({
    status: s,
    cfg: getWorkflowStatusConfig(s),
    items: occurrences.filter((o) => (o.workflowStatus ?? "PENDENTE") === s),
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return <p className="py-16 text-center text-sm text-gray-400">Nenhuma ocorrência.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.status}>
          <div className="flex items-center gap-2 px-1 pb-1">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${g.cfg.dot}`} />
            <span className="text-[13px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {g.cfg.label}
            </span>
            <span className="text-xs tabular-nums text-gray-400">{g.items.length}</span>
          </div>
          <div className="divide-y divide-gray-100 rounded-md border border-gray-200/70 dark:divide-gray-800 dark:border-gray-800">
            {g.items.map((o) => {
              const prog = treatmentProgress(o);
              return (
                <div
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(o)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onOpen(o);
                  }}
                  className={`group flex cursor-pointer items-center gap-3 px-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${DENSITY_ROW_PADDING[layout.density]}`}
                >
                  <span className="w-14 shrink-0 text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                    {o.vehicleNumber}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-gray-700 dark:text-gray-300">
                    {subject(o)}
                  </span>
                  {o.analisadoPor && (
                    <span
                      title={o.analisadoPor}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${avatarColor(o.analisadoPor)}`}
                    >
                      {initialsOf(o.analisadoPor)}
                    </span>
                  )}
                  {layout.show.datas && (
                    <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-gray-400">
                      {shortDate(o.eventDate)}
                    </span>
                  )}
                  {prog.done > 0 && (
                    <span className="shrink-0 rounded bg-gray-100 px-1 text-[9px] font-semibold tabular-nums text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                      {prog.done}/{prog.total}
                    </span>
                  )}
                  <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <CardMenu occurrence={o} actor={actor} onOpen={onOpen} onEdit={onEdit} />
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
