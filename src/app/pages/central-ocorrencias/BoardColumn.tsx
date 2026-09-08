import { memo } from "react";
import { Plus } from "lucide-react";
import type { OccurrenceDTO, WorkflowStatus } from "../../../domain/occurrences";
import { getWorkflowStatusConfig } from "../../config/occurrenceWorkflow";
import { OccurrenceBoardCard } from "./OccurrenceBoardCard";

type Props = {
  status: WorkflowStatus;
  occurrences: OccurrenceDTO[];
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

/** Uma coluna do quadro. Drag-and-drop via HTML5 nativo (ver OccurrenceBoardCard). */
export const BoardColumn = memo(function BoardColumn({
  status,
  occurrences,
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
      className={`flex w-[300px] shrink-0 flex-col rounded-xl border bg-gray-50/60 dark:bg-gray-900/40 transition-colors ${
        highlight
          ? "border-blue-400 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/30"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div
        className={`flex items-center justify-between rounded-t-xl border-t-2 px-3 py-2.5 ${cfg.columnAccent}`}
      >
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{cfg.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-gray-200 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
            {occurrences.length}
          </span>
          <button
            type="button"
            onClick={() => onQuickAdd(status)}
            title={`Nova ocorrência em "${cfg.label}"`}
            aria-label={`Nova ocorrência em ${cfg.label}`}
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        className="board-col-scroll flex-1 space-y-2 overflow-y-auto p-2"
        style={{ maxHeight: "calc(100vh - 320px)" }}
      >
        {occurrences.length === 0 && !highlight && (
          <p className="px-2 py-8 text-center text-xs text-gray-400 dark:text-gray-600">Nada aqui</p>
        )}
        {occurrences.map((o) => (
          <OccurrenceBoardCard
            key={o.id}
            occurrence={o}
            onSelect={onCardClick}
            onDragStart={onCardDragStart}
            onDragEnd={onCardDragEnd}
            onAdvance={onCardAdvance}
            dragging={draggingId === o.id}
            justMoved={justMovedId === o.id}
          />
        ))}
        {/* Placeholder do drop — mostra onde o card vai cair */}
        {highlight && (
          <div className="flex h-14 items-center justify-center rounded-lg border-2 border-dashed border-blue-300 text-[11px] font-medium text-blue-500 dark:border-blue-700 dark:text-blue-400">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  );
});
