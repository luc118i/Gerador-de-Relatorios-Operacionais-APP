export type Driver = {
  id: string;
  code: string; // matrícula
  name: string;
  base: string | null;
};

export type CreateDriverInput = {
  code: string;
  name: string;
  base?: string | null;
};

// Estatísticas do motorista no período retido pelo banco (mês corrente).
export type DriverStats = {
  driverId: string;
  advertencia: number;
  vale: number;
  suspensao: number;
  total: number; // total de ocorrências no período (todos os tipos)
  periodLabel?: string | null; // ex.: "junho/2026"
};
