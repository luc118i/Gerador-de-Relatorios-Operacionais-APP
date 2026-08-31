import { useState } from "react";
import { Filter, SlidersHorizontal, X, Search } from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../../app/components/ui/sheet";
import { Checkbox } from "../../../app/components/ui/checkbox";
import { useReport } from "../ReportContext";
import { abbrevType } from "../occ-helpers";
import { SEVERITY_LABEL, type Severity } from "../types";

const SEVERITIES: Severity[] = ["high", "medium", "low"];

function Chip({
  label,
  active,
  onClick,
  tone = "blue",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "blue" | "red";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "cursor-pointer text-xs font-medium px-2.5 py-1 rounded-full border transition-all whitespace-nowrap",
        active
          ? tone === "red"
            ? "bg-red-600 border-red-600 text-white"
            : "bg-blue-600 border-blue-600 text-white"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-800 dark:hover:text-gray-200",
      )}
    >
      {label}
    </button>
  );
}

export function ReportFilterBar() {
  const { filters, filtersActive, dispatch, options, filtered, all } = useReport();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeCount = countChips(filters);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />

        <Chip
          label="Todas"
          active={!filtersActive}
          onClick={() => dispatch({ type: "clearAll" })}
        />

        {options.types.map((t) => (
          <Chip
            key={t.code}
            label={abbrevType(t.code, t.title)}
            active={filters.typeCodes.includes(t.code)}
            onClick={() => dispatch({ type: "toggle", field: "typeCodes", value: t.code })}
          />
        ))}

        <span className="w-px h-3.5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

        <Chip
          label="Críticas"
          tone="red"
          active={filters.severities.includes("high")}
          onClick={() => dispatch({ type: "toggleSeverity", value: "high" })}
        />

        <button
          onClick={() => setDrawerOpen(true)}
          className={cn(
            "cursor-pointer text-xs font-medium px-2.5 py-1 rounded-full border transition-all inline-flex items-center gap-1.5 ml-auto",
            activeCount > 0
              ? "border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Chips do que está aplicado */}
      {filtersActive && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {filtered.length} de {all.length} ocorrências ·
          </span>
          {renderActiveChips(filters, options, dispatch)}
          <button
            onClick={() => dispatch({ type: "clearAll" })}
            className="cursor-pointer text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline ml-1"
          >
            Limpar filtros
          </button>
        </div>
      )}

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function countChips(f: ReturnType<typeof useReport>["filters"]): number {
  return (
    f.typeCodes.length +
    f.driverIds.length +
    f.vehicles.length +
    f.bases.length +
    f.lines.length +
    f.severities.length +
    (f.hourFrom !== null || f.hourTo !== null ? 1 : 0) +
    (f.search.trim() ? 1 : 0)
  );
}

function renderActiveChips(
  f: ReturnType<typeof useReport>["filters"],
  options: ReturnType<typeof useReport>["options"],
  dispatch: ReturnType<typeof useReport>["dispatch"],
) {
  const chips: { label: string; onRemove: () => void }[] = [];

  for (const code of f.typeCodes) {
    const t = options.types.find((x) => x.code === code);
    chips.push({
      label: t ? abbrevType(t.code, t.title) : code,
      onRemove: () => dispatch({ type: "toggle", field: "typeCodes", value: code }),
    });
  }
  for (const id of f.driverIds) {
    const d = options.drivers.find((x) => x.id === id);
    chips.push({ label: d?.name ?? id, onRemove: () => dispatch({ type: "toggle", field: "driverIds", value: id }) });
  }
  for (const v of f.vehicles) chips.push({ label: `Veíc. ${v}`, onRemove: () => dispatch({ type: "toggle", field: "vehicles", value: v }) });
  for (const b of f.bases) chips.push({ label: b, onRemove: () => dispatch({ type: "toggle", field: "bases", value: b }) });
  for (const l of f.lines) chips.push({ label: l, onRemove: () => dispatch({ type: "toggle", field: "lines", value: l }) });
  for (const s of f.severities) chips.push({ label: SEVERITY_LABEL[s], onRemove: () => dispatch({ type: "toggleSeverity", value: s }) });
  if (f.hourFrom !== null || f.hourTo !== null) {
    chips.push({
      label: `${String(f.hourFrom ?? 0).padStart(2, "0")}h–${String((f.hourTo ?? 23) + 1).padStart(2, "0")}h`,
      onRemove: () => dispatch({ type: "setHourRange", from: null, to: null }),
    });
  }
  if (f.search.trim()) chips.push({ label: `"${f.search.trim()}"`, onRemove: () => dispatch({ type: "setSearch", value: "" }) });

  return chips.map((c, i) => (
    <span
      key={i}
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
    >
      {c.label}
      <button onClick={c.onRemove} className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100" aria-label="Remover filtro">
        <X className="w-3 h-3" />
      </button>
    </span>
  ));
}

// ── Drawer de filtros avançados ─────────────────────────────────────────────

function FilterDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { filters, dispatch, options } = useReport();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <SheetTitle className="text-sm">Filtros avançados</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Busca */}
          <div>
            <FieldLabel>Busca</FieldLabel>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={filters.search}
                onChange={(e) => dispatch({ type: "setSearch", value: e.target.value })}
                placeholder="Motorista, veículo, linha, local..."
                className="w-full text-xs pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          <CheckGroup
            label="Tipo de ocorrência"
            items={options.types.map((t) => ({ value: t.code, label: t.title }))}
            selected={filters.typeCodes}
            onToggle={(v) => dispatch({ type: "toggle", field: "typeCodes", value: v })}
          />

          <CheckGroup
            label="Severidade"
            items={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_LABEL[s] }))}
            selected={filters.severities}
            onToggle={(v) => dispatch({ type: "toggleSeverity", value: v as Severity })}
          />

          <CheckGroup
            label="Motorista"
            items={options.drivers.map((d) => ({ value: d.id, label: d.name }))}
            selected={filters.driverIds}
            onToggle={(v) => dispatch({ type: "toggle", field: "driverIds", value: v })}
          />

          <CheckGroup
            label="Veículo"
            items={options.vehicles.map((v) => ({ value: v, label: v }))}
            selected={filters.vehicles}
            onToggle={(v) => dispatch({ type: "toggle", field: "vehicles", value: v })}
          />

          <CheckGroup
            label="Base"
            items={options.bases.map((b) => ({ value: b, label: b }))}
            selected={filters.bases}
            onToggle={(v) => dispatch({ type: "toggle", field: "bases", value: v })}
          />

          <CheckGroup
            label="Linha / Viagem"
            items={options.lines.map((l) => ({ value: l, label: l }))}
            selected={filters.lines}
            onToggle={(v) => dispatch({ type: "toggle", field: "lines", value: v })}
          />

          {/* Faixa de horário */}
          <div>
            <FieldLabel>Faixa de horário</FieldLabel>
            <div className="flex items-center gap-2">
              <HourSelect
                value={filters.hourFrom}
                onChange={(h) => dispatch({ type: "setHourRange", from: h, to: filters.hourTo })}
                placeholder="Início"
              />
              <span className="text-xs text-gray-400">até</span>
              <HourSelect
                value={filters.hourTo}
                onChange={(h) => dispatch({ type: "setHourRange", from: filters.hourFrom, to: h })}
                placeholder="Fim"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <button
            onClick={() => dispatch({ type: "clearAll" })}
            className="cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Limpar tudo
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Aplicar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

function CheckGroup({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {items.map((it) => (
          <label
            key={it.value}
            className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer py-0.5"
          >
            <Checkbox
              checked={selected.includes(it.value)}
              onCheckedChange={() => onToggle(it.value)}
              className="w-3.5 h-3.5"
            />
            <span className="truncate">{it.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function HourSelect({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (h: number | null) => void;
  placeholder: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="flex-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      <option value="">{placeholder}</option>
      {Array.from({ length: 24 }, (_, i) => (
        <option key={i} value={i}>
          {String(i).padStart(2, "0")}h
        </option>
      ))}
    </select>
  );
}
