export type OccurrenceDriverInput = {
  position: 1 | 2;
  driverId: string;
};

export type CreateOccurrenceInput = {
  // mínimo exigido pelo backend
  drivers: OccurrenceDriverInput[];

  // campos de ocorrência (deixei opcionais para não travar sua integração)
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;

  // se depois você quiser acoplar com viagem real:
  tripId?: string;
};
