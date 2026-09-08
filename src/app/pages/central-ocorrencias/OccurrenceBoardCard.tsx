import { memo } from "react";
import { ArrowRight, Bus, FileCheck2, GripVertical, MapPin, User } from "lucide-react";
import type { OccurrenceDTO } from "../../../domain/occurrences";
import { getOccurrenceFieldVisibility } from "../../config/occurrencePresentation";
import { getOccurrenceTypeConfig } from "../../config/occurrenceTypes";
import {
  getPrioridadeConfig,
  getWorkflowStatusConfig,
  isRecentlyCreated,
  nextBoardStatus,
} from "../../config/occurrenceWorkflow";
import { resolveBaseSigla } from "../../../utils/base";

/** "YYYY-MM-DD" → "DD/MM". */
function shortDate(d?: string) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return m && day ? `${day}/${m}` : d;
}

/** Sufixo curto do UUID como "#id" legível no card (§3). */
function shortId(id: string) {
  return `#${id.slice(0, 8)}`;
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
  /** Estáveis (do pai) — o card os chama com a própria ocorrência. */
  onSelect: (o: OccurrenceDTO) => void;
  onDragStart: (o: OccurrenceDTO) => void;
  onDragEnd: () => void;
  /** Avança 1 clique pro próximo status do fluxo. */
  onAdvance: (o: OccurrenceDTO) => void;
  dragging: boolean;
  /** true logo após o card mudar de coluna — anima a entrada. */
  justMoved: boolean;
};

/**
 * Card do quadro. Arrasto via HTML5 drag nativo — só a alça (aparece no hover)
 * é `draggable`, pra não disparar arrasto acidental ao tentar clicar. Sem
 * react-dnd (custo de N assinaturas de monitor por evento com dezenas de cards).
 */
export const OccurrenceBoardCard = memo(function OccurrenceBoardCard({
  occurrence: o,
  onSelect,
  onDragStart,
  onDragEnd,
  onAdvance,
  dragging,
  justMoved,
}: Props) {
  const vis = getOccurrenceFieldVisibility(o);
  const prio = getPrioridadeConfig(o.prioridade);
  const d1 = firstDriver(o);
  const hasReport = !!o.driveWebViewLink || !!o.rizerRegistered;
  const next = nextBoardStatus(o.workflowStatus);
  const isNew = isRecentlyCreated(o.createdAt);

  const rota =
    o.tripLineName || (o.lineLabel ?? "").split(" - ").slice(1).join(" - ") || o.lineLabel || "";
  const baseSigla = d1?.baseCode ? resolveBaseSigla(d1.baseCode) : resolveBaseSigla(o.baseCode ?? "");

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
      className={`group relative w-full cursor-pointer text-left rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 pr-8 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
        dragging ? "opacity-40" : ""
      } ${
        justMoved
          ? "animate-in fade-in slide-in-from-left-6 duration-300 ease-out ring-2 ring-blue-400/40"
          : ""
      }`}
    >
      {/* Faixa de arrasto — ocupa toda a borda direita do card. Só ela é
          `draggable`; o resto do card é zona de clique (abrir detalhe). */}
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
        className="absolute right-0 top-0 bottom-0 flex w-6 cursor-grab flex-col items-center justify-center gap-1 rounded-r-lg border-l border-gray-100 bg-gray-50/80 text-gray-300 transition-colors group-hover:bg-gray-100 group-hover:text-gray-400 active:cursor-grabbing dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-600 dark:group-hover:bg-gray-800 dark:group-hover:text-gray-500"
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
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-gray-300 opacity-0 transition-opacity hover:bg-white hover:text-gray-700 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-gray-900 dark:hover:text-gray-200"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">{shortId(o.id)}</span>
          {isNew && (
            <span className="rounded-full bg-blue-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              Novo
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${prio.dot}`} />
          {prio.label}
        </span>
      </div>

      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
        {occSubject(o)}
      </p>

      <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
        {vis.prefixo && (
          <div className="flex items-center gap-1.5">
            <Bus className="w-3.5 h-3.5 shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">{o.vehicleNumber}</span>
            {baseSigla && <span className="text-gray-400 dark:text-gray-500">· {baseSigla}</span>}
            {vis.horario && o.startTime && (
              <span className="text-gray-400 dark:text-gray-500">· {o.startTime}</span>
            )}
          </div>
        )}
        {(vis.linha || rota) && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{rota || o.lineLabel}</span>
          </div>
        )}
        {vis.motorista && d1?.name && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{d1.name}</span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{shortDate(o.eventDate)}</span>
        {hasReport && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <FileCheck2 className="w-3.5 h-3.5" />
            Relatório
          </span>
        )}
      </div>
    </div>
  );
});
