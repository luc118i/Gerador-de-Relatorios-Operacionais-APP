// Vite: importe o CSV como texto bruto
// @ts-ignore
import viagensCsvRaw from "../data/linhas.csv?raw";
import type { ViagemCatalog } from "../app/types";

export type ViagemRow = {
  codigoLinha: string;
  nomeLinha: string;
  horaPartida: string; // "HH:mm"
  sentido: string;
};

function normalizeCell(v: string): string {
  return (v ?? "")
    .replace(/^\uFEFF/, "") // BOM
    .trim()
    .replace(/^"|"$/g, "") // remove aspas nas pontas
    .replace(/\s+/g, " "); // colapsa espaços
}

function makeKey(r: ViagemRow): string {
  // chave composta exata pelos 4 campos, case-sensitive ou não?
  // Recomendo padronizar para upper no código e sentido; nome mantém acentos.
  const codigo = normalizeCell(r.codigoLinha).toUpperCase();
  const nome = normalizeCell(r.nomeLinha);
  const hora = normalizeCell(r.horaPartida);
  const sentido = normalizeCell(r.sentido).toUpperCase();
  return `${codigo}|${nome}|${hora}|${sentido}`;
}

function parseCsvToRows(csv: string): string[][] {
  // Parser simples para CSV separado por vírgula (sem suporte avançado a aspas com vírgula interna).
  // Se você tiver nomes com vírgula dentro de aspas, me avise que eu adapto.
  const lines = (csv ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line) => line.split(",").map((c) => normalizeCell(c)));
}

function buildCatalog(csvRaw: string) {
  const table = parseCsvToRows(csvRaw);

  const header = table[0] ?? [];
  const idxCodigo = header.findIndex((h) => /codigo\s*linha/i.test(h));
  const idxNome = header.findIndex((h) => /nome\s*da\s*linha/i.test(h));
  const idxHora = header.findIndex((h) => /hora\s*partida/i.test(h));
  const idxSentido = header.findIndex((h) => /sentido/i.test(h));

  if (idxCodigo < 0 || idxNome < 0 || idxHora < 0 || idxSentido < 0) {
    throw new Error(
      "CSV inválido: não encontrei os headers esperados (Codigo Linha, Nome da Linha, Hora Partida, Sentido).",
    );
  }

  const out: ViagemCatalog[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < table.length; i++) {
    const row = table[i];

    const codigoLinha = normalizeCell(row[idxCodigo] ?? "");
    const nomeLinha = normalizeCell(row[idxNome] ?? "");
    const horaPartida = normalizeCell(row[idxHora] ?? "");
    const sentido = normalizeCell(row[idxSentido] ?? "");

    if (/^codigo\s*linha$/i.test(codigoLinha)) continue;
    if (!codigoLinha || !nomeLinha || !horaPartida || !sentido) continue;

    const base: ViagemRow = { codigoLinha, nomeLinha, horaPartida, sentido };
    const id = makeKey(base);

    if (seen.has(id)) continue;
    seen.add(id);

    const item: ViagemCatalog = {
      id,
      codigoLinha,
      nomeLinha,
      horaPartida,
      sentido,
    };

    out.push(item);
  }

  const byKey = new Map<string, ViagemCatalog>();
  for (const r of out) byKey.set(r.id, r);

  return { rows: out, byKey };
}

// Catálogo pronto pra uso
export const viagensCatalog = buildCatalog(viagensCsvRaw);

// Helper de lookup (chave composta)

export function findViagem(args: {
  codigoLinha: string;
  nomeLinha: string;
  horaPartida: string;
  sentido: string;
}): ViagemCatalog | null {
  const key = makeKey({
    codigoLinha: args.codigoLinha,
    nomeLinha: args.nomeLinha,
    horaPartida: args.horaPartida,
    sentido: args.sentido,
  });
  return viagensCatalog.byKey.get(key) ?? null;
}
