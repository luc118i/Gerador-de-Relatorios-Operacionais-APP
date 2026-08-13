// Monta a mensagem de WhatsApp do "relatório diário por gestor" — uma
// notificação consolidada, por responsável, com as ocorrências do dia em
// TODAS as bases sob ele (um mesmo responsável pode ter várias siglas, ver
// BaseResponsaveisPage). Ver relatorio-diario.tsx (botão "Enviar pros
// gestores") e SendManagersModal.tsx (confirmação antes do envio).
import type { OccurrenceDTO } from "../domain/occurrences";
import type { BaseResponsavel } from "../api/baseResponsaveis.api";
import { formatPhoneForWhatsApp } from "./whatsapp";

const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO: "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE: "Vale",
  REGISTRO: "Só o Registro",
};

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export type ManagerGroup = {
  telefone: string; // já normalizado (formatPhoneForWhatsApp)
  responsavel: string;
  bases: BaseResponsavel[]; // todas as bases desse responsável com ocorrência hoje
  occurrenceCount: number;
};

/**
 * Agrupa as ocorrências do dia (já filtradas/exibidas na tela) por
 * responsável — usando o telefone como chave de agrupamento (o mesmo nome
 * digitado diferente em duas bases não deveria juntar; o telefone é o dado
 * que realmente identifica "é a mesma pessoa/mesmo WhatsApp").
 *
 * Bases sem telefone cadastrado ficam de fora dos grupos — quem chama deve
 * avisar o usuário quais bases foram puladas (ver `basesSemTelefone`).
 */
export function groupOccurrencesByManager(
  occurrences: OccurrenceDTO[],
  baseResponsaveis: BaseResponsavel[],
): { groups: ManagerGroup[]; occByBase: Map<string, OccurrenceDTO[]>; basesSemTelefone: string[] } {
  const occByBase = new Map<string, OccurrenceDTO[]>();
  for (const o of occurrences) {
    const sigla = o.baseCode || "—";
    if (!occByBase.has(sigla)) occByBase.set(sigla, []);
    occByBase.get(sigla)!.push(o);
  }

  const baseBySigla = new Map(baseResponsaveis.map((b) => [b.sigla, b]));
  const groupsByPhone = new Map<string, ManagerGroup>();
  const basesSemTelefone: string[] = [];

  for (const sigla of occByBase.keys()) {
    const base = baseBySigla.get(sigla);
    const phone = base?.telefone ? formatPhoneForWhatsApp(base.telefone) : null;
    if (!base || !phone) {
      basesSemTelefone.push(sigla);
      continue;
    }
    if (!groupsByPhone.has(phone)) {
      groupsByPhone.set(phone, { telefone: phone, responsavel: base.responsavel, bases: [], occurrenceCount: 0 });
    }
    const group = groupsByPhone.get(phone)!;
    group.bases.push(base);
    group.occurrenceCount += occByBase.get(sigla)!.length;
  }

  return { groups: [...groupsByPhone.values()], occByBase, basesSemTelefone };
}

/** Texto da notificação — uma seção por base, com uma linha por ocorrência. */
export function buildManagerDailyMessage(
  group: ManagerGroup,
  occByBase: Map<string, OccurrenceDTO[]>,
  reportDate: string,
): string {
  const dateStr = formatDateBR(reportDate);
  const primeiroNome = group.responsavel.trim().split(/\s+/)[0] || group.responsavel;

  const blocos = group.bases.map((base) => {
    const occs = occByBase.get(base.sigla) ?? [];
    const linhas = occs
      .map((o) => {
        const nome = o.typeCode === "GENERICO" && o.reportTitle ? o.reportTitle : o.typeTitle;
        const trat = o.tratativa ? TRATATIVA_LABEL[o.tratativa] ?? o.tratativa : "Sem tratativa";
        const motorista = o.drivers.find((d) => d.position === 1)?.name ?? "—";
        return `• ${o.startTime} — ${o.vehicleNumber} — ${motorista} — ${nome} — ${trat}`;
      })
      .join("\n");
    return `*${base.sigla} — ${base.visibilidade}* (${occs.length})\n${linhas}`;
  });

  return [
    `*RELATÓRIO DIÁRIO DE OCORRÊNCIAS — ${dateStr}*`,
    "",
    `Prezado(a) ${primeiroNome},`,
    "",
    `Segue o resumo das ocorrências de hoje na(s) sua(s) base(s):`,
    "",
    blocos.join("\n\n"),
    "",
    `Total: ${group.occurrenceCount} ocorrência(s).`,
  ].join("\n");
}
