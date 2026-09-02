import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  useBasesRegistry,
  type BaseOption,
} from "../../../features/occurrences/queries/bases.queries";

interface BaseSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function BaseSelect({
  value,
  onChange,
  error,
  disabled,
  required,
  id,
}: BaseSelectProps) {
  const { options, isLoading, isError, refetch } = useBasesRegistry();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [listIn, setListIn] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () =>
      value
        ? options.find((o) => o.value.toUpperCase() === value.toUpperCase())
        : undefined,
    [options, value],
  );

  // Base preenchida mas ausente do cadastro oficial (dado legado). Não pode
  // ser salva assim — o gatilho sinaliza e a validação do formulário bloqueia.
  const legacyValue = value && !selected ? value : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.sigla.toLowerCase().includes(q) ||
        o.cidade.toLowerCase().includes(q),
    );
  }, [options, search]);

  const noBases = !isLoading && !isError && options.length === 0;

  function close() {
    setOpen(false);
    setSearch("");
  }

  function pick(option: BaseOption) {
    onChange(option.value);
    close();
    triggerRef.current?.focus();
  }

  // Fecha ao clicar fora ou apertar Esc. O Esc é capturado para não vazar
  // para o Dialog pai (senão fecharia o modal inteiro).
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  // Stagger da lista uma vez por abertura (ver .combo-list em index.css) + foco
  // no campo de busca.
  useEffect(() => {
    if (!open) {
      setListIn(false);
      return;
    }
    searchRef.current?.focus();
    const raf = requestAnimationFrame(() => setListIn(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const triggerState = error
    ? "border-red-400 dark:border-red-500 ring-2 ring-red-500/20"
    : legacyValue
      ? "border-amber-400 dark:border-amber-500"
      : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20";

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        Base
        {required && <span className="text-red-500"> *</span>}
      </label>

      <button
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled || noBases}
        aria-invalid={!!error}
        aria-expanded={open}
        onClick={() => {
          if (disabled || noBases) return;
          setOpen((o) => !o);
        }}
        className={[
          "w-full h-11 pl-3.5 pr-2.5 rounded-xl border text-left text-[15px]",
          "bg-white/70 dark:bg-white/5 shadow-sm transition",
          "flex items-center gap-2",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          triggerState,
        ].join(" ")}
      >
        <Building2 className="w-4 h-4 shrink-0 text-slate-400" />

        <span className="flex-1 min-w-0 truncate">
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 tabular-nums">
                {selected.sigla}
              </span>
              <span className="truncate text-slate-900 dark:text-slate-100">
                {selected.label}
              </span>
            </span>
          ) : legacyValue ? (
            <span className="flex items-center gap-2">
              <span className="truncate text-slate-900 dark:text-slate-100">
                {legacyValue}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                <TriangleAlert className="w-3 h-3" />
                não cadastrada
              </span>
            </span>
          ) : (
            <span className="text-slate-400">
              {noBases
                ? "Nenhuma base disponível"
                : isLoading
                  ? "Carregando bases…"
                  : "Selecione a base"}
            </span>
          )}
        </span>

        {selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Limpar base"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}

        <ChevronDown
          className={[
            "w-4 h-4 shrink-0 text-slate-400 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-white/50 dark:border-white/10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden">
          <div className="p-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar base ou sigla…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
              />
            </div>
          </div>

          <div
            className={`combo-list max-h-56 overflow-y-auto overscroll-contain py-1${listIn ? " is-in" : ""}`}
          >
            {isLoading ? (
              <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                Carregando bases…
              </div>
            ) : isError ? (
              <div className="px-4 py-6 text-sm text-center">
                <p className="text-red-600 dark:text-red-400">
                  Erro ao carregar as bases.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                Nenhuma base encontrada para “{search}”.
              </div>
            ) : (
              filtered.map((option) => {
                const isActive =
                  !!value &&
                  option.value.toUpperCase() === value.toUpperCase();
                return (
                  <button
                    key={option.sigla}
                    type="button"
                    onClick={() => pick(option)}
                    className={[
                      "w-full px-3 py-2.5 text-left flex items-center gap-2.5 transition-colors",
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40"
                        : "hover:bg-slate-100/70 dark:hover:bg-white/5",
                    ].join(" ")}
                  >
                    <span className="inline-flex items-center justify-center min-w-[3rem] px-1.5 py-1 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 tabular-nums">
                      {option.sigla}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm text-slate-800 dark:text-slate-100">
                      {option.label}
                    </span>
                    {isActive && (
                      <Check className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      ) : legacyValue ? (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
          “{legacyValue}” não está no cadastro oficial. Selecione uma base
          válida para salvar.
        </p>
      ) : noBases ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Nenhuma base cadastrada. Cadastre em{" "}
          <span className="font-medium">Base e Responsáveis</span> antes de
          definir a base do motorista.
        </p>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Somente bases já cadastradas no sistema.
        </p>
      )}
    </div>
  );
}
