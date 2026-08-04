import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MapPin, MapPinPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useLocaisSearch } from "../../../features/occurrences/queries/locais/locais.queries";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { inputAceso } from "../DriverPicker/DriverPicker";
import { LocalCreateModal } from "../LocalCreateModal/LocalCreateModal";
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
  const [showCreateModal, setShowCreateModal] = useState(false);

  const debounced = useDebouncedValue(search, 300);
  const { data, isLoading, isError } = useLocaisSearch(debounced);

  const options = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const displayText = value
    ? value.sigla
      ? `[${value.sigla}] ${value.nome}`
      : value.nome
    : "Selecione o local...";

  function closeMenu() {
    setIsOpen(false);
    setSearch("");
  }

  // Fecha o menu ao rolar a página — evita ele ficar "flutuando" desalinhado
  // do campo enquanto o usuário rola. Ignora o scroll da própria lista de
  // resultados dentro do menu (senão rolar a lista já fecharia o menu).
  useEffect(() => {
    if (!isOpen) return;
    function handleScroll(e: Event) {
      const target = e.target;
      if (target instanceof Element && target.closest('[data-slot="popover-content"]')) return;
      closeMenu();
    }
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <div className="relative">
      <LocalCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        initialNome={search}
        onCreated={(local) => {
          onChange(local);
          setIsOpen(false);
          setSearch("");
        }}
      />

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
        Local da Parada {required && <span className="text-red-600 dark:text-red-400">*</span>}
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
              "hover:border-white/60 focus:outline-none focus:ring-2 focus:ring-slate-900/15",
              inputAceso,
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            <span className={value ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}>
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
              placeholder="Buscar local..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={[
                "w-full h-10 px-3 rounded-lg border",
                "text-slate-900 dark:text-slate-100",
                inputAceso,
              ].join(" ")}
              autoFocus
            />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
              className={[
                "cursor-pointer w-full h-10 px-3 rounded-lg",
                "flex items-center justify-center gap-2",
                "bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10",
                "hover:bg-white/70 dark:hover:bg-white/15",
                "text-slate-800 dark:text-slate-200 font-medium",
              ].join(" ")}
            >
              <MapPinPlus className="w-4 h-4" />
              Cadastrar local
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-400">
                Buscando locais...
              </div>
            ) : isError ? (
              <div className="p-4 text-sm text-red-700 dark:text-red-400">
                Erro ao buscar locais. Tente novamente.
              </div>
            ) : options.length === 0 ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-400">
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
                    "hover:bg-white/60 dark:hover:bg-white/10 border-b border-white/10 dark:border-white/5 last:border-b-0 transition-colors",
                    value?.id === local.id ? "bg-blue-50/50 dark:bg-blue-950/40" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {local.sigla && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex-shrink-0 tabular-nums">
                            {local.sigla}
                          </span>
                        )}
                        <span className="text-sm text-slate-900 dark:text-slate-100 truncate">{local.nome}</span>
                      </div>
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
