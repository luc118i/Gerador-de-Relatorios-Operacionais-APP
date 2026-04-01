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
  sentido?: string;
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
  typeCode?: string;
  typeTitle?: string;
  viagem: Viagem;
  motorista1: Motorista;
  motorista2?: Motorista;
  dataEvento: string;
  dataViagem: string;
  horarioInicial: string;
  horarioFinal: string;
  localParada: string;
  speedKmh?: number | null;
  evidencias: Evidencia[];
  createdAt: string;

  // Campos do tipo GENERICO (CCO)
  reportTitle?: string | null;        // Nome do relatório (ex: "Atendimento Especial")
  ccoOperator?: string | null;        // Operador CCO
  vehicleKm?: number | null;          // KM do Veículo
  passengerCount?: number | null;     // Qtd. Passageiros
  passengerConnection?: string | null; // Passageiros Conexão
  relatoHtml?: string | null;         // HTML do relato (rich text)
  devolutivaHtml?: string | null;     // HTML da devolutiva (opcional)
  devolutivaStatus?: string | null;   // Status: "EM_ANDAMENTO" | "RESOLVIDO" | null
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
