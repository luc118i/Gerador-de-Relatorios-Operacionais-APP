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

// ── Rótulos de tratativa ──────────────────────────────────────────────────────

const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO:   "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE:        "Vale",
  REGISTRO:    "Só o Registro",
};

// ── buildDailyReport ──────────────────────────────────────────────────────────

export function buildDailyReport(occurrences: OccurrenceDTO[], reportDate?: string): {
  textWithMarkers: string;  // para o textarea (detalhado, com [#01])
  textForCopy: string;      // formato compacto padrão
  textForWhatsApp: string;  // formato compacto whatsapp (idêntico ao padrão)
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

  // ── Loop principal — monta o textarea detalhado e os anchors ──────────────
  sorted.forEach((o, idx) => {
    const key      = `#${String(idx + 1).padStart(2, "0")}`;
    const marker   = `[${key}]`;
    const startIndex = outVisual.length;

    const eventDate = formatDateBR(o.eventDate);
    const tripDate  = formatDateBR(o.tripDate);
    const start     = formatHourBR(o.startTime);
    const end       = formatHourBR(o.endTime);
    const line      = o.lineLabel ?? "—";
    const place     = o.place     ?? "—";
    const base      = o.baseCode  ?? "—";

    const occTitle =
      o.typeCode === "GENERICO" && o.reportTitle
        ? o.reportTitle
        : o.typeTitle;

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

    const blockVisual =
      `${marker} OCORRÊNCIA: ${occTitle}\n` +
      `DATA: ${eventDate}\n` +
      `Horario do evento: ${timeDisplay}.\n` +
      `${narrativa}\n` +
      `LINHA: ${line}\n` +
      (o.typeCode !== "EXCESSO_VELOCIDADE" ? `LOCAL: ${place}\n` : "") +
      (o.typeCode === "EXCESSO_VELOCIDADE" ? `VELOCIDADE: ${o.speedKmh ?? "—"} km/h\n` : "") +
      `BASE: ${base}\n`;

    outVisual += blockVisual;

    if (idx < sorted.length - 1) {
      outVisual += `${sep}\n\n`;
    }
  });

  // ── Bloco de Apuração no textarea ─────────────────────────────────────────
  const apuracaoLinhas = sorted
    .filter((o) => o.tratativa)
    .map((o) => {
      const nome =
        o.typeCode === "GENERICO" && o.reportTitle ? o.reportTitle : o.typeTitle;
      const trat     = TRATATIVA_LABEL[o.tratativa!] ?? o.tratativa!;
      const analista = o.analisadoPor?.trim() || "—";
      const base     = `${o.vehicleNumber} - ${nome} - ${trat} - ${analista}`;
      if (o.justificativaRegistro?.trim()) {
        return `${base}\n  Justificativa: ${o.justificativaRegistro.trim()}`;
      }
      return base;
    });

  if (apuracaoLinhas.length > 0) {
    outVisual +=
      `\n${"=".repeat(80)}\n` +
      `APURAÇÃO\n` +
      apuracaoLinhas.join("\n") +
      "\n";
  }

  // ── Formato compacto para os botões Copiar ────────────────────────────────
  // Cabeçalho
  const dateStr      = reportDate
    ? formatDateBR(reportDate)
    : (sorted.length ? formatDateBR(sorted[0]!.eventDate) : "");
  const compactHeader = `*RELATORIO DIARIO DO DIA ${dateStr}*`;

  // Uma linha por ocorrência
  const compactLines = sorted.map((o) => {
    const baseNome = o.typeCode === "GENERICO" && o.reportTitle
      ? o.reportTitle
      : o.typeTitle;
    const nome = o.typeCode === "EXCESSO_VELOCIDADE" && o.speedKmh != null
      ? `${baseNome} (${o.speedKmh} km/h)`
      : baseNome;
    const trat     = o.tratativa
      ? (TRATATIVA_LABEL[o.tratativa] ?? o.tratativa)
      : "Sem tratativa";
    const analista = o.analisadoPor?.trim() || "—";

    let line = `${o.vehicleNumber} - ${nome} - ${trat} - \`${analista}\``;

    if (o.justificativaRegistro?.trim()) {
      line += `\n  ${o.justificativaRegistro.trim()}`;
    }

    return line;
  });

  const compactText = compactHeader + "\n" + compactLines.join("\n");

  return {
    textWithMarkers: outVisual,
    textForCopy:     compactText,
    textForWhatsApp: compactText,
    anchors,
    totals,
  };
}

// ── Builders internos ─────────────────────────────────────────────────────────

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
