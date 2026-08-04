import { useEffect, useMemo, useState } from "react";
import { ChevronDown, UserPlus, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import type { Driver } from "../../../domain/drivers";
import { useDriversSearch } from "../../../features/occurrences/queries/drivers.queries";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import type { DriverPickerProps } from "./driverPicker.types";

function driverLabel(d: Driver) {
  const base = d.base ? ` (${d.base})` : "";
  return `${d.code} — ${d.name}${base}`;
}

export const inputAceso =
  "bg-blue-50/50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 hover:border-blue-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 " +
  "transition";

export function DriverPicker({
  label,
  value,
  onChange,
  required,
  initialDriver,
  disabled,
  excludedIds = [],
  onCreateRequested,
}: DriverPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const debounced = useDebouncedValue(search, 300);
  const { data, isLoading, isError } = useDriversSearch(debounced);

  useEffect(() => {
    if (initialDriver && value === initialDriver.id) {
      setSelectedDriver({
        id: initialDriver.id,
        code: initialDriver.code,
        name: initialDriver.name,
        base: initialDriver.base ?? null,
      });
    }
  }, [initialDriver, value]);

  const options = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    if (!Array.isArray(data) && data != null) {
      console.warn("DriverPicker: resposta de drivers não é array:", data);
    }

    const excluded = new Set(excludedIds.filter(Boolean));
    return list.filter((d) => !excluded.has(d.id));
  }, [data, excludedIds]);

  const selected: Driver | undefined = useMemo(() => {
    if (!data || !value) return undefined;
    return data.find((d) => d.id === value);
  }, [data, value]);

  useEffect(() => {
    if (!value) {
      setSelectedDriver(null);
      return;
    }

    // quando a lista carregou e contém o driver selecionado
    if (selected) {
      setSelectedDriver(selected);
    }
  }, [value, selected]);

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const displayText = selectedDriver
    ? driverLabel(selectedDriver)
    : value
      ? "Carregando motorista..."
      : "Selecione um motorista";

  function closeMenu() {
    setIsOpen(false);
    setSearch("");
  }

  // Fecha o menu ao rolar a página — evita ele ficar "flutuando" desalinhado
  // do campo enquanto o usuário rola.
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("scroll", closeMenu, true);
    return () => window.removeEventListener("scroll", closeMenu, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
        {label} {required ? <span className="text-red-600 dark:text-red-400">*</span> : null}
      </label>

      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (disabled) return;
          open ? setIsOpen(true) : closeMenu();
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={[
              "cursor-pointer w-full px-3 py-2 rounded-lg text-left flex items-center justify-between",

              "hover:border-white/60",
              "focus:outline-none focus:ring-2 focus:ring-slate-900/15",
              inputAceso,
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            <span
              className={selected || value ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}
            >
              {displayText}
            </span>
            <ChevronDown
              className={[
                "w-4 h-4 text-slate-400 transition-transform",
                isOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={8}
          style={{ width: "var(--radix-popover-trigger-width)" }}
          className="z-[100] p-0 rounded-xl border border-white/30 dark:border-white/10 bg-white/75 dark:bg-gray-900/85 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden"
        >
          <div className="p-2 border-b border-white/20 dark:border-white/10 space-y-2">
            <input
              type="text"
              placeholder="Buscar por matrícula, nome ou base..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={[
                "w-full h-10 px-3 rounded-lg border",
                "text-slate-900 dark:text-slate-100",
                inputAceso,
              ].join(" ")}
              autoFocus
            />

            {onCreateRequested ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCreateRequested();
                }}
                className={[
                  "cursor-pointer w-full h-10 px-3 rounded-lg",
                  "flex items-center justify-center gap-2",
                  "bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10",
                  "hover:bg-white/70 dark:hover:bg-white/15",
                  "text-slate-800 dark:text-slate-200 font-medium",
                ].join(" ")}
              >
                <UserPlus className="w-4 h-4" />
                Cadastrar motorista
              </button>
            ) : null}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-400">
                Buscando motoristas...
              </div>
            ) : isError ? (
              <div className="p-4 text-sm text-red-700 dark:text-red-400">
                Erro ao buscar motoristas. Tente novamente.
              </div>
            ) : options.length === 0 ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-400">
                Nenhum motorista encontrado.
              </div>
            ) : (
              options.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDriver(d);
                    onChange(d.id, d);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={[
                    "cursor-pointer w-full px-4 py-3 text-left",
                    "hover:bg-white/60 dark:hover:bg-white/10 border-b border-white/10 dark:border-white/5 last:border-b-0",
                    "transition-colors",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-slate-400 mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {d.code}
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-400">{d.name}</div>
                      {d.base ? (
                        <div className="text-xs text-slate-500 mt-1">
                          {d.base}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
