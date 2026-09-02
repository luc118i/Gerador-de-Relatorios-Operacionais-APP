import * as XLSX from "xlsx-js-style";
import type { DriverDashboardSummary } from "../../domain/drivers";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { occDisplayName } from "./occ-helpers";
import { rizerDisciplinarEditUrl } from "../../utils/rizer";

// Relatório geral ("raio-X") da tela de Motoristas — planilha .xlsx montada a
// partir do que o painel de indicadores já traz (GET /dashboard/motoristas):
// resumo da frota, ocorrências por base e ranking das piores situações. Sem
// endpoint novo — é uma consolidação formatada do DriverDashboardSummary.
//
// Quando `occurrences` é passado (varredura dia-a-dia da janela de retenção,
// ver scanRecentOccurrences), ganha uma 4ª aba "Ocorrências por motorista":
// todos os motoristas com ocorrência, ordenados por quantidade (maior
// primeiro), uma linha por ocorrência com o link do RIZER do banco.

const LINK_RGB = "1155CC";
const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO: "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE: "Vale",
  REGISTRO: "Só o Registro",
};

const FONT = "Calibri";
const HEADER_FILL = "1F4E79"; // azul-petróleo (mesmo do export de ocorrências)
const ZEBRA_FILL = "EEF3F8";
const BORDER_RGB = "D6E0EA";

const THIN = { style: "thin", color: { rgb: BORDER_RGB } } as const;
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const HEADER_STYLE = {
  font: { name: FONT, sz: 11, bold: true, color: { rgb: "FFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: HEADER_FILL } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDERS,
};

type Align = "left" | "center" | "right";

const SITUACAO_LABEL: Record<DriverDashboardSummary["ranking"][number]["situacao"], string> = {
  REGULAR: "Regular",
  ATENCAO: "Atenção",
  CRITICO: "Crítico",
};

const SITUACAO_COLOR: Record<
  DriverDashboardSummary["ranking"][number]["situacao"],
  string
> = {
  REGULAR: "2E7D32", // verde
  ATENCAO: "B8860B", // âmbar
  CRITICO: "C00000", // vermelho
};

type Cell = string | number | Date;

function bodyStyle(
  rowIdx: number,
  opts: { align: Align; bold?: boolean; color?: string; zebra?: boolean; link?: boolean },
) {
  const zebra = opts.zebra ?? rowIdx % 2 === 1;
  return {
    font: {
      name: FONT,
      sz: 10,
      bold: !!opts.bold,
      ...(opts.color ? { color: { rgb: opts.color } } : {}),
      ...(opts.link ? { color: { rgb: LINK_RGB }, underline: true } : {}),
    },
    alignment: { horizontal: opts.align, vertical: "center" },
    border: BORDERS,
    ...(zebra
      ? { fill: { patternType: "solid", fgColor: { rgb: ZEBRA_FILL } } }
      : {}),
  };
}

/** Larguras automáticas ajustadas ao conteúdo (mesmo cálculo do export.ts). */
function autoCols(header: readonly string[], rows: Cell[][]) {
  return header.map((h, c) => {
    let w = String(h).length;
    for (const row of rows) {
      const v = row[c];
      const len = v instanceof Date ? 10 : String(v ?? "").length;
      if (len > w) w = len;
    }
    return { wch: Math.min(48, Math.max(10, w + 2)) };
  });
}

/**
 * Monta e baixa a planilha do raio-X geral de motoristas.
 * `perColMeta` define alinhamento e formato numérico por coluna.
 */
function makeSheet(
  header: readonly string[],
  rows: Cell[][],
  perColMeta: { align: Align; z?: string }[],
  rowColor?: (rowIdx: number) => (string | undefined)[],
  opts?: {
    // Sobrescreve o zebra padrão (ex.: alternar por bloco de motorista, não por linha).
    zebra?: (rowIdx: number) => boolean;
    // URL do hyperlink por célula (ex.: link do RIZER na última coluna).
    link?: (rowIdx: number, colIdx: number) => string | undefined;
  },
) {
  const ws = XLSX.utils.aoa_to_sheet([header.slice(), ...rows], {
    cellDates: true,
  });
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const lastCol = range.e.c;
  const lastRow = range.e.r;

  for (let c = 0; c <= lastCol; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[ref]) ws[ref].s = HEADER_STYLE;
  }

  for (let r = 1; r <= lastRow; r++) {
    const colors = rowColor?.(r - 1);
    const zebra = opts?.zebra?.(r - 1);
    for (let c = 0; c <= lastCol; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };
      const cell = ws[ref];
      const meta = perColMeta[c] ?? { align: "left" as Align };
      const href = opts?.link?.(r - 1, c);
      cell.s = bodyStyle(r - 1, {
        align: meta.align,
        color: colors?.[c],
        zebra,
        link: !!href,
      });
      if (meta.z && cell.v !== "" && cell.v != null) cell.z = meta.z;
      if (href) cell.l = { Target: href, Tooltip: "Abrir no RIZER" };
    }
  }

  ws["!cols"] = autoCols(header, rows);
  ws["!rows"] = [{ hpt: 26 }, ...rows.map(() => ({ hpt: 16 }))];
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: lastRow, c: lastCol },
    }),
  };
  return ws;
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

