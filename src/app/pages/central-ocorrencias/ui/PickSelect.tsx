import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { cn } from "../../../components/ui/utils";

export type PickOption = { value: string; label: ReactNode; dot?: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: PickOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** "sm" (padrão, filtros do quadro) ou "md" (formulários / painel). */
  size?: "sm" | "md";
  className?: string;
  contentClassName?: string;
};

/**
 * Select estilizado (Radix/shadcn) — substitui os `<select>` nativos da
 * Central de Ocorrências, que herdavam o visual cru do navegador.
 */
export function PickSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  disabled,
  size = "sm",
  className,
  contentClassName,
}: Props) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        aria-label={ariaLabel}
        size={size === "sm" ? "sm" : "default"}
        className={cn(
          "cursor-pointer rounded-lg bg-white hover:border-gray-300 dark:bg-gray-900 dark:hover:border-gray-600 disabled:cursor-not-allowed",
          size === "sm" ? "text-xs" : "text-sm",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn(size === "sm" ? "text-xs" : "text-sm", contentClassName)}>
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className={cn("cursor-pointer", size === "sm" ? "text-xs" : "text-sm")}
          >
            <span className="flex items-center gap-2">
              {o.dot && <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", o.dot)} />}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
