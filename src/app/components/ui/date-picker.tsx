import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./calendar";
import { cn } from "./utils";

interface DatePickerProps {
  value: string;           // YYYY-MM-DD
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione a data",
  className,
  hasError = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const valid = date ? isValid(date) : false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2.5 w-full px-3 py-2 rounded-md border text-sm text-left",
            "bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0",
            hasError
              ? "border-red-300 focus:ring-red-400"
              : "border-gray-300 hover:border-blue-400 focus:ring-blue-500",
            !valid && "text-gray-400",
            className,
          )}
        >
          <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className={cn("flex-1", valid ? "text-gray-900" : "text-gray-400")}>
            {valid
              ? format(date!, "dd 'de' MMM. 'de' yyyy", { locale: ptBR })
              : placeholder}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 shadow-lg border border-gray-200" align="start">
        <Calendar
          mode="single"
          selected={valid ? date : undefined}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
