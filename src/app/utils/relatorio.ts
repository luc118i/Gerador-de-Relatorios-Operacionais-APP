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
  const evidencias =
    ocorrencia.evidencias.length > 0
      ? `\n\nEvidências anexadas: ${ocorrencia.evidencias.length} foto(s).`
      : "";

  switch (ocorrencia.typeCode) {
    case "EXCESSO_VELOCIDADE": {
      const velocidade = ocorrencia.speedKmh ? `${ocorrencia.speedKmh} km/h` : "velocidade não informada";
      const horarioEvento = ocorrencia.horarioInicial || "";
      return `Em viagem realizada pelo veículo ${prefixo}${linhaInfo} iniciada no dia ${formatarData(ocorrencia.dataViagem)}, identificamos que o motorista excedeu o limite de velocidade pré-estabelecido por diversas vezes. No dia ${data}, às ${horarioEvento} chegou a atingir a velocidade de ${velocidade}, colocando em perigo não somente a própria integridade física, mas também a dos demais passageiros e usuários da rodovia.\n\nEssa conduta irresponsável representou um potencial risco de acidente ou colisão, configurando um flagrante de violação das normas de trânsito do CTB e um sério desrespeito à segurança viária.${evidencias}`;
    }

    case "DESCUMP_OP_PARADA_FORA":
    default: {
      const tipo = "PARADA FORA DO PROGRAMADO";
      const caracterizacao = "DESCUMPRIMENTO DE PROCEDIMENTO OPERACIONAL";
      const local = ocorrencia.localParada
        ? `, no local ${ocorrencia.localParada}`
        : "";
      return `Em ${data}, durante a execução da viagem do veículo prefixo ${prefixo}${linhaInfo}, foi constatado que o motorista realizou ${tipo}${local}${horario ? `, no período de ${horario}` : ""}, caracterizando ${caracterizacao}.${evidencias}`;
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
