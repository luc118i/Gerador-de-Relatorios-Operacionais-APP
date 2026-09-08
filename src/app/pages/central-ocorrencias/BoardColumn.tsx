import { memo } from "react";
import { Plus } from "lucide-react";
import type { OccurrenceDTO, WorkflowStatus } from "../../../domain/occurrences";
import { getWorkflowStatusConfig } from "../../config/occurrenceWorkflow";
import { OccurrenceBoardCard } from "./OccurrenceBoardCard";
import {
  DENSITY_CARD_GAP,
  type CentralLayout,
} from "./useCentralLayout";

const COL_WIDTH: Record<CentralLayout["density"], string> = {
  compacta: "w-[264px]",
  confortavel: "w-[288px]",
  espacosa: "w-[312px]",
};

type Props = {
  status: WorkflowStatus;
  occurrences: OccurrenceDTO[];
  layout: CentralLayout;
  /** Estáveis (do pai) — necessário pro memo desta coluna e dos cards valer. */
  onCardClick: (o: OccurrenceDTO) => void;
  onCardDragStart: (o: OccurrenceDTO) => void;
  onCardDragEnd: () => void;
  onCardAdvance: (o: OccurrenceDTO) => void;
  /** "+" no header da coluna → nova ocorrência já com esse status inicial */
  onQuickAdd: (status: WorkflowStatus) => void;
  onHover: (status: WorkflowStatus | null) => void;
  onDropHere: (status: WorkflowStatus) => void;
  /** status de origem do card em arrasto (null quando nada é arrastado) */
  dragFrom: WorkflowStatus | null;
  /** id do card em arrasto, pra dar opacidade nele */
  draggingId: string | null;
  /** id da ocorrência recém-movida — anima a entrada dela na coluna nova */
  justMovedId: string | null;
  /** true quando o cursor está sobre esta coluna durante um arrasto válido */
  over: boolean;
};

/** Uma coluna do quadro. Drag-and-drop via HTML5 nativo (ver OccurrenceBoardCard).
 *  Visual "editorial": sem borda/sem acento de cor — só o header discreto. */
export const BoardColumn = memo(function BoardColumn({
  status,
  occurrences,
  layout,
  onCardClick,
  onCardDragStart,
  onCardDragEnd,
  onCardAdvance,
  onQuickAdd,
  onHover,
  onDropHere,
  dragFrom,
  draggingId,
  justMovedId,
  over,
}: Props) {
  const cfg = getWorkflowStatusConfig(status);
  const canDrop = dragFrom != null && dragFrom !== status;
  const highlight = over && canDrop;

  return (
    <div
      onDragOver={(e) => {
        if (!canDrop) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onHover(status);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHover(null);
      }}
      onDrop={(e) => {
        if (!canDrop) return;
        e.preventDefault();
        onDropHere(status);
      }}
      className={`group/col flex ${COL_WIDTH[layout.density]} shrink-0 flex-col rounded-lg transition-colors ${
        highlight ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
      }`}
    >
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          <span className="text-[13px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
            {cfg.label}
          </span>
          <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">
            {occurrences.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onQuickAdd(status)}
          title={`Nova ocorrência em "${cfg.label}"`}
          aria-label={`Nova ocorrência em ${cfg.label}`}
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-gray-300 opacity-0 transition-opacity hover:bg-black/[0.04] hover:text-gray-600 group-hover/col:opacity-100 dark:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {layout.show.contagem && (
        <p className="px-1 pb-2 text-[11px] text-gray-400 dark:text-gray-500">
          {occurrences.length} {occurrences.length === 1 ? "ocorrência" : "ocorrências"}
        </p>
      )}

      <div
        className={`board-col-scroll flex-1 overflow-y-auto pt-1 ${DENSITY_CARD_GAP[layout.density]}`}
        style={{ maxHeight: "calc(100vh - 360px)" }}
      >
        {occurrences.length === 0 && !highlight && (
          <p className="px-1 py-8 text-center text-xs text-gray-300 dark:text-gray-700">Vazio</p>
        )}
        {occurrences.map((o) => (
          <OccurrenceBoardCard
            key={o.id}
            occurrence={o}
            layout={layout}
            onSelect={onCardClick}
            onDragStart={onCardDragStart}
            onDragEnd={onCardDragEnd}
            onAdvance={onCardAdvance}
            dragging={draggingId === o.id}
            justMoved={justMovedId === o.id}
          />
        ))}
        {highlight && (
          <div className="flex h-14 items-center justify-center rounded-md border border-dashed border-blue-300 text-[11px] font-medium text-blue-500 dark:border-blue-700 dark:text-blue-400">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  );
});