// ── Aba "Ocorrências por motorista" ────────────────────────────────────────

type DriverOccGroup = {
  registry: string;
  name: string;
  base: string;
  occ: OccurrenceDTO[];
};

/**
 * Agrupa as ocorrências por motorista (posições 1 e 2 — uma ocorrência com
 * dois motoristas entra no bloco dos dois). Blocos ordenados por quantidade
 * (maior primeiro); dentro do bloco, ocorrências da mais recente pra mais
 * antiga.
 */
function buildDriverOccGroups(occurrences: OccurrenceDTO[]): DriverOccGroup[] {
  const byDriver = new Map<string, DriverOccGroup>();
  for (const o of occurrences) {
    for (const d of o.drivers ?? []) {
      const key = d.registry || d.driverId;
      if (!key) continue;
      let g = byDriver.get(key);
      if (!g) {
        g = { registry: d.registry || "-", name: d.name || "-", base: d.baseCode || "-", occ: [] };
        byDriver.set(key, g);
      }
      g.occ.push(o);
    }
  }
  const sortKey = (o: OccurrenceDTO) => `${o.eventDate} ${o.startTime ?? ""}`;
  const groups = [...byDriver.values()];
  for (const g of groups) g.occ.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  groups.sort((a, b) => b.occ.length - a.occ.length || a.name.localeCompare(b.name));
  return groups;
}

function dateCell(iso: string): Cell {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d, 12) : iso;
}

function buildPorMotoristaSheet(occurrences: OccurrenceDTO[]) {
  const groups = buildDriverOccGroups(occurrences);
  const header = [
    "Matrícula",
    "Motorista",
    "Base",
    "Data",
    "Hora",
    "Tipo",
    "Local",
    "Veículo",
    "Tratativa",
    "Analista",
    "Link RIZER",
  ] as const;

  const rows: Cell[][] = [];
  // groupOfRow[i] = índice do bloco a que a linha i pertence (pro zebra por bloco)
  const groupOfRow: number[] = [];
  const linkOfRow: (string | undefined)[] = [];

  groups.forEach((g, gi) => {
    for (const o of g.occ) {
      rows.push([
        g.registry,
        g.name,
        g.base,
        dateCell(o.eventDate),
        o.startTime ?? "",
        occDisplayName(o),
        o.place ?? "",
        o.vehicleNumber ?? "",
        o.tratativa ? TRATATIVA_LABEL[o.tratativa] ?? o.tratativa : "",
        o.analisadoPor ?? "",
        o.rizerId ? "Abrir no RIZER" : "Sem link — buscar no RIZER",
      ]);
      groupOfRow.push(gi);
      linkOfRow.push(o.rizerId ? rizerDisciplinarEditUrl(o.rizerId) : undefined);
    }
  });

  const linkCol = header.indexOf("Link RIZER");
  return makeSheet(
    header,
    rows,
    [
      { align: "center" },
      { align: "left" },
      { align: "left" },
      { align: "center", z: "dd/mm/yyyy" },
      { align: "center" },
      { align: "left" },
      { align: "left" },
      { align: "center" },
      { align: "center" },
      { align: "left" },
      { align: "left" },
    ],
    undefined,
    {
      zebra: (i) => groupOfRow[i]! % 2 === 1,
      link: (i, c) => (c === linkCol ? linkOfRow[i] : undefined),
    },
  );
}

function fmtBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function exportDriversDashboardXlsx(
  summary: DriverDashboardSummary,
  // Varredura do período escolhido (ver scanOccurrencesForDays). Quando
  // presente e não-vazia, adiciona a aba "Ocorrências por motorista".
  occurrences?: OccurrenceDTO[],
  // Período que o usuário escolheu pra varredura acima (só rotula a aba por
  // motorista — os totais do painel continuam sendo o snapshot de 90 dias).
  period?: { start: string; end: string },
) {
  const { totals, porBase, ranking } = summary;
  const geradoEm = new Date();
  const semOcorrencia = Math.max(0, totals.motoristas - totals.comOcorrencia);
  const pctComOcorrencia =
    totals.motoristas > 0 ? totals.comOcorrencia / totals.motoristas : 0;
  const totalOcorrenciasBase = porBase.reduce((s, b) => s + b.total, 0);
  const hasPorMotorista = !!occurrences && occurrences.length > 0;

  // ── Aba 1: Resumo da frota ───────────────────────────────────────────────
  const resumoHeader = ["Indicador", "Valor"] as const;
  const resumoRows: Cell[][] = [
    ["Motoristas cadastrados", totals.motoristas],
    ["Com ocorrência (últimos 90 dias)", totals.comOcorrencia],
    ["% da frota com ocorrência", pctComOcorrencia],
    ["Sem ocorrência", semOcorrencia],
    ["Reincidentes", totals.reincidentes],
    ["Críticos", totals.criticos],
    ["Bases com ocorrência", porBase.length],
    ["Total de ocorrências (90 dias)", totalOcorrenciasBase],
    ["Gerado em", geradoEm],
  ];
  if (period) {
    resumoRows.push([
      "Período analisado (aba por motorista)",
      `${fmtBR(period.start)} a ${fmtBR(period.end)}`,
    ]);
  }
  if (hasPorMotorista) {
    resumoRows.push(["Ocorrências no período", occurrences!.length]);
  }
  const resumo = makeSheet(resumoHeader, resumoRows, [
    { align: "left" },
    { align: "right" },
  ]);
  // formatos pontuais da coluna Valor — localizados por rótulo (a ordem muda
  // conforme `period`/`occurrences`).
  const pctRow = resumoRows.findIndex((r) => r[0] === "% da frota com ocorrência");
  const geradoRow = resumoRows.findIndex((r) => r[0] === "Gerado em");
  if (pctRow >= 0) resumo[`B${pctRow + 2}`]!.z = "0.0%";
  if (geradoRow >= 0) resumo[`B${geradoRow + 2}`]!.z = "dd/mm/yyyy hh:mm";
  resumo["!cols"] = [{ wch: 38 }, { wch: 22 }];

  // ── Aba 2: Ocorrências por base ──────────────────────────────────────────
  const baseHeader = ["Base", "Ocorrências", "% do total"] as const;
  const baseRows: Cell[][] = porBase.map((b) => [
    b.base,
    b.total,
    totalOcorrenciasBase > 0 ? b.total / totalOcorrenciasBase : 0,
  ]);
  baseRows.push(["TOTAL", totalOcorrenciasBase, 1]);
  const porBaseWs = makeSheet(baseHeader, baseRows, [
    { align: "left" },
    { align: "right", z: "0" },
    { align: "right", z: "0.0%" },
  ]);

  // ── Aba 3: Piores situações (ranking) ────────────────────────────────────
  const rankHeader = [
    "Código",
    "Nome",
    "Base",
    "Ocorrências",
    "Reincidências",
    "Índice (0–100)",
    "Situação",
  ] as const;
  const rankRows: Cell[][] = ranking.map((r) => [
    r.code,
    r.name,
    r.base ?? "-",
    r.totalOcorrencias,
    r.reincidencias,
    r.indice,
    SITUACAO_LABEL[r.situacao],
  ]);
  const rankingWs = makeSheet(
    rankHeader,
    rankRows,
    [
      { align: "center" },
      { align: "left" },
      { align: "left" },
      { align: "right", z: "0" },
      { align: "right", z: "0" },
      { align: "right", z: "0" },
      { align: "center" },
    ],
    (rowIdx) => {
      const color = SITUACAO_COLOR[ranking[rowIdx]!.situacao];
      return [undefined, undefined, undefined, undefined, undefined, undefined, color];
    },
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, resumo, "Resumo");
  XLSX.utils.book_append_sheet(wb, porBaseWs, "Ocorrências por base");
  XLSX.utils.book_append_sheet(wb, rankingWs, "Piores situações");

  if (hasPorMotorista) {
    XLSX.utils.book_append_sheet(
      wb,
      buildPorMotoristaSheet(occurrences!),
      "Ocorrências por motorista",
    );
  }

  const out = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });
  // Nome padronizado: "Raio x motorista <mês> de <ano>" — mês/ano de
  // referência = fim do período analisado (ou data de geração, sem período).
  const ref = period ? new Date(`${period.end}T12:00:00`) : geradoEm;
  const MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  const filename = `Raio x motorista ${MESES[ref.getMonth()]} de ${ref.getFullYear()}.xlsx`;
  triggerDownload(new Blob([out], { type: XLSX_MIME }), filename);
}
