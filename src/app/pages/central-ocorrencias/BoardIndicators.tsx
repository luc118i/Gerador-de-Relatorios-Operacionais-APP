import { useEffect, useRef, useState } from "react";
import type { OccurrenceDTO, Prioridade, WorkflowStatus } from "../../../domain/occurrences";
import { HIGH_PRIORITIES } from "../../config/occurrenceWorkflow";

const CONFETTI = [
  { left: "6%", color: "#10b981", delay: "0ms" },
  { left: "18%", color: "#34d399", delay: "60ms" },
  { left: "31%", color: "#6ee7b7", delay: "20ms" },
  { left: "44%", color: "#059669", delay: "110ms" },
  { left: "57%", color: "#34d399", delay: "40ms" },
  { left: "69%", color: "#a7f3d0", delay: "90ms" },
  { left: "81%", color: "#10b981", delay: "10ms" },
  { left: "93%", color: "#6ee7b7", delay: "70ms" },
];

export type IndicatorFilter =
  | { kind: "all" }
  | { kind: "status"; status: WorkflowStatus }
  | { kind: "priority"; priorities: Prioridade[] };

type Props = {
  occurrences: OccurrenceDTO[];
  active: IndicatorFilter;
  onPick: (f: IndicatorFilter) => void;
  /** "tiles" = só os indicadores clicáveis; "progress" = só a barra de
   *  progresso; "full" (padrão) = os dois. */
  variant?: "tiles" | "progress" | "full";
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
      className={`flex min-w-[92px] cursor-pointer flex-col items-start rounded-md px-2.5 py-1.5 transition-colors ${
        active
          ? "bg-black/[0.04] dark:bg-white/[0.06]"
          : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      }`}
    >
      <span
        className={`text-[17px] font-semibold tabular-nums ${
          accent ?? "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </span>
      <span
        className={`text-[11px] tracking-wide ${
          active
            ? "font-medium text-blue-600 dark:text-blue-400"
            : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

/** Indicadores clicáveis do topo (spec §11) — cada um aplica o filtro
 *  correspondente ao quadro. */
export function BoardIndicators({ occurrences, active, onPick, variant = "full" }: Props) {
  const showTiles = variant !== "progress";
  const showProgress = variant !== "tiles";
  const by = (s: WorkflowStatus) => occurrences.filter((o) => o.workflowStatus === s).length;
  const highPrio = occurrences.filter((o) => HIGH_PRIORITIES.includes((o.prioridade ?? "MEDIA") as Prioridade)).length;

  const isActive = (f: IndicatorFilter) => JSON.stringify(f) === JSON.stringify(active);

  const total = occurrences.length;
  const tratadas = by("TRATADA");
  const pct = total ? Math.round((tratadas / total) * 100) : 0;
  const done = total > 0 && tratadas === total;

  // "pop" + confete só na transição pra 100%
  const [celebrate, setCelebrate] = useState(false);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 1100);
      wasDone.current = done;
      return () => clearTimeout(t);
    }
    wasDone.current = done;
  }, [done]);

  return (
    <div className={showTiles && showProgress ? "space-y-2" : undefined}>
    {showTiles && (
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
    )}

      {showProgress && (
      /* Progresso: tratadas / total no período */
      <div className="flex items-center gap-2">
        <div className="relative h-1 flex-1 rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              done
                ? `central-bar-done ${celebrate ? "central-bar-pop" : ""}`
                : "bg-emerald-500"
            }`}
            style={{ width: `${pct}%` }}
          />
          {celebrate &&
            CONFETTI.map((c, i) => (
              <span
                key={i}
                className="central-confetti-piece"
                style={{ left: c.left, backgroundColor: c.color, animationDelay: c.delay }}
              />
            ))}
        </div>
        <span
          className={`shrink-0 text-[11px] tabular-nums transition-colors ${
            done
              ? "font-semibold text-emerald-600 dark:text-emerald-400"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {done ? "Tudo tratado 🎉" : `${tratadas}/${total} tratadas`}
        </span>
      </div>
      )}
    </div>
  );
}
