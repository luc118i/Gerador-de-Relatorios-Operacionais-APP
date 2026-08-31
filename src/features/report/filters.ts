import type { OccurrenceDTO } from "../../domain/occurrences";
import type { ReportFilters } from "./types";
import { getSeverity } from "./types";
import { baseOf, lineOf, occDisplayName, startHour } from "./occ-helpers";

function matchesSearch(o: OccurrenceDTO, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    occDisplayName(o),
    o.typeTitle,
    o.vehicleNumber,
    baseOf(o),
    lineOf(o),
    o.place,
    ...o.drivers.flatMap((d) => [d.name, d.registry]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * Predicado puro do filtro global. Combina todos os critérios com AND;
 * dentro de cada critério multivalor a lógica é OR (ex.: tipo A OU tipo B).
 * É a única porta de entrada do recorte — KPIs, gráficos, rankings,
 * insights e tabela derivam todos do resultado desta função.
 */
export function applyFilters(all: OccurrenceDTO[], f: ReportFilters): OccurrenceDTO[] {
  return all.filter((o) => {
    if (f.typeCodes.length && !f.typeCodes.includes(o.typeCode)) return false;
    if (f.vehicles.length && !f.vehicles.includes(o.vehicleNumber)) return false;
    if (f.bases.length && !f.bases.includes(baseOf(o))) return false;
    if (f.lines.length && !f.lines.includes(lineOf(o))) return false;
    if (f.driverIds.length && !o.drivers.some((d) => f.driverIds.includes(d.driverId))) return false;
    if (f.severities.length && !f.severities.includes(getSeverity(o))) return false;

    if (f.hourFrom !== null || f.hourTo !== null) {
      const h = startHour(o);
      if (h < 0) return false;
      if (f.hourFrom !== null && h < f.hourFrom) return false;
      if (f.hourTo !== null && h > f.hourTo) return false;
    }

    if (!matchesSearch(o, f.search)) return false;
    return true;
  });
}

/** Opções disponíveis pros seletores do FilterDrawer, extraídas do dia
 *  inteiro (não do recorte) pra o usuário sempre ver todas as escolhas. */
export function buildFilterOptions(all: OccurrenceDTO[]) {
  const types = new Map<string, string>();
  const drivers = new Map<string, string>();
  const vehicles = new Set<string>();
  const bases = new Set<string>();
  const lines = new Set<string>();

  for (const o of all) {
    types.set(o.typeCode, o.typeTitle);
    vehicles.add(o.vehicleNumber);
    bases.add(baseOf(o));
    lines.add(lineOf(o));
    for (const d of o.drivers) drivers.set(d.driverId, d.name);
  }

  const sortStr = (a: string, b: string) => a.localeCompare(b, "pt-BR");

  return {
    types: [...types.entries()].map(([code, title]) => ({ code, title })).sort((a, b) => sortStr(a.title, b.title)),
    drivers: [...drivers.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => sortStr(a.name, b.name)),
    vehicles: [...vehicles].sort(sortStr),
    bases: [...bases].filter((b) => b !== "—").sort(sortStr),
    lines: [...lines].filter((l) => l !== "—").sort(sortStr),
  };
}
