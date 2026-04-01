export type OccurrenceDriverDTO = {
  position: 1 | 2;
  driverId: string;
  registry: string;
  name: string;
  baseCode: string;
};

export type OccurrenceDetailDTO = OccurrenceDTO & {
  reportText: string; // texto do relato completo
};

export type OccurrenceDriverInput = {
  position: 1 | 2;
  driverId: string;
};

export type CreateOccurrenceInput = {
  typeCode: string;

  eventDate: string;
  tripDate: string;
  startTime: string;
  endTime: string;

  vehicleNumber: string; // ✅ obrigatório no backend
  place?: string; // opcional — alguns tipos não têm local

  tripId?: string; // opcional no backend
  lineLabel?: string | null;
  baseCode?: string; // opcional (backend deriva se faltar)
  speedKmh?: number | null; // para tipo EXCESSO_VELOCIDADE

  // Campos do tipo GENERICO (CCO)
  reportTitle?: string | null;
  ccoOperator?: string | null;
  vehicleKm?: number | null;
  passengerCount?: number | null;
  passengerConnection?: string | null;
  relatoHtml?: string | null;
  devolutivaHtml?: string | null;
  devolutivaStatus?: string | null;

  drivers: OccurrenceDriverInput[];
};
// envelope padrão que o backend usa em listas (GET /drivers, GET /occurrences)
export type ApiData<T> = { data: T };

// retorno real do POST /occurrences (sucesso)
export type CreateOccurrenceResponse = { id: string };

// erro real (quando você for tratar no toast)
export type ApiErrorIssue = { path?: string[]; message: string };
export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    issues?: ApiErrorIssue[];
  };
};

// DTO da ocorrência (mantenha minimalista por enquanto, mas sem confundir com create)
export type OccurrenceDTO = {
  id: string;
  typeCode: string;
  typeTitle: string;
  eventDate: string; // YYYY-MM-DD
  tripDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  vehicleNumber: string;
  baseCode: string;
  lineLabel: string | null;
  place: string;
  speedKmh?: number | null;
  createdAt: string; // ISO
  drivers: OccurrenceDriverDTO[];
  evidenceCount: number;

  // Campos do tipo GENERICO (CCO)
  reportTitle?: string | null;
  ccoOperator?: string | null;
  vehicleKm?: number | null;
  passengerCount?: number | null;
  passengerConnection?: string | null;
  relatoHtml?: string | null;
  devolutivaHtml?: string | null;
  devolutivaStatus?: string | null;
};

export type CreateOccurrenceFormInput = {
  date: string;
  startTime: string;
  endTime: string;
  location: string;

  vehicleNumber: string; // ✅ novo

  tripId: string;

  driver1Id: string;
  driver2Id?: string | null;
  motorista2Ativo: boolean;
};
