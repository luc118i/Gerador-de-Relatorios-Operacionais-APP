import { memo, useState } from "react";
import { ArrowRight, ChevronDown, FileCheck2, GripVertical, MapPin, User } from "lucide-react";
import type { OccurrenceDTO } from "../../../domain/occurrences";
import { getOccurrenceFieldVisibility } from "../../config/occurrencePresentation";
import { getOccurrenceTypeConfig } from "../../config/occurrenceTypes";
import {
  getPrioridadeConfig,
  getWorkflowStatusConfig,
  isRecentlyCreated,
  nextBoardStatus,
  treatmentProgress,
} from "../../config/occurrenceWorkflow";
import { resolveBaseSigla } from "../../../utils/base";
import { avatarColor, initialsOf } from "../../../utils/avatar";
import { DENSITY_CARD_PADDING, type CentralLayout } from "./useCentralLayout";
import { CardMenu } from "./CardMenu";

/** "YYYY-MM-DD" → "DD/MM". */
function shortDate(d?: string) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return m && day ? `${day}/${m}` : d;
}

function occSubject(o: OccurrenceDTO): string {
  if (o.typeCode === "GENERICO") return o.reportTitle || o.typeTitle || "Ocorrência";
  return o.occurrenceName || getOccurrenceTypeConfig(o.typeCode).title || o.typeTitle || "Ocorrência";
}

function firstDriver(o: OccurrenceDTO) {
  return o.drivers?.find((d) => d.position === 1) ?? null;
}

type Props = {
  occurrence: OccurrenceDTO;
  layout: CentralLayout;
  /** Estáveis (do pai) — o card os chama com a própria ocorrência. */
  onSelect: (o: OccurrenceDTO) => void;
  onEdit: (id: string) => void;
  onDragStart: (o: OccurrenceDTO) => void;
  onDragEnd: () => void;
  /** Avança 1 clique pro próximo status do fluxo. */
  onAdvance: (o: OccurrenceDTO) => void;
  actor: { actorUserId?: string | null; actorNome?: string | null };
  dragging: boolean;
  /** true logo após o card mudar de coluna — anima a entrada. */
  justMoved: boolean;
};

/**
 * Card do quadro — "bloco de informação editorial": borda fina, sem sombra,
 * cor só na faixa de prioridade CRÍTICA/ALTA. Arrasto via HTML5 nativo pela alça.
 */
