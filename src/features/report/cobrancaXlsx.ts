import * as XLSX from "xlsx-js-style";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { occDisplayName, primaryDriver } from "./occ-helpers";
import { rizerDisciplinarEditUrl } from "../../utils/rizer";

// Planilha .xlsx anexada às notificações por gestor no WhatsApp — usada tanto
// na "Cobrança de devolutiva" (seção Pendentes de Tratamento) quanto no
// relatório diário por gestor. Uma por gestor, formatada, com o link do RIZER
// clicável em cada linha.

const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO: "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE: "Vale",
  REGISTRO: "Só o Registro",
};

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const COLUMNS = [
  "Data",
  "Hora",
  "Base",
  "Prefixo",
  "Motorista",
  "Matrícula",
  "Tipo",
  "Local",
  "Tratativa",
  "Autor",
  "Link RIZER",
] as const;

// ── Estilo ─────────────────────────────────────────────────────────────────
const FONT = "Inter";
const HEADER_FILL = "E8792B"; // laranja
const ZEBRA_FILL = "FBF0E8"; // laranja bem claro
const BORDER_RGB = "E5D3C4";
const LINK_RGB = "1155CC";

const THIN = { style: "thin", color: { rgb: BORDER_RGB } } as const;
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };

const HEADER_STYLE = {
  font: { name: FONT, sz: 12, bold: true, color: { rgb: "FFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: HEADER_FILL } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDERS,
};

type Align = "left" | "center" | "right";
const COL_META: { align: Align; z?: string; bold?: boolean; italic?: boolean }[] = [
  { align: "center", z: "dd/mm/yyyy" }, // Data
  { align: "center" }, // Hora
  { align: "left" }, // Base
  { align: "center" }, // Prefixo
  { align: "left", bold: true }, // Motorista
  { align: "center" }, // Matrícula
  { align: "left", bold: true, italic: true }, // Tipo
  { align: "left" }, // Local
  { align: "center" }, // Tratativa
  { align: "left" }, // Autor
  { align: "left" }, // Devolutiva no RIZER (link)
];

function bodyStyle(
  rowIdx: number,
  meta: { align: Align; bold?: boolean; italic?: boolean },
  link = false,
) {
  return {
    font: {
      name: FONT,
      sz: 12,
      ...(meta.bold ? { bold: true } : {}),
      ...(meta.italic ? { italic: true } : {}),
      ...(link ? { color: { rgb: LINK_RGB }, underline: true } : {}),
    },
    alignment: { horizontal: meta.align, vertical: "center" },
    border: BORDERS,
    ...(rowIdx % 2 === 1
      ? { fill: { patternType: "solid", fgColor: { rgb: ZEBRA_FILL } } }
      : {}),
  };
}

type Cell = string | number | Date;

function toRow(o: OccurrenceDTO, baseSigla: string): Cell[] {
  const d = primaryDriver(o);
  const [y, mo, dd] = o.eventDate.split("-").map(Number);
  const data: Cell = y && mo && dd ? new Date(y, mo - 1, dd, 12) : o.eventDate;
  return [
    data,
    o.startTime ?? "",
    baseSigla,
    o.vehicleNumber ?? "",
    d?.name ?? "",
    d?.registry ?? "",
    occDisplayName(o),
    o.place ?? "",
    o.tratativa ? TRATATIVA_LABEL[o.tratativa] ?? o.tratativa : "",
    o.analisadoPor ?? "",
    o.rizerId ? "Abrir no RIZER" : "Sem link, busque manualmente no rizer",
  ];
}

export type CobrancaAttachment = {
  dataBase64: string;
  filename: string;
  mimetype: string;
};

/**
 * Monta a planilha de um gestor. `porBase` = ocorrências agrupadas por sigla
 * de base (o que `groupOccurrencesByManager` devolve em `occByBase`, recortado
 * pras bases do gestor). `filenamePrefix` muda só o nome do arquivo
 * ("pendentes-devolutiva" na cobrança, "relatorio-diario" no envio diário).
 */
export function buildCobrancaXlsx(
  responsavelNome: string,
  porBase: Array<{ sigla: string; occurrences: OccurrenceDTO[] }>,
  opts?: { filenamePrefix?: string },
): CobrancaAttachment {
  const flat: Array<{ o: OccurrenceDTO; sigla: string }> = [];
  for (const b of porBase) {
    for (const o of b.occurrences) flat.push({ o, sigla: b.sigla });
  }
  flat.sort(
    (a, b) =>
      (a.o.eventDate + (a.o.startTime ?? "")).localeCompare(b.o.eventDate + (b.o.startTime ?? "")),
  );

  const header = COLUMNS.slice();
  const dataRows = flat.map(({ o, sigla }) => toRow(o, sigla));
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows], { cellDates: true });

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const lastCol = range.e.c;
  const lastRow = range.e.r;
  const linkCol = COLUMNS.indexOf("Link RIZER");

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
      const isLink = c === linkCol && !!flat[r - 1]?.o.rizerId;
      cell.s = bodyStyle(r - 1, meta, isLink);
      if (meta.z && cell.v !== "" && cell.v != null) cell.z = meta.z;
      if (isLink) {
        cell.l = { Target: rizerDisciplinarEditUrl(flat[r - 1]!.o.rizerId!), Tooltip: "Abrir no RIZER" };
      }
    }
  }

  // larguras
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
  // congela o cabeçalho
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" } as any;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ocorrências");
  const dataBase64 = XLSX.write(wb, { bookType: "xlsx", type: "base64", cellStyles: true }) as string;

  const slug =
    responsavelNome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "gestor";
  const hoje = new Date().toISOString().slice(0, 10);
  const prefix = opts?.filenamePrefix ?? "pendentes-devolutiva";

  return {
    dataBase64,
    filename: `${prefix}-${slug}-${hoje}.xlsx`,
    mimetype: XLSX_MIME,
  };
}
