import type { CreateOccurrenceInput } from "../../domain/occurrences";

export function buildOccurrencePayload(args: {
  driver1Id: string | null;
  driver2Id: string | null;
  motorista2Ativo: boolean;

  date: string; // dataEvento
  startTime: string; // horarioInicial
  endTime: string; // horarioFinal
  location: string; // localParada

  tripId?: string | null; // opcional (se você tiver viagem real no futuro)
}): CreateOccurrenceInput {
  const { driver1Id, driver2Id, motorista2Ativo } = args;

  if (!driver1Id) {
    throw new Error("Motorista 01 é obrigatório.");
  }

  if (motorista2Ativo && driver2Id && driver2Id === driver1Id) {
    throw new Error("Motorista 01 e 02 não podem ser o mesmo.");
  }

  const drivers: CreateOccurrenceInput["drivers"] = [
    { position: 1, driverId: driver1Id },
  ];

  if (motorista2Ativo && driver2Id) {
    drivers.push({ position: 2, driverId: driver2Id });
  }

  return {
    drivers,
    date: args.date,
    startTime: args.startTime,
    endTime: args.endTime,
    location: args.location.trim(),
    tripId: args.tripId ?? undefined,
  };
}