export const OccurrenceBoardCard = memo(function OccurrenceBoardCard({
  occurrence: o,
  layout,
  onSelect,
  onEdit,
  onDragStart,
  onDragEnd,
  onAdvance,
  actor,
  dragging,
  justMoved,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const { show } = layout;
  const vis = getOccurrenceFieldVisibility(o);
  const prio = getPrioridadeConfig(o.prioridade);
  const d1 = firstDriver(o);
  const hasReport = !!o.driveWebViewLink || !!o.rizerRegistered;
  const next = nextBoardStatus(o.workflowStatus, layout.hiddenColumns);
  const isNew = isRecentlyCreated(o.createdAt);
  const prog = treatmentProgress(o);
  const descricao = (o.relatoHtml ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const prioCode = o.prioridade ?? "MEDIA";
  const stripe =
    show.prioridade && (prioCode === "CRITICA" || prioCode === "ALTA") ? prio.dot : null;
  const showDesc = descricao && (show.descricao || expanded);

  const rota =
    o.tripLineName || (o.lineLabel ?? "").split(" - ").slice(1).join(" - ") || o.lineLabel || "";
  const baseSigla = d1?.baseCode ? resolveBaseSigla(d1.baseCode) : resolveBaseSigla(o.baseCode ?? "");

  const meta = [
    show.datas ? shortDate(o.eventDate) : "",
    baseSigla,
    show.datas && vis.horario && o.startTime ? o.startTime : "",
  ].filter(Boolean);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(o)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(o);
        }
      }}
      className={`group relative w-full cursor-pointer rounded-md border border-gray-200/70 bg-white pr-7 text-left transition-[transform,border-color,opacity,box-shadow] duration-150 hover:-translate-y-px hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 ${
        DENSITY_CARD_PADDING[layout.density]
      } ${dragging ? "opacity-40" : ""} ${
        justMoved ? "animate-in fade-in slide-in-from-left-6 duration-300 ease-out" : ""
      }`}
    >
      {stripe && (
        <span className={`absolute inset-x-0 top-0 h-[3px] rounded-t-md ${stripe}`} />
      )}

      {/* Alça de arrasto — borda direita do card. Só ela é `draggable`. */}
      <div
        draggable
        onClick={(e) => e.stopPropagation()}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", o.id);
          onDragStart(o);
        }}
        onDragEnd={onDragEnd}
        title="Arrastar para outra coluna"
        aria-label="Arrastar ocorrência"
        className="absolute bottom-0 right-0 top-0 flex w-6 cursor-grab flex-col items-center justify-center gap-1 rounded-r-md text-gray-200 opacity-0 transition-opacity duration-150 group-hover:opacity-100 active:cursor-grabbing dark:text-gray-700"
      >
        <GripVertical className="h-4 w-4" />
        {next && (
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(o);
            }}
            title={`Avançar para "${getWorkflowStatusConfig(next).label}"`}
            aria-label={`Avançar para ${getWorkflowStatusConfig(next).label}`}
            className="flex h-5 w-5 items-center justify-center rounded text-gray-300 hover:bg-black/[0.04] hover:text-gray-600 dark:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
            {o.vehicleNumber}
          </span>
          {isNew && (
            <span className="rounded bg-blue-50 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              Novo
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
          {show.prioridade && (
            <span className="flex items-center gap-1">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${prio.dot}`} />
              {prio.label}
            </span>
          )}
          {(descricao || prog.done > 0) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              aria-label={expanded ? "Recolher" : "Expandir"}
              className="flex h-4 w-4 items-center justify-center rounded text-gray-300 hover:bg-black/[0.04] hover:text-gray-500 dark:text-gray-600 dark:hover:bg-white/[0.06]"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
          <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <CardMenu
              occurrence={o}
              actor={actor}
              hiddenColumns={layout.hiddenColumns}
              onOpen={onSelect}
              onEdit={onEdit}
            />
          </span>
        </span>
      </div>

      <p className="mt-1 text-[14px] font-semibold leading-snug text-gray-900 line-clamp-2 dark:text-gray-100">
        {occSubject(o)}
      </p>

      {showDesc && (
        <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500 line-clamp-3 dark:text-gray-400">
          {descricao}
        </p>
      )}

      {expanded && prog.done > 0 && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            <span>Tratamento</span>
            <span className="tabular-nums">
              {prog.done}/{prog.total}
            </span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${(prog.done / prog.total) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 pt-0.5">
            {prog.steps.map((s) => (
              <span
                key={s.label}
                className={`text-[10px] ${
                  s.done ? "text-emerald-600 dark:text-emerald-400" : "text-gray-300 dark:text-gray-600"
                }`}
              >
                {s.done ? "✓" : "○"} {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
        {vis.linha && (rota || o.lineLabel) && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
            <span className="truncate">{rota || o.lineLabel}</span>
          </div>
        )}
        {vis.motorista && d1?.name && (
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
            <span className="truncate">{d1.name}</span>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {o.analisadoPor && (
            <span
              title={o.analisadoPor}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${avatarColor(o.analisadoPor)}`}
            >
              {initialsOf(o.analisadoPor)}
            </span>
          )}
          {meta.length > 0 && (
            <span className="truncate text-[11px] text-gray-400 dark:text-gray-500">
              {meta.join(" · ")}
            </span>
          )}
          {prog.done > 0 && !expanded && (
            <span className="shrink-0 rounded bg-gray-100 px-1 text-[9px] font-semibold tabular-nums text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              {prog.done}/{prog.total}
            </span>
          )}
        </span>
        {hasReport && (
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <FileCheck2 className="h-3.5 w-3.5" />
            Relatório
          </span>
        )}
      </div>
    </div>
  );
});
