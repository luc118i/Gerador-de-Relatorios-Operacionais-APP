// Monta a mensagem de WhatsApp do "relatório diário por gestor" — uma
// notificação consolidada, por responsável, com as ocorrências do dia em
// TODAS as bases sob ele (um mesmo responsável pode ter várias siglas, ver
// BaseResponsaveisPage). Ver relatorio-diario.tsx (botão "Enviar pros
// gestores") e SendManagersModal.tsx (confirmação antes do envio).
import type { OccurrenceDTO } from "../domain/occurrences";
import type { BaseResponsavel } from "../api/baseResponsaveis.api";
import { formatPhoneForWhatsApp } from "./whatsapp";
import { rizerDisciplinarEditUrl } from "./rizer";

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

// Saudação pelo horário do envio (não da data do relatório — o relatório de
// "ontem" pode ser mandado de manhã, a saudação segue o momento do envio).
function getSaudacao(hour = new Date().getHours()): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// occurrence.baseCode NÃO é a sigla de base_responsaveis — é a cidade em
// texto livre (ex.: "PALMAS", "Brasilia", "BRASILIA", "SÃO PAULO"), digitada
// em pontos diferentes do sistema (cadastro do motorista, importação etc.),
// com maiúscula/acento inconsistentes. O casamento com base_responsaveis só
// funciona comparando contra `visibilidade`, normalizado (maiúsculo, sem
// acento) — nunca contra `sigla`.
function normalizeCity(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
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
 * Só entram ocorrências que já tiveram tratativa aplicada — SUSPEICAO,
 * ADVERTENCIA ou VALE. Fora do relatório: sem tratativa ainda (null) e
 * REGISTRO ("Só o Registro") — o gestor não precisa ser acionado pra essas,
 * são só um registro no sistema, sem ação sobre o motorista.
 *
 * Ocorrências cujo baseCode não bate com nenhuma `visibilidade` cadastrada
 * ficam em `baseCodesSemCadastro` (base não existe em Base e Responsáveis,
 * ou o texto da cidade diverge — precisa acertar o cadastro). Bases
 * encontradas mas sem telefone ficam em `basesSemTelefone`.
 */
export function groupOccurrencesByManager(
  occurrences: OccurrenceDTO[],
  baseResponsaveis: BaseResponsavel[],
): {
  groups: ManagerGroup[];
  occByBase: Map<string, OccurrenceDTO[]>; // chave = sigla (canônica)
  basesSemTelefone: string[];
  baseCodesSemCadastro: string[];
} {
  const comTratativa = occurrences.filter((o) => o.tratativa && o.tratativa !== "REGISTRO");

  const baseByCity = new Map(baseResponsaveis.map((b) => [normalizeCity(b.visibilidade), b]));

  const occByBase = new Map<string, OccurrenceDTO[]>();
  const baseCodesSemCadastro = new Set<string>();

  for (const o of comTratativa) {
    const rawCity = o.baseCode || "—";
    const base = baseByCity.get(normalizeCity(rawCity));
    if (!base) {
      baseCodesSemCadastro.add(rawCity);
      continue;
    }
    if (!occByBase.has(base.sigla)) occByBase.set(base.sigla, []);
    occByBase.get(base.sigla)!.push(o);
  }

  const baseBySigla = new Map(baseResponsaveis.map((b) => [b.sigla, b]));
  const groupsByPhone = new Map<string, ManagerGroup>();
  const basesSemTelefone: string[] = [];

  for (const sigla of occByBase.keys()) {
    const base = baseBySigla.get(sigla)!;
    const phone = base.telefone ? formatPhoneForWhatsApp(base.telefone) : null;
    if (!phone) {
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

  return { groups: [...groupsByPhone.values()], occByBase, basesSemTelefone, baseCodesSemCadastro: [...baseCodesSemCadastro] };
}

/**
 * Todos os links de relatório (Drive) das ocorrências de um grupo de
 * gestores — usado pra encurtar tudo numa chamada só (ver linksApi.shorten)
 * antes de montar as mensagens, em vez de uma chamada por ocorrência.
 */
export function collectReportLinks(groups: ManagerGroup[], occByBase: Map<string, OccurrenceDTO[]>): string[] {
  const urls = new Set<string>();
  for (const group of groups) {
    for (const base of group.bases) {
      for (const o of occByBase.get(base.sigla) ?? []) {
        if (o.driveWebViewLink) urls.add(o.driveWebViewLink);
      }
    }
  }
  return [...urls];
}

/**
 * Texto da notificação — uma seção por base, com uma linha por ocorrência e,
 * quando existe, o link do relatório logo abaixo (encurtado — ver
 * `shortLinks`, resultado de linksApi.shorten/collectReportLinks — WhatsApp
 * não suporta texto-âncora em mensagem simples, então o jeito de não deixar
 * a mensagem gigante é encurtar a URL de verdade).
 */
export function buildManagerDailyMessage(
  group: ManagerGroup,
  occByBase: Map<string, OccurrenceDTO[]>,
  reportDate: string,
  shortLinks: Map<string, string> = new Map(),
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
        // Já registrada no RIZER: só confirma. Ainda não registrada: avisa
        // explicitamente — o gestor precisa saber que aquela ocorrência
        // ainda não está lá, em vez de simplesmente não ver nada e assumir
        // que já foi tratada.
        const rizerTag = o.rizerRegistered ? " (RIZER)" : " (verifica o RIZER)";
        const linkLine = o.driveWebViewLink
          ? `\n  Relatório: ${shortLinks.get(o.driveWebViewLink) ?? o.driveWebViewLink}`
          : "";
        return `• *${o.vehicleNumber}* — ${motorista} — ${nome} — ${trat}${rizerTag}${linkLine}`;
      })
      // Linha em branco entre ocorrências — "• PREFIXO — ..." grudado um no
      // outro (join simples com \n) ficava difícil de escanear quando a base
      // tem várias no mesmo dia.
      .join("\n\n");
    return `*${base.sigla} — ${base.visibilidade}* (${occs.length})\n${linhas}`;
  });

  return [
    `📋 *RELATÓRIO DIÁRIO DE OCORRÊNCIAS — ${dateStr}*`,
    "",
    `${getSaudacao()}, ${primeiroNome}! 👋`,
    "",
    `Segue o resumo das ocorrências de hoje na(s) sua(s) base(s):`,
    "",
    blocos.join("\n\n"),
    "",
    `Total: ${group.occurrenceCount} ocorrência(s).`,
    "",
    `📎 Segue em anexo a planilha com todas as ocorrências e o link de cada uma no RIZER.`,
  ].join("\n");
}

