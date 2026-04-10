import { Ocorrencia } from "../types";

function getLinha(v: Ocorrencia["viagem"]): string {
  return "linha" in v ? String(v.linha ?? "") : "";
}

function getPrefixo(v: Ocorrencia["viagem"]): string {
  return "prefixo" in v ? String(v.prefixo ?? "") : "";
}

function getHorario(v: Ocorrencia["viagem"]): string {
  return "horario" in v ? String(v.horario ?? "") : "";
}

function getOrigem(v: Ocorrencia["viagem"]): string {
  return "origem" in v ? String(v.origem ?? "") : "";
}

function getDestino(v: Ocorrencia["viagem"]): string {
  return "destino" in v ? String(v.destino ?? "") : "";
}

/** Remove tags HTML e decodifica entidades básicas para texto plano. */
function htmlParaTexto(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function gerarTextoRelatorioIndividual(ocorrencia: Ocorrencia): string {
  const data = formatarData(ocorrencia.dataEvento);
  const v = ocorrencia.viagem;
  const prefixo = getPrefixo(v);
  const linha = getLinha(v);
  const linhaInfo = linha ? ` (linha ${linha})` : "";
  const horario =
    ocorrencia.horarioInicial && ocorrencia.horarioFinal
      ? `${ocorrencia.horarioInicial} às ${ocorrencia.horarioFinal}`
      : "";

  switch (ocorrencia.typeCode) {
    case "GENERICO": {
      // Para relatórios genéricos, o "texto individual" É o relato registrado.
      if (ocorrencia.relatoHtml?.trim()) {
        const relatoPlano = htmlParaTexto(ocorrencia.relatoHtml);
        const devolutivaPlano = ocorrencia.devolutivaHtml?.trim()
          ? "\n\n— DEVOLUTIVA —\n\n" + htmlParaTexto(ocorrencia.devolutivaHtml)
          : "";
        return relatoPlano + devolutivaPlano;
      }
      // Fallback sem relato
      const titulo = ocorrencia.reportTitle?.trim() || "Relatório Genérico";
      return `${titulo}\n\nData: ${data}${linhaInfo ? `\nLinha: ${linha}` : ""}${prefixo ? `\nPrefixo: ${prefixo}` : ""}\n\n(Sem relato registrado)`;
    }

    case "EXCESSO_VELOCIDADE": {
      const velocidade = ocorrencia.speedKmh ? `${ocorrencia.speedKmh} km/h` : "velocidade não informada";
      const horarioEvento = ocorrencia.horarioInicial || "";
      return `Em viagem realizada pelo veículo ${prefixo}${linhaInfo} iniciada no dia ${formatarData(ocorrencia.dataViagem)}, identificamos que o motorista excedeu o limite de velocidade pré-estabelecido por diversas vezes. No dia ${data}, às ${horarioEvento} chegou a atingir a velocidade de ${velocidade}, colocando em perigo não somente a própria integridade física, mas também a dos demais passageiros e usuários da rodovia.\n\nEssa conduta irresponsável representou um potencial risco de acidente ou colisão, configurando um flagrante de violação das normas de trânsito do CTB e um sério desrespeito à segurança viária.`;
    }

    case "DESCUMP_OP_PARADA_FORA":
    default: {
      const tipo = "PARADA FORA DO PROGRAMADO";
      const caracterizacao = "DESCUMPRIMENTO DE PROCEDIMENTO OPERACIONAL";
      const local = ocorrencia.localParada
        ? `, no local ${ocorrencia.localParada}`
        : "";
      return `Em ${data}, durante a execução da viagem do veículo prefixo ${prefixo}${linhaInfo}, foi constatado que o motorista realizou ${tipo}${local}${horario ? `, no período de ${horario}` : ""}, caracterizando ${caracterizacao}.`;
    }
  }
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function gerarRelatorioDiario(ocorrencias: Ocorrencia[]): string {
  if (ocorrencias.length === 0) {
    return "Nenhuma ocorrência registrada para esta data.";
  }

  const data = formatarData(ocorrencias[0].dataEvento);
  const blocos = ocorrencias.map(gerarTextoRelatorioIndividual);

  return `RELATÓRIO DIÁRIO - ${data}

Total de ocorrências: ${ocorrencias.length}

${"=".repeat(80)}

${blocos.join("\n\n" + "-".repeat(80) + "\n\n")}`;
}

export function gerarTextoWhatsApp(ocorrencia: Ocorrencia): string {
  const motoristas = ocorrencia.motorista2
    ? `${ocorrencia.motorista1.matricula} – ${ocorrencia.motorista1.nome} – ${ocorrencia.motorista1.base}\n${ocorrencia.motorista2.matricula} – ${ocorrencia.motorista2.nome} – ${ocorrencia.motorista2.base}`
    : `${ocorrencia.motorista1.matricula} – ${ocorrencia.motorista1.nome} – ${ocorrencia.motorista1.base}`;

  const v = ocorrencia.viagem;

  // ── GENERICO (CCO) ──────────────────────────────────────────────────────────
  if (ocorrencia.typeCode === "GENERICO") {
    const origem  = getOrigem(v);
    const destino = getDestino(v);
    const horario = getHorario(v);
    const prefixo = getPrefixo(v);
    const linha   = getLinha(v);

    // "Maceió x São Paulo – 08h" quando há origem/destino, senão usa linha direta
    const itinerario = origem && destino
      ? `${origem} x ${destino}${horario ? ` – ${horario}` : ""}`
      : `${linha}${horario ? ` – ${horario}` : ""}`;

    const local      = ocorrencia.localParada || "—";
    const nomeRelat  = ocorrencia.reportTitle || ocorrencia.typeTitle || "—";

    return `ITINERÁRIO: ${itinerario}
PREFIXO: ${prefixo || "—"}
DATA: ${formatarData(ocorrencia.dataEvento)}

📍 Local: ${local}

⚠️ Ocorrência: ${nomeRelat}`;
  }

  // ── EXCESSO DE VELOCIDADE ───────────────────────────────────────────────────
  if (ocorrencia.typeCode === "EXCESSO_VELOCIDADE") {
    return `🚨 *EXCESSO DE VELOCIDADE*

📋 *LINHA:* ${getLinha(v)}
🚌 *PREFIXO:* ${getPrefixo(v)}
⏰ *HORÁRIO DA VIAGEM:* ${getHorario(v)}
📍 *ORIGEM x DESTINO:* ${getOrigem(v)} x ${getDestino(v)}

👤 *MOTORISTA(S):*
${motoristas}

📅 *DATA:* ${formatarData(ocorrencia.dataEvento)}
🕐 *HORÁRIO DO EVENTO:* ${ocorrencia.horarioInicial}
🏎️ *VELOCIDADE ATINGIDA:* ${ocorrencia.speedKmh ? `${ocorrencia.speedKmh} km/h` : "—"}`;
  }

  // ── PARADA FORA DO PROGRAMADO (padrão) ─────────────────────────────────────
  return `🚨 *DESCUMPRIMENTO OPERACIONAL*

📋 *LINHA:* ${getLinha(v)}
🚌 *PREFIXO:* ${getPrefixo(v)}
⏰ *HORÁRIO DA VIAGEM:* ${getHorario(v)}
📍 *ORIGEM x DESTINO:* ${getOrigem(v)} x ${getDestino(v)}

👤 *MOTORISTA(S):*
${motoristas}

📅 *DATA:* ${formatarData(ocorrencia.dataEvento)}
🕐 *INÍCIO:* ${ocorrencia.horarioInicial}
🕐 *FIM:* ${ocorrencia.horarioFinal}
📍 *LOCAL:* ${ocorrencia.localParada}`;
}
