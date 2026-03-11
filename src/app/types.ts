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
  legenda?: string | null;
  file?: File;
  linkTexto?: string | null;
  linkUrl?: string | null;
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
  descricao?: string;
  evidencias: Evidencia[];
  createdAt: string;
  details: {
    velocidade?: string;
    [key: string]: string | undefined;
  };
  type?: {
    id: string;
    code: string;
    title: string;
  };
}

export interface OccurrenceTypeDTO {
  id: string;
  code: string;
  title: string;
  description?: string;
  template?: string;
  active: boolean;
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

export type EvidenceUploadInput = {
  file: File;
  caption?: string;
  linkTexto?: string;
  linkUrl?: string;
};