/**
 * Texto da COBRANÇA de devolutiva — usado na seção "Ocorrências Pendentes de
 * Tratamento" do Centro de Relatórios. Diferente do relatório diário: lista só
 * as ocorrências que o gestor ainda não fechou no RIZER (sem "Solucionado") e
 * dá o link direto do registro pra ele abrir e preencher a devolutiva.
 *
 * Assinatura igual a `buildManagerDailyMessage` (o SendManagersModal chama as
 * duas do mesmo jeito). `reportDate` e `shortLinks` não são usados aqui — o
 * link do RIZER é curto e do mesmo domínio, não precisa encurtar.
 */
export function buildManagerCobrancaMessage(
  group: ManagerGroup,
  occByBase: Map<string, OccurrenceDTO[]>,
  _reportDate?: string,
  _shortLinks?: Map<string, string>,
): string {
  const primeiroNome = group.responsavel.trim().split(/\s+/)[0] || group.responsavel;

  const blocos = group.bases.map((base) => {
    const occs = occByBase.get(base.sigla) ?? [];
    const linhas = occs
      .map((o) => {
        const nome = o.typeCode === "GENERICO" && o.reportTitle ? o.reportTitle : o.typeTitle;
        const trat = o.tratativa ? TRATATIVA_LABEL[o.tratativa] ?? o.tratativa : "Sem tratativa";
        const motorista = o.drivers.find((d) => d.position === 1)?.name ?? "—";
        const dataEvento = formatDateBR(o.eventDate);
        const linkLine = o.rizerId
          ? `\n   🔗 ${rizerDisciplinarEditUrl(o.rizerId)}`
          : "\n   (sem link — localizar no RIZER por matrícula)";
        return `• *${o.vehicleNumber}* — ${motorista}\n   ${nome} · ${trat} · ${dataEvento}${linkLine}`;
      })
      // Linha em branco entre cada ocorrência pra facilitar a leitura no WhatsApp.
      .join("\n\n");
    return `*${base.sigla} — ${base.visibilidade}* (${occs.length})\n\n${linhas}`;
  });

  return [
    `⚠️ *OCORRÊNCIAS AGUARDANDO DEVOLUTIVA NO RIZER*`,
    "",
    `${getSaudacao()}, ${primeiroNome}! Tudo bem? 👋`,
    "",
    `Passando para lembrar das ocorrências abaixo — elas já foram tratadas por aqui e *aguardam a devolutiva do gestor* no RIZER. Favor acessar cada registro pelo link e informar a devolutiva. 🙏`,
    "",
    blocos.join("\n\n\n"),
    "",
    `Total pendente de devolutiva: *${group.occurrenceCount}* ocorrência(s).`,
    "",
    `📎 Segue em anexo a planilha com todas as ocorrências organizadas e o link de cada uma.`,
    "",
    `Qualquer dúvida, estamos à disposição. Obrigado!`,
    "",
    `_Equipe de Monitoramento_`,
    "",
    `_*Caso não tenha acesso ao RIZER, favor buscar orientação com os responsáveis da equipe de TI.*_`,
  ].join("\n");
}
