// src/utils/pdfDownload.ts
export function sanitizeFileName(input: string): string {
  if (!input) return "";

  // Remove caracteres inválidos para Windows/macOS e controles
  const cleaned = input
    .replace(/[\/\\:*?"<>|]/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Evita nomes terminando com ponto/espaço (Windows)
  return cleaned.replace(/[. ]+$/g, "").trim();
}

export function formatDateYYYYMMDD(dateLike?: string | Date | null): string {
  if (!dateLike) return "";
  const d = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function abbreviateOccurrenceTitle(title: string): string {
  const t = title.toUpperCase();

  const rules: Array<[RegExp, string]> = [
    [/DESCUMPRIMENTO\s+OPERACIONAL/, "DESC_OP"],
    [/PARADA\s+IRREGULAR/, "PAR_IRREG"],
    [/PARADA\s+FORA\s+DO\s+PROGRAMADO/, "PAR_FORA_PROG"],
    [/AVARIA/, "AVARIA"],
    [/CHECKLIST/, "CHECKLIST"],
  ];

  for (const [regex, abbr] of rules) {
    if (regex.test(t)) return abbr;
  }

  // fallback genérico: pega 3 primeiras palavras abreviadas
  return t
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.slice(0, 4))
    .join("_");
}

function formatDateDDMMAA(dateLike?: string | Date | null): string {
  if (!dateLike) return "";
  const d = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  if (Number.isNaN(d.getTime())) return "";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);

  return `${dd}.${mm}.${yy}`;
}

export function buildDriverPdfFileName(args: {
  registry?: string | null;
  name?: string | null;
  base?: string | null;
  occurrenceTitle?: string | null;
  eventDate?: string | Date | null;
}) {
  const date = formatDateDDMMAA(args.eventDate) || "DATA";
  const typeAbbr = abbreviateOccurrenceTitle(args.occurrenceTitle ?? "");

  const parts = [
    args.registry ?? "",
    args.name ?? "",
    args.base ?? "",
    typeAbbr,
    date,
  ]
    .map((p) => sanitizeFileName(String(p || "")))
    .filter(Boolean);

  return `${parts.join(" - ")}.pdf`;
}

export async function fetchBlobFromUrl(
  url: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await fetch(url, { method: "GET", signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao baixar PDF (${res.status}). ${text}`.trim());
  }
  return await res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const safe = sanitizeFileName(filename) || "arquivo.pdf";
  const name = safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;

  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(objUrl);
}
