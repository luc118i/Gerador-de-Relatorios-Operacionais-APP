import type { OccurrenceDTO, Prioridade, WorkflowStatus } from "../../../domain/occurrences";
import { HIGH_PRIORITIES } from "../../config/occurrenceWorkflow";

export type IndicatorFilter =
  | { kind: "all" }
  | { kind: "status"; status: WorkflowStatus }
  | { kind: "priority"; priorities: Prioridade[] };

type Props = {
  occurrences: OccurrenceDTO[];
  active: IndicatorFilter;
  onPick: (f: IndicatorFilter) => void;
};

function Tile({
  label,
  value,
  active,
  onClick,
  accent,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[104px] cursor-pointer flex-col items-start rounded-lg border px-3 py-2 transition-colors ${
        active
          ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800/50"
      }`}
    >
      <span className={`text-lg font-bold tabular-nums ${accent ?? "text-gray-900 dark:text-gray-100"}`}>
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</span>
    </button>
  );
}

/** Indicadores clicáveis do topo (spec §11) — cada um aplica o filtro
 *  correspondente ao quadro. */
export function BoardIndicators({ occurrences, active, onPick }: Props) {
  const by = (s: WorkflowStatus) => occurrences.filter((o) => o.workflowStatus === s).length;
  const highPrio = occurrences.filter((o) => HIGH_PRIORITIES.includes((o.prioridade ?? "MEDIA") as Prioridade)).length;

  const isActive = (f: IndicatorFilter) => JSON.stringify(f) === JSON.stringify(active);

  const total = occurrences.length;
  const tratadas = by("TRATADA");
  const pct = total ? Math.round((tratadas / total) * 100) : 0;

  return (
    <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <Tile
        label="Total"
        value={total}
        active={isActive({ kind: "all" })}
        onClick={() => onPick({ kind: "all" })}
      />
      <Tile
        label="Pendentes"
        value={by("PENDENTE")}
        active={isActive({ kind: "status", status: "PENDENTE" })}
        onClick={() => onPick({ kind: "status", status: "PENDENTE" })}
      />
      <Tile
        label="Em tratamento"
        value={by("EM_TRATAMENTO")}
        active={isActive({ kind: "status", status: "EM_TRATAMENTO" })}
        onClick={() => onPick({ kind: "status", status: "EM_TRATAMENTO" })}
      />
      <Tile
        label="Aguardando"
        value={by("AGUARDANDO_RETORNO")}
        active={isActive({ kind: "status", status: "AGUARDANDO_RETORNO" })}
        onClick={() => onPick({ kind: "status", status: "AGUARDANDO_RETORNO" })}
      />
      <Tile
        label="Tratadas"
        value={by("TRATADA")}
        active={isActive({ kind: "status", status: "TRATADA" })}
        onClick={() => onPick({ kind: "status", status: "TRATADA" })}
      />
      <Tile
        label="Alta prioridade"
        value={highPrio}
        accent="text-orange-600 dark:text-orange-400"
        active={isActive({ kind: "priority", priorities: HIGH_PRIORITIES })}
        onClick={() => onPick({ kind: "priority", priorities: HIGH_PRIORITIES })}
      />
    </div>

      {/* Progresso: tratadas / total no período */}
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
          {tratadas}/{total} tratadas
        </span>
      </div>
    </div>
  );
}
