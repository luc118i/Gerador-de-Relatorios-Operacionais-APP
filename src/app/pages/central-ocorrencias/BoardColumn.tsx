import { memo } from "react";
import { EyeOff, Plus } from "lucide-react";
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
  actor: { actorUserId?: string | null; actorNome?: string | null };
  /** Estáveis (do pai) — necessário pro memo desta coluna e dos cards valer. */
  onCardClick: (o: OccurrenceDTO) => void;
  onCardEdit: (id: string) => void;
  onCardDragStart: (o: OccurrenceDTO) => void;
  onCardDragEnd: () => void;
  onCardAdvance: (o: OccurrenceDTO) => void;
  onCardRegress: (o: OccurrenceDTO) => void;
  /** "+" no header da coluna → nova ocorrência já com esse status inicial */
  onQuickAdd: (status: WorkflowStatus) => void;
  /** ocultar esta coluna do quadro */
  onHide: (status: WorkflowStatus) => void;
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
  actor,
  onCardClick,
  onCardEdit,
  onCardDragStart,
  onCardDragEnd,
  onCardAdvance,
  onCardRegress,
  onQuickAdd,
  onHide,
  onHover,
  onDropHere,
  dragFrom,
  draggingId,
  justMovedId,
  over,
}: Props) {
  const cfg = getWorkflowStatusConfig(status);
  const dragging = dragFrom != null;
  const isSource = dragFrom === status;
  const canDrop = dragging && !isSource;
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
      className={`group/col flex ${COL_WIDTH[layout.density]} shrink-0 flex-col rounded-lg outline-dashed -outline-offset-1 transition-[background-color,outline-color,opacity] duration-150 ${
        highlight
          ? "bg-blue-50/60 outline-2 outline-blue-400 dark:bg-blue-950/25 dark:outline-blue-500"
          : canDrop
            ? "bg-blue-50/25 outline-1 outline-blue-300/70 dark:bg-blue-950/10 dark:outline-blue-800/70"
            : "outline-1 outline-transparent"
      } ${isSource ? "opacity-55" : ""}`}
    >
      {/* Cabeçalho da coluna — fixo logo abaixo do header principal enquanto
          o quadro rola. */}
      <div className="sticky top-0 z-10 bg-gray-50/90 pt-1 backdrop-blur-sm dark:bg-gray-950/90">
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
          <div className="flex items-center opacity-0 transition-opacity group-hover/col:opacity-100">
            <button
              type="button"
              onClick={() => onHide(status)}
              title={`Ocultar "${cfg.label}"`}
              aria-label={`Ocultar ${cfg.label}`}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-gray-300 hover:bg-black/[0.04] hover:text-gray-600 dark:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onQuickAdd(status)}
              title={`Nova ocorrência em "${cfg.label}"`}
              aria-label={`Nova ocorrência em ${cfg.label}`}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-gray-300 hover:bg-black/[0.04] hover:text-gray-600 dark:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {layout.show.contagem && (
          <p className="px-1 pb-2 text-[11px] text-gray-400 dark:text-gray-500">
            {occurrences.length} {occurrences.length === 1 ? "ocorrência" : "ocorrências"}
          </p>
        )}
      </div>

      <div className={`flex-1 pt-1 ${DENSITY_CARD_GAP[layout.density]}`}>
        {occurrences.length === 0 && !dragging && (
          <p className="px-1 py-8 text-center text-xs text-gray-300 dark:text-gray-700">Vazio</p>
        )}
        {occurrences.map((o) => (
          <OccurrenceBoardCard
            key={o.id}
            occurrence={o}
            layout={layout}
            actor={actor}
            onSelect={onCardClick}
            onEdit={onCardEdit}
            onDragStart={onCardDragStart}
            onDragEnd={onCardDragEnd}
            onAdvance={onCardAdvance}
            onRegress={onCardRegress}
            dragging={draggingId === o.id}
            justMoved={justMovedId === o.id}
          />
        ))}
        {highlight ? (
          <div className="flex h-14 items-center justify-center rounded-md border-2 border-dashed border-blue-400 bg-blue-50/60 text-[11px] font-semibold text-blue-600 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-300">
            Solte aqui
          </div>
        ) : canDrop ? (
          <div className="flex h-10 items-center justify-center rounded-md border border-dashed border-blue-300/70 text-[10px] font-medium text-blue-400/80 dark:border-blue-800/70 dark:text-blue-500/70">
            Mover para “{cfg.label}”
          </div>
        ) : null}
      </div>
    </div>
  );
});
