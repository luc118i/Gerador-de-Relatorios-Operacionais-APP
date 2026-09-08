import { normalizeText } from "../../utils/occurrenceVisibility";

/**
 * Parser da "passagem de serviço" do WhatsApp — porta do `interpretarPassagem`
 * do projeto GAS (`CONTROLE DE OCORRENCIAS/Código.js`). Regex + dicionário de
 * palavras-chave, sem IA. Roda 100% no cliente.
 */

/** `deburr` do GAS: sem acento, minúsculo (sem trim — normalizeText já apara). */
const deburr = (s: string) => normalizeText(s);

/**
 * Dicionário assunto → palavras-chave. Ordem importa: o primeiro assunto que
 * casar vence (mais específico primeiro). Portado de `_tipoMapDefault()`.
 */
export const TIPO_MAP: [subject: string, keywords: string[]][] = [
  ["PANE SECA", ["pane seca", "sem combustivel", "nao abasteceu", "faltou diesel", "ficou sem diesel"]],
  ["COLISÃO COM VÍTIMA", ["vitima", "ferido", "atropel", "feriment"]],
  ["Colisão com terceiro", ["colisao", "colidiu", "bateu", "abalro", "acidente", "terceiro"]],
  ["AVARIA", ["avaria", "para-brisa", "parabrisa", "para brisa", "arranhad", "amassad", "trincad", "bagageiro", "parachoque", "retrovisor", "vidro"]],
  ["PAX EM SURTO", ["surto", "transtorno", "agressiv", "descontrol"]],
  ["PAX DETIDO PELA POLÍCIA", ["detido", "policia", "prf", "preso"]],
  ["PAX deixado para trás", ["deixado para tras", "ficou no ponto", "deixou o pax", "deixou passageiro"]],
  ["PAX SEM EMBARQUE", ["sem embarque", "nao embarcou", "perdeu o onibus", "perdeu o ônibus", "nao conseguiu embarcar"]],
  ["PAX em atendimento", ["passou mal", "atendimento", "medic", "samu", "ambulancia", "mal subito", "desmai"]],
  ["SEM MOTORISTA", ["sem motorista", "motorista nao compareceu", "falta de motorista", "ausencia de motorista"]],
  ["ASSÉDIO", ["assedio", "importun"]],
];

/** Assuntos oferecidos no select da revisão (dicionário + livres comuns). */
export const SUBJECT_OPTIONS: string[] = [
  ...TIPO_MAP.map(([subject]) => subject),
  "PNEU",
  "OUTROS",
];

/** Classifica uma descrição num assunto do dicionário, ou "" se nada casar. */
export function classify(detalhes: string): string {
  const d = deburr(detalhes);
  for (const [subject, keywords] of TIPO_MAP) {
    for (const kw of keywords) {
      if (kw && d.includes(deburr(kw))) return subject;
    }
  }
  return "";
}

export type ParsedRow = {
  id: string;
  vehicleNumber: string;
  detalhes: string;
  /** assunto classificado, ou "OUTROS" quando não casou */
  subject: string;
  /** true = o dicionário classificou; false = caiu em "OUTROS" */
  matched: boolean;
};

export type ParsedPassagem = {
  /** data do cabeçalho (YYYY-MM-DD) ou null */
  eventDate: string | null;
  /** nome do operador/CCO do cabeçalho ("" se não achou) */
  operador: string;
  rows: ParsedRow[];
};

const RE_DATA = /(\d{2})\/(\d{2})\/(\d{4})/;
const RE_OPERADOR = /([^\n\-–—]+?)\s*[-–—]\s*CCO\b/i;
const RE_LINHA = /(\d{4,5})\s*[–—-]\s*(.+)$/;

/** Interpreta o texto colado da passagem e devolve a prévia editável. */
export function parsePassagem(text: string): ParsedPassagem {
  const txt = String(text ?? "");

  let eventDate: string | null = null;
  const mData = txt.match(RE_DATA);
  if (mData) eventDate = `${mData[3]}-${mData[2]}-${mData[1]}`;

  let operador = "";
  const mOp = txt.match(RE_OPERADOR);
  if (mOp) operador = mOp[1].trim();

  const rows: ParsedRow[] = [];
  const seen = new Set<string>();

  for (const linha of txt.split(/\r?\n/)) {
    const m = linha.match(RE_LINHA);
    if (!m) continue;
    const vehicleNumber = m[1];
    const detalhes = m[2].trim();
    if (!detalhes) continue;

    const key = `${vehicleNumber}|${deburr(detalhes)}`;
    if (seen.has(key)) continue; // remove repetições (ex.: eco de "EM ABERTO")
    seen.add(key);

    const subject = classify(detalhes);
    rows.push({
      id: `${vehicleNumber}-${rows.length}`,
      vehicleNumber,
      detalhes,
      subject: subject || "OUTROS",
      matched: !!subject,
    });
  }

  return { eventDate, operador, rows };
}
