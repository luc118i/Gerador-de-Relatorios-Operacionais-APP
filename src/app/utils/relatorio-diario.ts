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
  textWithMarkers: string; // para o textarea (com [#01] e EVIDÊNCIAS)
  textForCopy: string; // para copiar/exportar (sem [#01] e sem EVIDÊNCIAS)
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
    windowStart: sorted.length ? sorted[0].startTime : null,
    windowEnd: sorted.length ? sorted[sorted.length - 1].endTime : null,
  };

  const sep = "-".repeat(80);
  const anchors: ReportAnchor[] = [];

  let outVisual = "";
  let outCopy = "";

  sorted.forEach((o, idx) => {
    const key = `#${String(idx + 1).padStart(2, "0")}`;
    const marker = `[${key}]`;

    // âncora precisa apontar para o texto VISUAL (o que está no textarea)
    const startIndex = outVisual.length;

    const eventDate = formatDateBR(o.eventDate);
    const tripDate = formatDateBR(o.tripDate);
    const start = formatHourBR(o.startTime);
    const end = formatHourBR(o.endTime);

    const line = o.lineLabel ?? "—";
    const place = o.place ?? "—";
    const base = o.baseCode ?? "—";

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

    const blockVisual = `${marker} OCORRÊNCIA: ${o.typeTitle}
DATA: ${eventDate}
Horario do evento: ${start} à ${end}.
Durante a análise das atividades do veículo de número ${o.vehicleNumber} na viagem do dia ${tripDate}, identificamos o descumprimento operacional/comercial por parte do condutor, realizando uma parada em local fora do esquema operacional.
LINHA: ${line}
LOCAL: ${place}
BASE: ${base}
EVIDÊNCIAS: ${o.evidenceCount ?? 0}
`;

    const blockCopy = `OCORRÊNCIA: ${o.typeTitle}
DATA: ${eventDate}
Horario do evento: ${start} à ${end}.
Durante a análise das atividades do veículo de número ${o.vehicleNumber} na viagem do dia ${tripDate}, identificamos o descumprimento operacional/comercial por parte do condutor, realizando uma parada em local fora do esquema operacional.
LINHA: ${line}
LOCAL: ${place}
BASE: ${base}
`;

    outVisual += blockVisual;
    outCopy += blockCopy;

    if (idx < sorted.length - 1) {
      outVisual += `${sep}\n\n`;
      outCopy += `${sep}\n\n`;
    }
  });

  return { textWithMarkers: outVisual, textForCopy: outCopy, anchors, totals };
}

function formatDateBR(iso: string): string {
  // "YYYY-MM-DD" -> "DD/MM/YYYY"
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatHourBR(hhmm: string): string {
  // "HH:mm" -> "HHhmm"
  const [h, m] = hhmm.split(":");
  if (!h || !m) return hhmm;
  return `${h}h${m}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
