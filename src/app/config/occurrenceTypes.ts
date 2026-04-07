export type OccurrenceTypeConfig = {
  code: string;
  title: string;
  description: string;
  showPlace: boolean;
  showSpeed: boolean;
  singleTime: boolean; // true = apenas "Horário do Evento" (sem intervalo)
  isGeneric: boolean; // true = formulário genérico CCO com relato livre
};

export const OCCURRENCE_TYPES: OccurrenceTypeConfig[] = [
  {
    code: "DESCUMP_OP_PARADA_FORA",
    title: "Parada Fora do Programado",
    description: "Parada em local não autorizado",
    showPlace: true,
    showSpeed: false,
    singleTime: false,
    isGeneric: false,
  },
  {
    code: "EXCESSO_VELOCIDADE",
    title: "Excesso de Velocidade",
    description: "Infração por velocidade acima do limite",
    showPlace: false,
    showSpeed: true,
    singleTime: true,
    isGeneric: false,
  },
  {
    code: "GENERICO",
    title: "Genérico (CCO)",
    description: "Relatório livre com relato e devolutiva",
    showPlace: true,
    showSpeed: false,
    singleTime: true,
    isGeneric: true,
  },
];

export function getOccurrenceTypeConfig(code: string): OccurrenceTypeConfig {
  return (
    OCCURRENCE_TYPES.find((t) => t.code === code) ?? {
      code,
      title: code,
      description: code, // ou "Tipo de ocorrência desconhecido"
      showPlace: true,
      showSpeed: false,
      singleTime: true,
      isGeneric: false,
    }
  );
}
