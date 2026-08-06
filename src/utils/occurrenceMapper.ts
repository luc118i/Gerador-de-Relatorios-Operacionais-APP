import type { Ocorrencia } from "../app/types";

type SignedEvidenceUrl = {
  id: string;
  url: string;
  caption?: string;
  linkTexto?: string;
  linkUrl?: string;
};

/** Converte o DTO retornado pela API (+ URLs assinadas de evidências) para o
 * formato `Ocorrencia` consumido pelo formulário de edição. */
export function dtoToOcorrencia(
  dto: any,
  signedUrls: SignedEvidenceUrl[] = [],
): Ocorrencia {
  return {
    id: dto.id,
    viagem: {
      id: dto.tripId ?? "",
      linha: dto.lineLabel ?? "",
      prefixo: dto.vehicleNumber ?? "",
      horario: dto.tripTime ?? "",
      codigoLinha: dto.tripLineCode ?? "",
      nomeLinha: dto.tripLineName ?? "",
      sentido: dto.tripDirection ?? "",
      origem: "",
      destino: "",
    },
    evidencias: signedUrls.map((e) => ({
      id: e.id,
      url: e.url,
      legenda: e.caption ?? "",
      linkTexto: e.linkTexto ?? "",
      linkUrl: e.linkUrl ?? "",
    })),
    motorista1: {
      id: dto.drivers?.[0]?.driverId ?? "",
      matricula: dto.drivers?.[0]?.registry ?? "",
      nome: dto.drivers?.[0]?.name ?? "",
      base: dto.drivers?.[0]?.baseCode ?? "",
    },
    motorista2: dto.drivers?.[1]
      ? {
          id: dto.drivers[1].driverId,
          matricula: dto.drivers[1].registry,
          nome: dto.drivers[1].name,
          base: dto.drivers[1].baseCode ?? "",
        }
      : undefined,
    dataEvento: dto.eventDate ?? "",
    dataViagem: dto.tripDate ?? "",
    horarioInicial: dto.startTime ?? "",
    horarioFinal: dto.endTime ?? "",
    localParada: dto.place ?? "",
    points: dto.points ?? undefined,
    typeCode: dto.typeCode ?? "",
    typeTitle: dto.typeTitle ?? "",
    speedKmh: dto.speedKmh ?? null,

    // Campos GENERICO
    reportTitle: dto.reportTitle ?? null,
    ccoOperator: dto.ccoOperator ?? null,
    vehicleKm: dto.vehicleKm ?? null,
    passengerCount: dto.passengerCount ?? null,
    passengerConnection: dto.passengerConnection ?? null,
    relatoHtml: dto.relatoHtml ?? null,
    devolutivaHtml: dto.devolutivaHtml ?? null,
    devolutivaStatus: dto.devolutivaStatus ?? null,
    showSectionViagem: dto.showSectionViagem ?? true,
    showSectionIdentificacao: dto.showSectionIdentificacao ?? true,
    showSectionDados: dto.showSectionDados ?? true,
    showSectionTripulacao: dto.showSectionTripulacao ?? true,
    showSectionPassageiros: dto.showSectionPassageiros ?? true,
    devolutivaBeforeEvidences: dto.devolutivaBeforeEvidences ?? false,

    // Análise e tratativa — precisam ser carregados senão o save (overwrite total)
    // grava null no banco e apaga os dados refletidos nos relatórios.
    occurrenceName: dto.occurrenceName ?? null,
    tratativa: dto.tratativa ?? null,
    analisadoPor: dto.analisadoPor ?? null,

    createdAt: dto.createdAt ?? "",
  };
}
