export interface Motorista {
  matricula: string;
  nome: string;
  base: string;
}

export interface Viagem {
  id: string;
  linha: string;
  prefixo: string;
  horario: string;
  origem: string;
  destino: string;
  motorista1: Motorista;
  motorista2?: Motorista;
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
  horarioInicial: string;
  horarioFinal: string;
  localParada: string;
  evidencias: Evidencia[];
  createdAt: string;
}
