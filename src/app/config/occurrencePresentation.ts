import type { OccurrenceDTO } from "../../domain/occurrences";
import { getOccurrenceTypeConfig } from "./occurrenceTypes";
import { resolveBaseSigla } from "../../utils/base";

/**
 * Quais campos de contexto fazem sentido exibir para uma ocorrência.
 *
 * Nem todo modelo de relatório tem prefixo, horário, motorista ou local: um
 * GENÉRICO (CCO) pode ter as seções "Dados do Evento" / "Tripulação" /
 * "Viagem" desligadas no formulário, e aí esses campos são salvos vazios
 * (ou com placeholders "0" / "00:00"). Em vez de mostrar "—" em toda linha,
 * a apresentação (lista, cards e preview) esconde o campo.
 *
 * A regra é orientada por dados: se o valor existe, mostra; se é vazio ou
 * placeholder, esconde. Tipos estruturados (parada fora, excesso de
 * velocidade/permanência) sempre têm esses campos, então nunca são escondidos
 * — exceto "local", que segue a config do tipo (excesso de velocidade não tem).
 */
export type OccurrenceFieldVisibility = {
  prefixo: boolean;
  horario: boolean;
  motorista: boolean;
  local: boolean;
  linha: boolean;
  base: boolean;
};

/** Tipos com formulário fixo — sempre têm prefixo/horário/motorista/viagem. */
const STRUCTURED_TYPES = new Set([
  "DESCUMP_OP_PARADA_FORA",
  "EXCESSO_VELOCIDADE",
  "EXCESSO_PERMANENCIA",
]);

const PLACEHOLDER_PREFIXO = new Set(["", "0", "-", "—"]);
const PLACEHOLDER_HORARIO = new Set(["", "00:00", "-", "—"]);

function firstDriverName(o: OccurrenceDTO): string {
  return (o.drivers?.find((d) => d.position === 1)?.name ?? "").trim();
}

export function getOccurrenceFieldVisibility(o: OccurrenceDTO): OccurrenceFieldVisibility {
  const hasDriver = !!firstDriverName(o);

  if (STRUCTURED_TYPES.has(o.typeCode)) {
    const cfg = getOccurrenceTypeConfig(o.typeCode);
    return {
      prefixo: true,
      horario: true,
      motorista: hasDriver,
      local: cfg.showPlace,
      linha: true,
      base: true,
    };
  }

  // GENÉRICO / ANÁLISE OP / tipos livres — seções que o autor desligou zeram
  // o bloco inteiro; dentro dele, cada campo ainda depende de ter valor.
  const dadosOn = o.showSectionDados !== false;
  const tripOn = o.showSectionTripulacao !== false;
  const viagemOn = o.showSectionViagem !== false;

  const prefixo = (o.vehicleNumber ?? "").trim();
  const horario = (o.startTime ?? "").trim();
  // Horário de partida da linha (viagem). Para a ANÁLISE OPERACIONAL DE VIAGEM
  // o "horário do evento" não existe — o horário relevante é o da linha.
  const horarioLinha = (o.tripTime ?? "").trim();
  const local = (o.place ?? "").trim();
  const hasPontos = (o.points?.length ?? 0) > 0;

  // Base só aparece quando é uma base de verdade: a do motorista (sempre
  // canônica) ou um `baseCode` que o mapa reconhece. Modelos livres sem
  // tripulação (ex. ANÁLISE OPERACIONAL DE VIAGEM) salvam `baseCode` com o
  // nome do modelo ("GENÉRICO"), que virava uma sigla sem sentido ("GENERI").
  const driverBase = (o.drivers?.find((d) => d.position === 1)?.baseCode ?? "").trim();

  return {
    prefixo: dadosOn && !PLACEHOLDER_PREFIXO.has(prefixo),
    horario:
      dadosOn &&
      (!PLACEHOLDER_HORARIO.has(horario) || !PLACEHOLDER_HORARIO.has(horarioLinha)),
    motorista: tripOn && hasDriver,
    local: dadosOn && (!!local || hasPontos),
    linha: viagemOn && !!(o.lineLabel ?? "").trim(),
    base: !!driverBase || resolveBaseSigla((o.baseCode ?? "").trim()) !== null,
  };
}

/** Une a visibilidade de um grupo de ocorrências: um campo aparece como
 * coluna se pelo menos uma linha do grupo o utiliza. */
export function mergeFieldVisibility(list: OccurrenceDTO[]): OccurrenceFieldVisibility {
  return list.reduce<OccurrenceFieldVisibility>(
    (acc, o) => {
      const v = getOccurrenceFieldVisibility(o);
      return {
        prefixo: acc.prefixo || v.prefixo,
        horario: acc.horario || v.horario,
        motorista: acc.motorista || v.motorista,
        local: acc.local || v.local,
        linha: acc.linha || v.linha,
        base: acc.base || v.base,
      };
    },
    { prefixo: false, horario: false, motorista: false, local: false, linha: false, base: false },
  );
}
