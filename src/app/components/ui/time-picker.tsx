import { useState, useRef } from "react";
import { Clock, X } from "lucide-react";
import { cn } from "./utils";

interface TimePickerProps {
  value: string;           // HH:MM
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  disabled?: boolean;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Digite o horário",
  className,
  hasError = false,
  disabled = false,
}: TimePickerProps) {
  const [focused, setFocused] = useState(false);
  const [digits, setDigits]   = useState("");
  const inputRef              = useRef<HTMLInputElement>(null);

  const [hh, mm] = value ? value.split(":") : ["", ""];
  const hasValue  = !!hh && !!mm;

  function formatDigits(d: string): string {
    if (d.length === 0) return "";
    if (d.length <= 2)  return d;
    return `${d.slice(0, 2)}:${d.slice(2)}`;
  }

  const displayValue = focused ? formatDigits(digits) : (hasValue ? value : "");

  function handleFocus() {
    setFocused(true);
    setDigits(hasValue ? `${hh}${mm}` : "");
  }

  function handleBlur() {
    setFocused(false);
    setDigits("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      const next = digits.slice(0, -1);
      setDigits(next);
      if (next.length === 0) onChange("");
      return;
    }

    if (e.key === "Tab" || e.key === "Escape") return;

    if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }
    if (digits.length >= 4)  { e.preventDefault(); return; }

    const next = digits + e.key;
    setDigits(next);

    if (next.length === 4) {
      const h = next.slice(0, 2);
      const m = next.slice(2, 4);
      if (Number(h) <= 23 && Number(m) <= 59) {
        onChange(`${h}:${m}`);
      } else {
        setDigits("");
        onChange("");
      }
    }

    e.preventDefault();
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setDigits("");
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full">
      {/* Input row — mesma altura e estilo do DatePicker */}
      <div
        className={cn(
          "flex items-center gap-2.5 w-full px-3 py-2 rounded-md border bg-white text-sm",
          "transition-colors cursor-text",
          disabled
            ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
            : hasError
              ? "border-red-300 ring-2 ring-red-100"
              : focused
                ? "border-blue-500 ring-2 ring-blue-500/20"
                : "border-gray-300 hover:border-blue-400",
          className,
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <Clock
          className={cn(
            "w-4 h-4 flex-shrink-0 transition-colors duration-150",
            focused ? "text-blue-500" : "text-gray-400",
          )}
        />

        <input
          ref={inputRef}
          readOnly
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent outline-none",
            "text-sm text-gray-900 placeholder:text-gray-400",
            disabled && "cursor-not-allowed",
          )}
        />

        {hasValue && !focused && !disabled && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Contador — flutua abaixo sem alterar a altura do campo */}
      {focused && (
        <span className="absolute right-0 -bottom-5 text-[11px] text-gray-400 tabular-nums select-none">
          {digits.length}/4 dígitos
        </span>
      )}
    </div>
  );
}
