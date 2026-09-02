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

const ABBR_STOPWORDS = new Set([
  "DE", "DA", "DO", "DAS", "DOS", "E", "EM", "POR", "COM",
  "A", "O", "AO", "NO", "NA", "NOS", "NAS", "OU", "SE", "QUE",
]);

function abbreviateOccurrenceTitle(title: string): string {
  const t = (title ?? "").toUpperCase().trim();
  if (!t) return "OCOR";

  // Mapeamentos conhecidos → siglas fixas
  if (t.includes("EXCESSO") && t.includes("VELOCIDADE")) return "EXC_VEL";
  if (t.includes("PARADA FORA"))                          return "PARADA_IRREG";
  if (t.includes("DESCUMPRIMENTO") && t.includes("EMBARQUE")) return "DESC_EMBARQUE";
  if (t.includes("DESCUMPRIMENTO"))                       return "DESC_OP";
  if (t.includes("AVARIA"))                               return "AVARIA";

  // Títulos customizados (GENERICO reportTitle ou outros livres)
  // Remove separadores, filtra stopwords, pega até 2 palavras significativas
  const words = t
    .replace(/[\/\-–|]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/[^A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÜÇ]/g, ""))
    .filter((w) => w.length > 1 && !ABBR_STOPWORDS.has(w));

  if (words.length === 0) return t.replace(/\s+/g, "_").substring(0, 8);
  if (words.length === 1) return words[0].substring(0, 8);

  // Duas palavras significativas, 5 chars cada
  return `${words[0].substring(0, 5)}_${words[1].substring(0, 5)}`;
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
  /**
   * Quando não há matrícula nem nome de motorista, usa o título por extenso
   * em vez da sigla (ex.: "RECLAMAÇÕES COMERCIAIS - SAC - 22.05.26.pdf" no
   * lugar de "RECLA_COMER - 22.05.26.pdf"). A sigla só existe pra caber ao
   * lado de "matrícula - nome - base"; sem esses campos ela só confunde.
   * Opt-in pra não mexer no nome usado na busca da medida no Drive.
   */
  readableWhenAnonymous?: boolean;
}) {
  const date = formatDateDDMMAA(args.eventDate ?? new Date());
  const registry = sanitizeFileName(String(args.registry || ""));
  const name = sanitizeFileName(String(args.name || ""));
  const base = sanitizeFileName(String(args.base || ""));

  const anonymous = !registry && !name;
  if (args.readableWhenAnonymous && anonymous) {
    const title =
      sanitizeFileName(String(args.occurrenceTitle || "").toUpperCase()) || "RELATÓRIO";
    return `${[title, base, date].filter(Boolean).join(" - ")}.pdf`;
  }

  const typeAbbr = abbreviateOccurrenceTitle(args.occurrenceTitle ?? "");
  const parts = [registry, name, base, typeAbbr, date].filter(Boolean);

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
