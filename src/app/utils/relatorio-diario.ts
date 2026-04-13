import type { OccurrenceDTO } from "../../domain/occurrences";

export type ReportAnchor = {
  key: string;
  occurrenceId: string;
  startIndex: number;
  label: string;
  hasEvidences: boolean;
  evidenceCount: number;
  baseCode: string;
};

export function buildDailyReport(occurrences: OccurrenceDTO[]): {
  textWithMarkers: string;   // para o textarea (com [#01])
  textForCopy: string;       // formato padrão (sem marcadores)
  textForWhatsApp: string;   // formato whatsapp
  anchors: ReportAnchor[];
  totals: {
    occurrences: number;
    evidences: number;
    vehicles: number;
    lines: number;
    windowStart: string | null;
    windowEnd: string | null;
  };
} {
  const sorted = [...occurrences].sort((a, b) => {
    if (a.startTime !== b.startTime)
      return a.startTime.localeCompare(b.startTime);
    return a.createdAt.localeCompare(b.createdAt);
  });

  const totals = {
    occurrences: sorted.length,
    evidences: sorted.reduce((acc, o) => acc + (o.evidenceCount ?? 0), 0),
    vehicles: new Set(sorted.map((o) => o.vehicleNumber)).size,
    lines: new Set(sorted.map((o) => o.lineLabel).filter(Boolean)).size,
    windowStart: sorted.length ? sorted[0]!.startTime : null,
    windowEnd: sorted.length ? sorted[sorted.length - 1]!.endTime : null,
  };

  const sep = "-".repeat(80);
  const anchors: ReportAnchor[] = [];

  let outVisual = "";
  let outCopy = "";
  const wppBlocks: string[] = [];

  sorted.forEach((o, idx) => {
    const key = `#${String(idx + 1).padStart(2, "0")}`;
    const marker = `[${key}]`;
    const startIndex = outVisual.length;

    const eventDate = formatDateBR(o.eventDate);
    const tripDate  = formatDateBR(o.tripDate);
    const start     = formatHourBR(o.startTime);
    const end       = formatHourBR(o.endTime);

    const line  = o.lineLabel ?? "—";
    const place = o.place     ?? "—";
    const base  = o.baseCode  ?? "—";

    // ── Título: usa reportTitle para GENERICO ─────────────────────────
    const occTitle =
      o.typeCode === "GENERICO" && o.reportTitle
        ? o.reportTitle
        : o.typeTitle;

    // ── Horário: não repete quando inicio = fim ────────────────────────
    const timeDisplay = start === end ? start : `${start} à ${end}`;

    const compact = `${o.startTime} • ${o.vehicleNumber} • ${truncate(place, 32)}`;

    anchors.push({
      key,
      occurrenceId: o.id,
      startIndex,
      label: compact,
      hasEvidences: (o.evidenceCount ?? 0) > 0,
      evidenceCount: o.evidenceCount ?? 0,
      baseCode: base,
    });

    const narrativa = buildNarrativa(o, eventDate, tripDate, start, end);

    // ── Bloco visual (textarea) ────────────────────────────────────────
    const blockVisual =
      `${marker} OCORRÊNCIA: ${occTitle}\n` +
      `DATA: ${eventDate}\n` +
      `Horario do evento: ${timeDisplay}.\n` +
      `${narrativa}\n` +
      `LINHA: ${line}\n` +
      (o.typeCode !== "EXCESSO_VELOCIDADE" ? `LOCAL: ${place}\n` : "") +
      (o.typeCode === "EXCESSO_VELOCIDADE" ? `VELOCIDADE: ${o.speedKmh ?? "—"} km/h\n` : "") +
      `BASE: ${base}\n`;

    // ── Bloco para copiar (padrão) ─────────────────────────────────────
    const blockCopy =
      `OCORRÊNCIA: ${occTitle}\n` +
      `DATA: ${eventDate}\n` +
      `Horario do evento: ${timeDisplay}.\n` +
      `${narrativa}\n` +
      `LINHA: ${line}\n` +
      (o.typeCode !== "EXCESSO_VELOCIDADE" ? `LOCAL: ${place}\n` : "") +
      (o.typeCode === "EXCESSO_VELOCIDADE" ? `VELOCIDADE: ${o.speedKmh ?? "—"} km/h\n` : "") +
      `BASE: ${base}\n`;

    outVisual += blockVisual;
    outCopy   += blockCopy;

    // ── Bloco WhatsApp ─────────────────────────────────────────────────
    wppBlocks.push(buildWhatsAppBlock(o, idx, occTitle, eventDate, start, end, place, line));

    if (idx < sorted.length - 1) {
      outVisual += `${sep}\n\n`;
      outCopy   += `${sep}\n\n`;
    }
  });

  // ── Cabeçalho WhatsApp ─────────────────────────────────────────────
  const wppHeader =
    totals.occurrences > 0
      ? `📋 *RELATÓRIO DIÁRIO — ${formatDateBR(sorted[0]!.eventDate)}*\n` +
        `${totals.occurrences} ocorrência${totals.occurrences > 1 ? "s" : ""} registrada${totals.occurrences > 1 ? "s" : ""}\n\n`
      : "";

  const textForWhatsApp = wppHeader + wppBlocks.join("\n─────────────────────\n\n");

  return {
    textWithMarkers: outVisual,
    textForCopy: outCopy,
    textForWhatsApp,
    anchors,
    totals,
  };
}

// ── Builders internos ─────────────────────────────────────────────────────────

function buildWhatsAppBlock(
  o: OccurrenceDTO,
  idx: number,
  title: string,
  eventDate: string,
  start: string,
  end: string,
  place: string,
  line: string,
): string {
  const num = `${idx + 1}.`;
  const timeDisplay = start === end ? start : `${start} às ${end}`;
  const driver = o.drivers[0];

  let block = `${num} *${title.toUpperCase()}*\n`;
  block += `📅 ${eventDate}  ⏰ ${timeDisplay}\n`;
  block += `🚌 Veículo *${o.vehicleNumber}*`;
  if (line && line !== "—") block += `  |  ${line}`;
  block += "\n";
  if (driver) block += `👤 ${driver.name}\n`;
  if (o.typeCode !== "EXCESSO_VELOCIDADE" && place && place !== "—")
    block += `📍 ${place}\n`;
  if (o.typeCode === "EXCESSO_VELOCIDADE" && o.speedKmh)
    block += `⚡ *${o.speedKmh} km/h*\n`;
  block += `🏢 Base: ${o.baseCode ?? "—"}`;

  return block;
}

function buildNarrativa(
  o: OccurrenceDTO,
  eventDate: string,
  tripDate: string,
  start: string,
  end: string,
): string {
  switch (o.typeCode) {
    case "EXCESSO_VELOCIDADE": {
      const vel = o.speedKmh ? `${o.speedKmh} km/h` : "velocidade não informada";
      const timeDisplay = start === end ? start : `${start} à ${end}`;
      return `Em ${eventDate}, durante a viagem do veículo de número ${o.vehicleNumber} na viagem do dia ${tripDate}, foi constatado que o motorista atingiu ${vel} no período de ${timeDisplay}, caracterizando EXCESSO DE VELOCIDADE.`;
    }
    default:
      return `Durante a análise das atividades do veículo de número ${o.vehicleNumber} na viagem do dia ${tripDate}, identificamos o descumprimento operacional/comercial por parte do condutor, realizando uma parada em local fora do esquema operacional.`;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatHourBR(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  if (!h || !m) return hhmm;
  return `${h}h${m}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
