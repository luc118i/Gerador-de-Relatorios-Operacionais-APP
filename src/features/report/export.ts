import * as XLSX from "xlsx-js-style";
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

type Cell = string | number | Date;

function toRow(o: OccurrenceDTO): Cell[] {
  const d = primaryDriver(o);
  const dur = durationMin(o);
  const exc = excedenteMin(o);
  const [y, mo, dd] = o.eventDate.split("-").map(Number);
  const data: Cell = y && mo && dd ? new Date(y, mo - 1, dd, 12) : o.eventDate;
  return [
    data,
    o.startTime ?? "",
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
  const esc = (v: Cell) => {
    const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    COLUMNS.join(";"),
    ...sortByTime(occ).map((o) => toRow(o).map(esc).join(";")),
  ];
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `relatorio-${date}.csv`);
}

// ── Estilo do XLSX ──────────────────────────────────────────────────────────

const HEADER_FILL = "1F4E79"; // azul-petróleo
const ZEBRA_FILL = "EEF3F8"; // cinza-azulado bem claro
const BORDER_RGB = "D6E0EA";

const THIN = { style: "thin", color: { rgb: BORDER_RGB } } as const;
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };

const HEADER_STYLE = {
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: HEADER_FILL } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDERS,
};

type Align = "left" | "center" | "right";

/** metadados por coluna: alinhamento + formato numérico opcional. */
const COL_META: { align: Align; z?: string }[] = [
  { align: "center", z: "dd/mm/yyyy" }, // Data
  { align: "center" }, // Hora
  { align: "left" }, // Tipo
  { align: "center" }, // Severidade
  { align: "left" }, // Motorista
  { align: "center" }, // Matrícula
  { align: "center" }, // Veículo
  { align: "left" }, // Linha
  { align: "left" }, // Base
  { align: "left" }, // Local
  { align: "right", z: "0" }, // Duração (min)
  { align: "right", z: "0" }, // Excesso (min)
  { align: "center", z: "0" }, // Evidências
  { align: "left" }, // Tratativa
  { align: "left" }, // Analista
];

const SEV_TEXT: Record<string, string> = {
  [SEVERITY_LABEL.high]: "C00000", // vermelho
  [SEVERITY_LABEL.medium]: "BF8F00", // âmbar
  [SEVERITY_LABEL.low]: "808080", // cinza
};

function bodyStyle(
  rowIdx: number,
  opts: { align: Align; bold?: boolean; color?: string },
) {
  return {
    font: {
      name: "Calibri",
      sz: 10,
      bold: !!opts.bold,
      ...(opts.color ? { color: { rgb: opts.color } } : {}),
    },
    alignment: { horizontal: opts.align, vertical: "center" },
    border: BORDERS,
    ...(rowIdx % 2 === 1
      ? { fill: { patternType: "solid", fgColor: { rgb: ZEBRA_FILL } } }
      : {}),
  };
}

/** XLSX formatado (xlsx-js-style). Reflete o recorte filtrado. */
export function exportXlsx(occ: OccurrenceDTO[], date: string) {
  const header = COLUMNS.slice();
  const dataRows = sortByTime(occ).map(toRow);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows], { cellDates: true });

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const lastCol = range.e.c;
  const lastRow = range.e.r;

  // cabeçalho
  for (let c = 0; c <= lastCol; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[ref]) ws[ref].s = HEADER_STYLE;
  }

  // corpo
  for (let r = 1; r <= lastRow; r++) {
    for (let c = 0; c <= lastCol; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };
      const cell = ws[ref];
      const meta = COL_META[c] ?? { align: "left" as Align };

      const opts: { align: Align; bold?: boolean; color?: string } = { align: meta.align };
      if (c === 3) opts.color = SEV_TEXT[String(cell.v)];
      if (c === 11 && typeof cell.v === "number" && cell.v > 0) {
        opts.color = "BF8F00";
        opts.bold = true;
      }
      cell.s = bodyStyle(r - 1, opts);
      if (meta.z && cell.v !== "" && cell.v != null) cell.z = meta.z;
    }
  }

  // largura das colunas ajustada ao conteúdo
  ws["!cols"] = header.map((h, c) => {
    let w = String(h).length;
    for (const row of dataRows) {
      const v = row[c];
      const len = v instanceof Date ? 10 : String(v ?? "").length;
      if (len > w) w = len;
    }
    return { wch: Math.min(48, Math.max(10, w + 2)) };
  });

  ws["!rows"] = [{ hpt: 26 }, ...dataRows.map(() => ({ hpt: 16 }))];
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } }),
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ocorrências");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  triggerDownload(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `relatorio-${date}.xlsx`,
  );
}
