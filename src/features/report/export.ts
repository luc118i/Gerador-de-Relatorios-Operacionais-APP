import * as XLSX from "xlsx";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { getSeverity, SEVERITY_LABEL } from "./types";
import {
  baseOf,
  durationMin,
  excedenteMin,
  lineOf,
  occDisplayName,
  primaryDriver,
} from "./occ-helpers";

const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO: "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE: "Vale",
  REGISTRO: "Só o Registro",
};

const COLUMNS = [
  "Data",
  "Hora",
  "Tipo",
  "Severidade",
  "Motorista",
  "Matrícula",
  "Veículo",
  "Linha",
  "Base",
  "Local",
  "Duração (min)",
  "Excesso (min)",
  "Evidências",
  "Tratativa",
  "Analista",
] as const;

function toRow(o: OccurrenceDTO): (string | number)[] {
  const d = primaryDriver(o);
  const dur = durationMin(o);
  const exc = excedenteMin(o);
  return [
    o.eventDate,
    o.startTime,
    occDisplayName(o),
    SEVERITY_LABEL[getSeverity(o)],
    d?.name ?? "",
    d?.registry ?? "",
    o.vehicleNumber,
    lineOf(o),
    baseOf(o),
    o.place ?? "",
    dur ?? "",
    exc || "",
    o.evidenceCount ?? 0,
    o.tratativa ? TRATATIVA_LABEL[o.tratativa] ?? o.tratativa : "",
    o.analisadoPor ?? "",
  ];
}

function sortByTime(occ: OccurrenceDTO[]): OccurrenceDTO[] {
  return [...occ].sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** CSV com `;` (padrão pt-BR/Excel) e BOM UTF-8. Reflete o recorte filtrado. */
export function exportCsv(occ: OccurrenceDTO[], date: string) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    COLUMNS.join(";"),
    ...sortByTime(occ).map((o) => toRow(o).map(esc).join(";")),
  ];
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `relatorio-${date}.csv`);
}

/** XLSX (SheetJS). Reflete o recorte filtrado. */
export function exportXlsx(occ: OccurrenceDTO[], date: string) {
  const aoa = [COLUMNS.slice(), ...sortByTime(occ).map(toRow)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = COLUMNS.map((c) => ({ wch: Math.max(10, c.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ocorrências");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `relatorio-${date}.xlsx`,
  );
}
