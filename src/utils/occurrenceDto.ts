// Conversão de OccurrenceDTO (formato da API/lista) para Ocorrencia mínima
// (formato usado pelos geradores de texto em relatorio.ts/whatsapp.ts).
// Extraído de OccurrenceCardDTO — reaproveitado também pelo modal de envio
// de tratativas em lote (BatchTratativaModal), que precisa do mesmo texto
// de relatório individual usado no botão "Copiar Relatório Individual".
import type { OccurrenceDTO } from "../domain/occurrences";
import type { Ocorrencia } from "../app/types";

export function dtoToMinimalOcorrencia(occ: OccurrenceDTO): Ocorrencia {
  const d1 = occ.drivers?.find((d) => d.position === 1);
  const d2 = occ.drivers?.find((d) => d.position === 2);
  return {
    id: occ.id,
    typeCode: occ.typeCode,
    typeTitle: occ.typeTitle,
    viagem: {
      id: "",
      linha: occ.lineLabel ?? "",
      prefixo: occ.vehicleNumber ?? "",
      horario: occ.tripTime ?? "",
      codigoLinha: occ.tripLineCode ?? "",
      nomeLinha: occ.tripLineName ?? "",
      sentido: occ.tripDirection ?? "",
    },
    motorista1: {
      id: d1?.driverId ?? "",
      matricula: d1?.registry ?? "",
      nome: d1?.name ?? "",
      base: d1?.baseCode ?? "",
    },
    motorista2: d2
      ? {
          id: d2.driverId ?? "",
          matricula: d2.registry ?? "",
          nome: d2.name ?? "",
          base: d2.baseCode ?? "",
        }
      : undefined,
    dataEvento: occ.eventDate,
    dataViagem: occ.tripDate,
    horarioInicial: occ.startTime,
    horarioFinal: occ.endTime,
    localParada: occ.place ?? "",
    points: occ.points,
    speedKmh: occ.speedKmh ?? null,
    evidencias: [],
    createdAt: occ.createdAt,
    reportTitle: occ.reportTitle ?? null,
    ccoOperator: occ.ccoOperator ?? null,
    vehicleKm: occ.vehicleKm ?? null,
    passengerCount: occ.passengerCount ?? null,
    passengerConnection: occ.passengerConnection ?? null,
    relatoHtml: occ.relatoHtml ?? null,
    devolutivaHtml: occ.devolutivaHtml ?? null,
    devolutivaStatus: occ.devolutivaStatus ?? null,
  };
}
