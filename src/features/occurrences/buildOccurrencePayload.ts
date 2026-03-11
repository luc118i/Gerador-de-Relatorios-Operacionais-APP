import type { CreateOccurrenceInput } from "../../domain/occurrences";

export function buildOccurrencePayload(args: {
  driver1: any;
  driver2: any;
  motorista2Ativo: boolean;
  eventDate: string;
  tripDate: string;
  startTime: string;
  endTime?: string;
  place: string;
  vehicleNumber: string;
  typeCode?: string;
  tripId?: string | null;
  lineLabel?: string | null;
  details?: Record<string, any>;
}): CreateOccurrenceInput {
  // 1. Validação básica
  if (!args.driver1) throw new Error("Motorista 01 é obrigatório.");

  if (
    args.motorista2Ativo &&
    args.driver2 &&
    args.driver2.id === args.driver1.id
  ) {
    throw new Error("Motorista 01 e 02 não podem ser o mesmo.");
  }

  /**
   * 2. Montagem dos drivers
   * Usamos 'as any' para permitir o campo 'driverId' que o Backend exige,
   * mas que o tipo 'CreateOccurrenceInput["drivers"]' local parece não ter.
   */
  const drivers: any[] = [
    {
      position: 1,
      driverId: args.driver1.id, // O Backend exige string, recebido undefined anteriormente
      registry:
        args.driver1.code || args.driver1.registry || args.driver1.chapa,
      name: args.driver1.name || args.driver1.nome,
      baseCode:
        args.driver1.base || args.driver1.baseCode || args.driver1.baseCodigo,
    },
  ];

  if (args.motorista2Ativo && args.driver2) {
    drivers.push({
      position: 2,
      driverId: args.driver2.id,
      registry:
        args.driver2.code || args.driver2.registry || args.driver2.chapa,
      name: args.driver2.name || args.driver2.nome,
      baseCode:
        args.driver2.base || args.driver2.baseCode || args.driver2.baseCodigo,
    });
  }

  // 3. Retorno formatado para o Back-end
  return {
    typeCode: args.typeCode || "DESCUMP_OP_PARADA_FORA",
    eventDate: args.eventDate,
    tripDate: args.tripDate,
    startTime: args.startTime,
    endTime: args.endTime || args.startTime,
    vehicleNumber: args.vehicleNumber.trim(),
    baseCode: args.driver1.base || args.driver1.baseCode,
    place: args.place?.trim() || "Não informado",
    lineLabel: args.lineLabel ?? undefined,
    tripId: args.tripId ?? undefined,
    drivers: drivers as any,

    details: args.details,

    description: args.details?.velocidade
      ? `Velocidade: ${args.details.velocidade}km/h`
      : undefined,
  };
}
