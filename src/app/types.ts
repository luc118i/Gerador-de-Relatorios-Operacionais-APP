export interface Motorista {
  id: string;
  matricula: string;
  nome: string;
  base: string;
}

export interface Viagem {
  id: string;
  linha?: string;
  prefixo?: string;
  horario?: string;
  codigoLinha?: string;
  nomeLinha?: string;
  origem?: string;
  destino?: string;
}

export interface Evidencia {
  id: string;
  url: string;
  legenda?: string;
  file?: File;
}

export interface Ocorrencia {
  id: string;
  viagem: Viagem;
  motorista1: Motorista;
  motorista2?: Motorista;
  dataEvento: string;
  dataViagem: string;
  horarioInicial: string;
  horarioFinal: string;
  localParada: string;
  evidencias: Evidencia[];
  createdAt: string;
}

export type ApiError = {
  error: {
    code: string;
    message: string;
    issues?: Array<{
      code: string;
      message: string;
      path: Array<string | number>;
    }>;
  };
};

export type ViagemCatalog = {
  id: string; // chave composta dedup
  codigoLinha: string;
  nomeLinha: string;
  horaPartida: string;
  sentido: string;
};
