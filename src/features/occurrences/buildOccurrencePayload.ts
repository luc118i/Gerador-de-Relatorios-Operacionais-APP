import type { CreateOccurrenceInput } from "../../domain/occurrences";

export function buildOccurrencePayload(args: {
  driver1Id: string | null;
  driver2Id: string | null;
  motorista2Ativo: boolean;

  eventDate: string;
  tripDate: string;
  startTime: string;
  endTime: string;
  place?: string;

  vehicleNumber: string;
  typeCode?: string;
  tripId?: string | null;
  tripTime?: string | null;
  lineLabel?: string | null;
  speedKmh?: number | null;

  // Campos do tipo GENERICO (CCO)
  reportTitle?: string | null;
  ccoOperator?: string | null;
  vehicleKm?: number | null;
  passengerCount?: number | null;
  passengerConnection?: string | null;
  relatoHtml?: string | null;
  devolutivaHtml?: string | null;
  devolutivaStatus?: string | null;
  showSectionViagem?: boolean;
  showSectionIdentificacao?: boolean;
  showSectionDados?: boolean;
  showSectionTripulacao?: boolean;
  showSectionPassageiros?: boolean;
  devolutivaBeforeEvidences?: boolean;
}): CreateOccurrenceInput {
  if (!args.driver1Id) throw new Error("Motorista 01 é obrigatório.");

  if (
    args.motorista2Ativo &&
    args.driver2Id &&
    args.driver2Id === args.driver1Id
  ) {
    throw new Error("Motorista 01 e 02 não podem ser o mesmo.");
  }

  const drivers: CreateOccurrenceInput["drivers"] = [
    { position: 1, driverId: args.driver1Id },
  ];

  if (args.motorista2Ativo && args.driver2Id) {
    drivers.push({ position: 2, driverId: args.driver2Id });
  }

  return {
    typeCode: args.typeCode ?? "DESCUMP_OP_PARADA_FORA",
    eventDate: args.eventDate,
    tripDate: args.tripDate,
    startTime: args.startTime,
    endTime: args.endTime,
    vehicleNumber: args.vehicleNumber.trim(),
    place: args.place?.trim() ?? "",
    tripId: args.tripId ?? undefined,
    tripTime: args.tripTime ?? null,
    lineLabel: args.lineLabel ?? null,
    speedKmh: args.speedKmh ?? null,
    // Campos GENERICO
    reportTitle: args.reportTitle ?? null,
    ccoOperator: args.ccoOperator ?? null,
    vehicleKm: args.vehicleKm ?? null,
    passengerCount: args.passengerCount ?? null,
    passengerConnection: args.passengerConnection ?? null,
    relatoHtml: args.relatoHtml ?? null,
    devolutivaHtml: args.devolutivaHtml ?? null,
    devolutivaStatus: args.devolutivaStatus ?? null,
    showSectionViagem: args.showSectionViagem ?? true,
    showSectionIdentificacao: args.showSectionIdentificacao ?? true,
    showSectionDados: args.showSectionDados ?? true,
    showSectionTripulacao: args.showSectionTripulacao ?? true,
    showSectionPassageiros: args.showSectionPassageiros ?? true,
    devolutivaBeforeEvidences: args.devolutivaBeforeEvidences ?? false,
    drivers,
    // baseCode: não manda (backend deriva)
  };
}
