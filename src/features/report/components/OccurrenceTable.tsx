import { useMemo, useState } from "react";
import { Search, ArrowUpDown, ChevronDown, ChevronUp, FileDown, ListFilter } from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import { Checkbox } from "../../../app/components/ui/checkbox";
import type { OccurrenceDTO } from "../../../domain/occurrences";
import { useReport } from "../ReportContext";
import { Panel } from "./primitives";
import { getSeverity, SEVERITY_LABEL, type Severity } from "../types";
import {
  baseOf,
  durationMin,
  excedenteMin,
  firstName,
  formatDurationMin,
  lineOf,
  occDisplayName,
  primaryDriver,
} from "../occ-helpers";
import { exportCsv, exportXlsx } from "../export";

type SortKey = "time" | "type" | "severity" | "driver" | "vehicle" | "line" | "base" | "duration";
type SortDir = "asc" | "desc";

const SEV_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const SEV_BADGE: Record<Severity, string> = {
  high: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",
  medium: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  low: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};
const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO: "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE: "Vale",
  REGISTRO: "Registro",
};

const PAGE_SIZE = 15;

export function OccurrenceTable() {
  const { filtered, date, filtersActive, dispatch } = useReport();
  const [localSearch, setLocalSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    const base = q
      ? filtered.filter((o) =>
          [occDisplayName(o), o.vehicleNumber, baseOf(o), lineOf(o), o.place, primaryDriver(o)?.name]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : filtered;

    const sorted = [...base].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "time":
          return dir * (a.startTime ?? "").localeCompare(b.startTime ?? "");
        case "type":
          return dir * occDisplayName(a).localeCompare(occDisplayName(b), "pt-BR");
        case "severity":
          return dir * (SEV_ORDER[getSeverity(a)] - SEV_ORDER[getSeverity(b)]);
        case "driver":
          return dir * (primaryDriver(a)?.name ?? "").localeCompare(primaryDriver(b)?.name ?? "", "pt-BR");
        case "vehicle":
          return dir * a.vehicleNumber.localeCompare(b.vehicleNumber, "pt-BR", { numeric: true });
        case "line":
          return dir * lineOf(a).localeCompare(lineOf(b), "pt-BR");
        case "base":
          return dir * baseOf(a).localeCompare(baseOf(b), "pt-BR");
        case "duration":
          return dir * ((durationMin(a) ?? 0) - (durationMin(b) ?? 0));
      }
    });
    return sorted;
  }, [filtered, localSearch, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "severity" ? "asc" : "asc");
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((o) => selected.has(o.id));
  const exportRows = selected.size > 0 ? filtered.filter((o) => selected.has(o.id)) : filtered;

  return (
    <Panel className="overflow-hidden scroll-mt-24" as="section">
      <div id="tabela-ocorrencias" />
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
          <ListFilter className="w-3.5 h-3.5 text-gray-400" />
          Ocorrências detalhadas
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {rows.length} registro{rows.length !== 1 ? "s" : ""}
          {selected.size > 0 && ` · ${selected.size} selecionada${selected.size !== 1 ? "s" : ""}`}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar na tabela..."
              className="text-xs pl-8 pr-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
            />
          </div>
          <button
            onClick={() => exportCsv(exportRows, date)}
            className="cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={() => exportXlsx(exportRows, date)}
            className="cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Excel
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhuma ocorrência para os filtros selecionados.
          {filtersActive && (
            <button
              onClick={() => dispatch({ type: "clearAll" })}
              className="cursor-pointer block mx-auto mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500">
                  <th className="px-3 py-2 w-8">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (allOnPageSelected) pageRows.forEach((o) => next.delete(o.id));
                          else pageRows.forEach((o) => next.add(o.id));
                          return next;
                        })
                      }
                      className="w-3.5 h-3.5"
                    />
                  </th>
                  <Th label="Data/Hora" k="time" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Tipo" k="type" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Sev." k="severity" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Motorista" k="driver" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Veículo" k="vehicle" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Linha" k="line" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Base" k="base" {...{ sortKey, sortDir, toggleSort }} />
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Local</th>
                  <Th label="Duração" k="duration" {...{ sortKey, sortDir, toggleSort }} />
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Tratativa</th>
                  <th className="px-3 py-2 w-6" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((o) => (
                  <Row
                    key={o.id}
                    o={o}
                    selected={selected.has(o.id)}
                    onToggleSelect={() => toggleRow(o.id)}
                    expanded={expandedId === o.id}
                    onToggleExpand={() => setExpandedId(expandedId === o.id ? null : o.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                Página {safePage + 1} de {pageCount}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  className="cursor-pointer px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="cursor-pointer px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

function Th({
  label,
  k,
  sortKey,
  sortDir,
  toggleSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide whitespace-nowrap">
      <button onClick={() => toggleSort(k)} className="cursor-pointer inline-flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300">
        {label}
        {active ? (
          sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

function Row({
  o,
  selected,
  onToggleSelect,
  expanded,
  onToggleExpand,
}: {
  o: OccurrenceDTO;
  selected: boolean;
  onToggleSelect: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const sev = getSeverity(o);
  const d = primaryDriver(o);
  const dur = durationMin(o);
  const exc = excedenteMin(o);

  return (
    <>
      <tr
        className={cn(
          "border-b border-gray-50 dark:border-gray-800/60 transition-colors",
          selected ? "bg-blue-50/50 dark:bg-blue-950/30" : "hover:bg-gray-50/60 dark:hover:bg-gray-800/40",
        )}
      >
        <td className="px-3 py-2.5 align-middle">
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="w-3.5 h-3.5" />
        </td>
        <td className="px-3 py-2.5 align-middle whitespace-nowrap font-mono text-gray-600 dark:text-gray-400">
          <div className="font-semibold text-gray-700 dark:text-gray-300">{o.startTime}</div>
          <div className="text-[10px] text-gray-400">{o.eventDate.slice(8)}/{o.eventDate.slice(5, 7)}</div>
        </td>
        <td className="px-3 py-2.5 align-middle max-w-[180px]">
          <span className="font-medium text-gray-800 dark:text-gray-200 truncate block" title={occDisplayName(o)}>
            {occDisplayName(o)}
          </span>
        </td>
        <td className="px-3 py-2.5 align-middle">
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", SEV_BADGE[sev])}>
            {SEVERITY_LABEL[sev]}
          </span>
        </td>
        <td className="px-3 py-2.5 align-middle whitespace-nowrap text-gray-700 dark:text-gray-300">
          {d ? firstName(d.name) : "—"}
        </td>
        <td className="px-3 py-2.5 align-middle font-mono text-gray-700 dark:text-gray-300">{o.vehicleNumber}</td>
        <td className="px-3 py-2.5 align-middle max-w-[140px]">
          <span className="truncate block text-gray-600 dark:text-gray-400" title={lineOf(o)}>
            {lineOf(o)}
          </span>
        </td>
        <td className="px-3 py-2.5 align-middle whitespace-nowrap text-gray-600 dark:text-gray-400">{baseOf(o)}</td>
        <td className="px-3 py-2.5 align-middle max-w-[160px]">
          <span className="truncate block text-gray-500 dark:text-gray-500" title={o.place}>
            {o.place || "—"}
          </span>
        </td>
        <td className="px-3 py-2.5 align-middle whitespace-nowrap tabular-nums text-gray-600 dark:text-gray-400">
          {dur != null ? `${dur} min` : "—"}
          {exc > 0 && <span className="text-amber-600 dark:text-amber-400 ml-1">(+{exc})</span>}
        </td>
        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
          {o.tratativa ? (
            <span className="text-gray-700 dark:text-gray-300">{TRATATIVA_LABEL[o.tratativa] ?? o.tratativa}</span>
          ) : (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              pendente
            </span>
          )}
        </td>
        <td className="px-3 py-2.5 align-middle">
          <button onClick={onToggleExpand} className="cursor-pointer text-gray-300 dark:text-gray-600 hover:text-gray-500">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50/60 dark:bg-gray-900/60">
          <td colSpan={12} className="px-5 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
              <Detail label="Data viagem" value={o.tripDate} />
              <Detail label="Fim" value={o.endTime} />
              <Detail label="Evidências" value={String(o.evidenceCount ?? 0)} />
              {o.speedKmh != null && <Detail label="Velocidade" value={`${o.speedKmh} km/h`} />}
              {exc > 0 && <Detail label="Excesso acumulado" value={formatDurationMin(exc)} />}
              {o.drivers.map((dr) => (
                <Detail key={dr.driverId} label={dr.position === 1 ? "Motorista 1" : "Motorista 2"} value={`${dr.name} · ${dr.registry}`} />
              ))}
              {o.analisadoPor && <Detail label="Analista" value={o.analisadoPor} />}
              {o.justificativaRegistro && <Detail label="Justificativa" value={o.justificativaRegistro} />}
            </div>
            {o.points && o.points.length > 1 && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Pontos:</span>{" "}
                {o.points.map((p, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    {p.place} ({p.startTime}–{p.endTime})
                  </span>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-gray-400 dark:text-gray-500">{label}</div>
      <div className="font-medium text-gray-700 dark:text-gray-300 break-words">{value}</div>
    </div>
  );
}
