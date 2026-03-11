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
  // 1. Identifica o tipo
  const isVelocidade = ocorrencia.type?.code === "DESCUMP_OP_VELOCIDADE";

  // 2. Define os textos base
  const tipo = isVelocidade
    ? "EXCESSO DE VELOCIDADE"
    : "PARADA FORA DO PROGRAMADO";
  const caracterizacao = "DESCUMPRIMENTO DE PROCEDIMENTO OPERACIONAL";

  const data = formatarData(ocorrencia.dataEvento);
  const v = ocorrencia.viagem;
  const prefixo = getPrefixo(v);
  const linha = getLinha(v);
  const linhaInfo = linha ? ` (linha ${linha})` : "";

  // 3. BUSCA O KM (Aqui é onde o "vazio" se resolve)
  // Se for velocidade, ele monta a frase do KM. Se não, fica vazio.
  const kmInfo =
    isVelocidade && ocorrencia.details?.velocidade
      ? ` atingindo a velocidade de **${ocorrencia.details.velocidade} km/h**`
      : "";

  // 4. Ajusta o horário (Velocidade usa um ponto no tempo, Parada usa um período)
  const horario = isVelocidade
    ? ` às ${ocorrencia.horarioInicial}`
    : ocorrencia.horarioInicial && ocorrencia.horarioFinal
      ? `, no período de ${ocorrencia.horarioInicial} às ${ocorrencia.horarioFinal}`
      : "";

  const local = ocorrencia.localParada
    ? `, no local ${ocorrencia.localParada}`
    : "";

  // 5. Retorno da frase montada
  return `Em ${data}, durante a execução da viagem do veículo prefixo ${prefixo}${linhaInfo}, foi constatado que o motorista realizou ${tipo}${kmInfo}${local}${horario}, caracterizando ${caracterizacao}.`;
}

export function gerarTextoWhatsApp(ocorrencia: Ocorrencia): string {
  const isVelocidade = ocorrencia.type?.code === "DESCUMP_OP_VELOCIDADE";

  const motoristas = ocorrencia.motorista2
    ? `${ocorrencia.motorista1.matricula} – ${ocorrencia.motorista1.nome} – ${ocorrencia.motorista1.base}\n${ocorrencia.motorista2.matricula} – ${ocorrencia.motorista2.nome} – ${ocorrencia.motorista2.base}`
    : `${ocorrencia.motorista1.matricula} – ${ocorrencia.motorista1.nome} – ${ocorrencia.motorista1.base}`;

  const v = ocorrencia.viagem;
  const titulo = isVelocidade
    ? "🚨 *EXCESSO DE VELOCIDADE*"
    : "🚨 *DESCUMPRIMENTO OPERACIONAL*";

  let textoBase = `${titulo}

📋 *LINHA:* ${getLinha(v)}
🚌 *PREFIXO:* ${getPrefixo(v)}
⏰ *HORÁRIO DA VIAGEM:* ${getHorario(v)}
📍 *ORIGEM x DESTINO:* ${getOrigem(v)} x ${getDestino(v)}

👤 *MOTORISTA(S):*
${motoristas}

📅 *DATA:* ${formatarData(ocorrencia.dataEvento)}`;

  // Adiciona campos específicos
  if (isVelocidade) {
    textoBase += `\n⚡ *VELOCIDADE:* ${ocorrencia.details?.velocidade} km/h`;
    textoBase += `\n🕐 *HORÁRIO:* ${ocorrencia.horarioInicial}`;
  } else {
    textoBase += `\n🕐 *INÍCIO:* ${ocorrencia.horarioInicial}`;
    textoBase += `\n🕐 *FIM:* ${ocorrencia.horarioFinal}`;
  }

  textoBase += `\n📍 *LOCAL:* ${ocorrencia.localParada}`;

  return textoBase;
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
