import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { useLocaisSearch } from "../../../features/occurrences/queries/locais/locais.queries";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { inputAceso } from "../DriverPicker/DriverPicker";
import type { Local } from "../../../api/locais.api";

interface LocalPickerProps {
  value: Local | null;
  onChange: (local: Local | null) => void;
  required?: boolean;
  disabled?: boolean;
}

export function LocalPicker({
  value,
  onChange,
  required,
  disabled,
}: LocalPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const debounced = useDebouncedValue(search, 300);
  const { data, isLoading, isError } = useLocaisSearch(debounced);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const displayText = value ? value.nome : "Selecione o local...";

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Local da Parada {required && <span className="text-red-600">*</span>}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className={[
          "cursor-pointer w-full px-3 py-2 rounded-lg text-left flex items-center justify-between",
          "hover:border-white/60 focus:outline-none focus:ring-2 focus:ring-slate-900/15",
          inputAceso,
          "disabled:opacity-60 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {displayText}
        </span>
        <ChevronDown
          className={[
            "w-4 h-4 text-slate-400 transition-transform",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-20 w-full mt-2 rounded-xl border border-white/30 bg-white/75 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden">
          <div className="p-2 border-b border-white/20">
            <input
              type="text"
              placeholder="Buscar local..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={[
                "w-full h-10 px-3 rounded-lg border",
                inputAceso,
              ].join(" ")}
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-slate-600">
                Buscando locais...
              </div>
            ) : isError ? (
              <div className="p-4 text-sm text-red-700">
                Erro ao buscar locais. Tente novamente.
              </div>
            ) : options.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">
                Nenhum local encontrado.
              </div>
            ) : (
              options.map((local) => (
                <button
                  key={local.id}
                  type="button"
                  onClick={() => {
                    onChange(local);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={[
                    "cursor-pointer w-full px-4 py-3 text-left",
                    "hover:bg-white/60 border-b border-white/10 last:border-b-0 transition-colors",
                    value?.id === local.id ? "bg-blue-50/50" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <div className="text-sm text-slate-900">{local.nome}</div>
                      <div className="text-xs text-slate-400">
                        ID {local.id}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
