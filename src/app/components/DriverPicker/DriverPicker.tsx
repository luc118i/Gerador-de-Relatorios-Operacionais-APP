import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, UserPlus, User } from "lucide-react";
import type { Driver } from "../../../domain/drivers";
import { useDriversSearch } from "../../../features/occurrences/queries/drivers.queries";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import type { DriverPickerProps } from "./driverPicker.types";

function driverLabel(d: Driver) {
  const base = d.base ? ` (${d.base})` : "";
  return `${d.code} — ${d.name}${base}`;
}

export const inputAceso =
  "bg-blue-50/50 border-blue-200 hover:border-blue-300 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 " +
  "transition";

export function DriverPicker({
  label,
  value,
  onChange,
  required,
  disabled,
  excludedIds = [],
  onCreateRequested,
}: DriverPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const debounced = useDebouncedValue(search, 300);
  const { data, isLoading, isError } = useDriversSearch(debounced);

  // fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className={[
          "cursor-pointer w-full px-3 py-2 rounded-lg text-left flex items-center justify-between",

          "hover:border-white/60",
          "focus:outline-none focus:ring-2 focus:ring-slate-900/15",
          inputAceso,
          "disabled:opacity-60 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        <span
          className={selected || value ? "text-slate-900" : "text-slate-400"}
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

      {isOpen && !disabled ? (
        <div className="absolute z-20 w-full mt-2 rounded-xl border border-white/30 bg-white/75 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden">
          <div className="p-2 border-b border-white/20 space-y-2">
            <input
              type="text"
              placeholder="Buscar por matrícula, nome ou base..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={[
                "w-full h-10 px-3 rounded-lg border",
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
                  "bg-white/60 border border-white/30",
                  "hover:bg-white/70",
                  "text-slate-800 font-medium",
                ].join(" ")}
              >
                <UserPlus className="w-4 h-4" />
                Cadastrar motorista
              </button>
            ) : null}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-slate-600">
                Buscando motoristas...
              </div>
            ) : isError ? (
              <div className="p-4 text-sm text-red-700">
                Erro ao buscar motoristas. Tente novamente.
              </div>
            ) : options.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">
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
                    "hover:bg-white/60 border-b border-white/10 last:border-b-0",
                    "transition-colors",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-slate-400 mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">
                        {d.code}
                      </div>
                      <div className="text-sm text-slate-700">{d.name}</div>
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
        </div>
      ) : null}
    </div>
  );
}
