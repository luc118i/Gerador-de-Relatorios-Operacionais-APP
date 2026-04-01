export type OccurrenceTypeConfig = {
  code: string;
  title: string;
  showPlace: boolean;
  showSpeed: boolean;
  singleTime: boolean; // true = apenas "Horário do Evento" (sem intervalo)
};

export const OCCURRENCE_TYPES: OccurrenceTypeConfig[] = [
  {
    code: "DESCUMP_OP_PARADA_FORA",
    title: "Parada Fora do Programado",
    showPlace: true,
    showSpeed: false,
    singleTime: false,
  },
  {
    code: "EXCESSO_VELOCIDADE",
    title: "Excesso de Velocidade",
    showPlace: false,
    showSpeed: true,
    singleTime: true,
  },
];

export function getOccurrenceTypeConfig(
  code: string,
): OccurrenceTypeConfig {
  return (
    OCCURRENCE_TYPES.find((t) => t.code === code) ?? {
      code,
      title: code,
      showPlace: true,
      showSpeed: false,
    }
  );
}
