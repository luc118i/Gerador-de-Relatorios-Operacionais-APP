import { Ocorrencia } from '../types';

export function gerarTextoRelatorioIndividual(ocorrencia: Ocorrencia): string {
  const motoristas = ocorrencia.motorista2
    ? `${ocorrencia.motorista1.matricula} – ${ocorrencia.motorista1.nome} – ${ocorrencia.motorista1.base}\n${ocorrencia.motorista2.matricula} – ${ocorrencia.motorista2.nome} – ${ocorrencia.motorista2.base}`
    : `${ocorrencia.motorista1.matricula} – ${ocorrencia.motorista1.nome} – ${ocorrencia.motorista1.base}`;

  const texto = `DESCUMPRIMENTO OPERACIONAL / PARADA FORA DO PROGRAMADO

LINHA: ${ocorrencia.viagem.linha}
PREFIXO: ${ocorrencia.viagem.prefixo}
HORÁRIO DA VIAGEM: ${ocorrencia.viagem.horario}
ORIGEM x DESTINO: ${ocorrencia.viagem.origem} x ${ocorrencia.viagem.destino}

MOTORISTA(S):
${motoristas}

DATA DO EVENTO: ${formatarData(ocorrencia.dataEvento)}
HORÁRIO INICIAL: ${ocorrencia.horarioInicial}
HORÁRIO FINAL: ${ocorrencia.horarioFinal}
LOCAL DA PARADA: ${ocorrencia.localParada}

${ocorrencia.evidencias.length > 0 ? `EVIDÊNCIAS: ${ocorrencia.evidencias.length} foto(s) anexada(s)` : ''}`;

  return texto;
}

export function gerarRelatorioDiario(ocorrencias: Ocorrencia[]): string {
  if (ocorrencias.length === 0) {
    return 'Nenhuma ocorrência registrada para esta data.';
  }

  const data = formatarData(ocorrencias[0].dataEvento);
  const blocos = ocorrencias.map(gerarTextoRelatorioIndividual);
  
  return `RELATÓRIO DIÁRIO - ${data}

Total de ocorrências: ${ocorrencias.length}

${'='.repeat(80)}

${blocos.join('\n\n' + '-'.repeat(80) + '\n\n')}`;
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function gerarTextoWhatsApp(ocorrencia: Ocorrencia): string {
  const motoristas = ocorrencia.motorista2
    ? `${ocorrencia.motorista1.matricula} – ${ocorrencia.motorista1.nome} – ${ocorrencia.motorista1.base}\n${ocorrencia.motorista2.matricula} – ${ocorrencia.motorista2.nome} – ${ocorrencia.motorista2.base}`
    : `${ocorrencia.motorista1.matricula} – ${ocorrencia.motorista1.nome} – ${ocorrencia.motorista1.base}`;

  return `🚨 *DESCUMPRIMENTO OPERACIONAL*

📋 *LINHA:* ${ocorrencia.viagem.linha}
🚌 *PREFIXO:* ${ocorrencia.viagem.prefixo}
⏰ *HORÁRIO DA VIAGEM:* ${ocorrencia.viagem.horario}
📍 *ORIGEM x DESTINO:* ${ocorrencia.viagem.origem} x ${ocorrencia.viagem.destino}

👤 *MOTORISTA(S):*
${motoristas}

📅 *DATA:* ${formatarData(ocorrencia.dataEvento)}
🕐 *INÍCIO:* ${ocorrencia.horarioInicial}
🕐 *FIM:* ${ocorrencia.horarioFinal}
📍 *LOCAL:* ${ocorrencia.localParada}`;
}
