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
  const tipo = "PARADA FORA DO PROGRAMADO";
  const caracterizacao = "DESCUMPRIMENTO DE PROCEDIMENTO OPERACIONAL";

  const data = formatarData(ocorrencia.dataEvento);

  const v = ocorrencia.viagem;
  const prefixo = getPrefixo(v);
  const linha = getLinha(v);
  const linhaInfo = linha ? ` (linha ${linha})` : "";

  const horario =
    ocorrencia.horarioInicial && ocorrencia.horarioFinal
      ? `${ocorrencia.horarioInicial} às ${ocorrencia.horarioFinal}`
      : "";

  const local = ocorrencia.localParada
    ? `, no local ${ocorrencia.localParada}`
    : "";

  const evidencias =
    ocorrencia.evidencias.length > 0
      ? `\n\nEvidências anexadas: ${ocorrencia.evidencias.length} foto(s).`
      : "";

  return `Em ${data}, durante a execução da viagem do veículo prefixo ${prefixo}${linhaInfo}, foi constatado que o motorista realizou ${tipo}${local}${horario ? `, no período de ${horario}` : ""}, caracterizando ${caracterizacao}.

A conduta impactou a regularidade da operação e o cumprimento das diretrizes estabelecidas pela empresa.

Registro para fins de apuração administrativa e aplicação de medida disciplinar cabível.`;
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
