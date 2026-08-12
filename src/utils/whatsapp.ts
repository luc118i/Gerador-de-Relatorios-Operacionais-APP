// Helpers para a notificação de motoristas via WhatsApp na preview de
// ocorrência. O envio em si é feito pelo RIZER Agent (automação local via
// WhatsApp Web) — ver src/api/whatsappAgent.api.ts.
import type { Ocorrencia } from "../app/types";
import { gerarTextoWhatsApp } from "./relatorio";

// Normaliza um telefone em formato livre (com DDD, parênteses, traço etc.)
// para o formato exigido pelo WhatsApp: só dígitos, com DDI. Assume Brasil
// (55) quando o número já não vem com DDI (heurística: 10 ou 11 dígitos =
// DDD + número local).
export function formatPhoneForWhatsApp(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

// Remove emoji (inclusive sequências com seletor de variação, ex.: ⏱️) do
// texto interno usado pelo time de operação — mensagem para o motorista deve
// ter tom institucional, sem emoji. Também evita o caractere "�" que aparece
// quando um emoji de plano astral (4 bytes) é malformatado em algum trecho da
// cadeia de envio.
function stripEmoji(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}️]/gu, "")
    .split("\n")
    .map((line) => line.replace(/^[ \t]+/, "").replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Formata um bloco de texto (relato/devolutiva) como citação do WhatsApp:
// cada linha vira "> _linha_" — cita (>) e itálico (_..._) juntos, pra
// destacar visualmente que é um texto reproduzido, não a mensagem em si.
// Linhas vazias (quebra de parágrafo) ficam em branco, sem marcação.
function formatarComoCitacao(texto: string): string {
  return texto
    .split("\n")
    .map((linha) => (linha.trim() ? `> _${linha.trim()}_` : ""))
    .join("\n");
}

// Introdução varia com o tipo da ocorrência — a mensagem deve soar coerente
// com o que de fato aconteceu, não um texto genérico repetido pra tudo.
const TYPE_INTRO: Record<string, string> = {
  EXCESSO_VELOCIDADE: "Foi identificado um excesso de velocidade registrado em seu nome:",
  EXCESSO_PERMANENCIA: "Foi identificada uma permanência acima do tempo permitido, registrada em seu nome:",
  GENERICO: "Foi registrada a seguinte ocorrência em seu nome:",
};
const DEFAULT_INTRO = "Foi registrada uma parada fora do itinerário programado em seu nome:";

function getIntro(occurrence: Ocorrencia): string {
  return TYPE_INTRO[occurrence.typeCode ?? ""] ?? DEFAULT_INTRO;
}

// Mensagem institucional de notificação ao motorista: saudação formal +
// introdução contextual ao tipo + dados da ocorrência (reaproveita
// gerarTextoWhatsApp, só sem emoji) + encerramento. Nos GENÉRICOS, inclui
// também o relato — só quando já resumido por IA (mesmo texto da seção
// "Relato em Texto Plano" da preview); sem resumo gerado, a seção fica de
// fora (não manda o relato bruto). Sem devolutiva — só o relato.
export function buildDriverNotificationMessage(
  driverName: string,
  occurrence: Ocorrencia,
  opts?: { genericoRelatoIA?: string | null },
): string {
  const nome = driverName.trim() || "motorista";
  const corpo = stripEmoji(gerarTextoWhatsApp(occurrence));

  const parts = [`Prezado(a) ${nome},`, "", getIntro(occurrence), "", corpo];

  if (occurrence.typeCode === "GENERICO") {
    const relatoIA = opts?.genericoRelatoIA?.trim();
    if (relatoIA) {
      parts.push("", "*Relato:*", "", formatarComoCitacao(relatoIA));
    }
  }

  parts.push("", "Procure seu gestor.");
  return parts.join("\n");
}
