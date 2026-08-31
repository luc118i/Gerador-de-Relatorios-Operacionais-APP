import type { ReactNode } from "react";
import { cn } from "../../../app/components/ui/utils";

/** Card branco padrão — borda suave, canto arredondado, sem sombra forte. */
export function Panel({
  className,
  children,
  as: As = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section";
}) {
  return (
    <As
      className={cn(
        "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function SectionTitle({
  children,
  icon,
  right,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-4", className)}>
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
        {icon}
        {children}
      </h3>
      {right}
    </div>
  );
}

/** Barra de progresso horizontal fina (rankings, "por tipo", etc.). */
export function MiniBar({
  pct,
  tone = "blue",
  className,
}: {
  pct: number;
  tone?: "blue" | "red" | "amber" | "violet" | "emerald" | "gray";
  className?: string;
}) {
  const fill: Record<string, string> = {
    blue: "bg-blue-500",
    red: "bg-red-400",
    amber: "bg-amber-400",
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
    gray: "bg-gray-300 dark:bg-gray-600",
  };
  return (
    <div className={cn("h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", fill[tone])}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

/**
 * Indicador de tendência (↑/↓ vs. período anterior). Na Fase 1 não há
 * período de comparação, então só é renderizado quando `delta` é passado
 * explicitamente. Deixado pronto pra Fase 2.
 */
export function TrendIndicator({ delta }: { delta?: number | null }) {
  if (delta == null || !Number.isFinite(delta)) return null;
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
        flat
          ? "text-gray-400 dark:text-gray-500"
          : up
            ? "text-red-500"
            : "text-emerald-500",
      )}
      title="vs. período anterior"
    >
      {flat ? "→" : up ? "↑" : "↓"} {Math.abs(delta).toFixed(1).replace(".", ",")}%
    </span>
  );
}
