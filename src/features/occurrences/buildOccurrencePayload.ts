import type { CreateOccurrenceInput } from "../../domain/occurrences";

export function buildOccurrencePayload(args: {
  driver1Id: string | null;
  driver2Id: string | null;
  motorista2Ativo: boolean;

  eventDate: string;
  tripDate: string;
  startTime: string;
  endTime: string;
  place: string;

  vehicleNumber: string;
  typeCode?: string;
  tripId?: string | null;
  lineLabel?: string | null;
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
    place: args.place.trim(),
    tripId: args.tripId ?? undefined,
    lineLabel: args.lineLabel ?? null,
    drivers,
    // baseCode: não manda (backend deriva)
  };
}
