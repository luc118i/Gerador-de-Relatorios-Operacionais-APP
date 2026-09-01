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
  tripTime?: string | null; // horário de partida da viagem (HH:mm)

  tripId?: string; // opcional no backend
  lineLabel?: string | null;
  tripSentido?: string | null;
  baseCode?: string; // opcional (backend deriva se faltar)
  speedKmh?: number | null; // para tipo EXCESSO_VELOCIDADE
  occurrenceName?: string | null; // nome exato no RIZER

  // Campos do tipo GENERICO (CCO)
  reportTitle?: string | null;
  ccoOperator?: string | null;
  vehicleKm?: number | null;
  passengerCount?: number | null;
  passengerConnection?: string | null;
  relatoHtml?: string | null;
  devolutivaHtml?: string | null;
  devolutivaStatus?: string | null;
  showSectionViagem?: boolean | null;
  showSectionIdentificacao?: boolean | null;
  showSectionDados?: boolean | null;
  showSectionTripulacao?: boolean | null;
  showSectionPassageiros?: boolean | null;
  devolutivaBeforeEvidences?: boolean | null;

  drivers: OccurrenceDriverInput[];

  tratativa?: "SUSPEICAO" | "ADVERTENCIA" | "VALE" | "REGISTRO" | null;
  analisadoPor?: string | null;
  /**
   * Vínculo best-effort com o usuário logado (auth.user.id) no momento em
   * que `analisadoPor` foi definido pelo app — não confirmado por sessão no
   * backend, mas estável a rename de perfil (ao contrário do nome). Ausente
   * em ocorrências importadas via GAS. Ver ApuracaoPodium/home.tsx, que
   * priorizam isso sobre o nome pra ranking/filtro por autor.
   */
  analisadoPorUserId?: string | null;
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
  tripTime?: string | null; // horário de partida da viagem (HH:mm)
  // Viagem canônica (join por trip_id) — usada pra resolver o link do
  // esquema da linha (ver findEsquemaUrl em utils/esquemaLookup.ts).
  tripLineCode?: string | null;
  tripLineName?: string | null;
  tripDirection?: string | null;
  occurrenceName?: string | null;
  createdAt: string; // ISO
  drivers: OccurrenceDriverDTO[];
  evidenceCount: number;

  // EXCESSO_PERMANENCIA: quando a ocorrência agrupa mais de um ponto de
  // parada (motorista excedeu em N pontos na mesma viagem), startTime/
  // endTime/place acima viram um resumo (menor entrada/maior saída/"N
  // paradas") e os pontos individuais vêm aqui.
  points?: Array<{
    place: string;
    startTime: string;
    endTime: string;
    permanenciaMin?: number | null;
    permitidoMin?: number | null;
    excedenteMin?: number | null;
  }>;

  // Campos do tipo GENERICO (CCO)
  reportTitle?: string | null;
  ccoOperator?: string | null;
  vehicleKm?: number | null;
  passengerCount?: number | null;
  passengerConnection?: string | null;
  relatoHtml?: string | null;
  devolutivaHtml?: string | null;
  devolutivaStatus?: string | null;
  showSectionViagem?: boolean | null;
  showSectionIdentificacao?: boolean | null;
  showSectionDados?: boolean | null;
  showSectionTripulacao?: boolean | null;
  showSectionPassageiros?: boolean | null;
  devolutivaBeforeEvidences?: boolean | null;
  suspensao?: { dataInicio: string; dias: number } | null;
  rizerRegistered?: boolean;
  /** ID da ocorrência no RIZER (`/ocorrencias_disciplinares/{rizerId}/edit`).
   *  Gravado no fluxo de registro; pode ser null em registros antigos. */
  rizerId?: string | null;
  /** Espelho do campo "Status" do RIZER (Solucionado = tratada). Atualizado
   *  sob demanda pelo botão "Verificar no RIZER" do Centro de Relatórios. */
  solucionado?: boolean;
  /** Quando a verificação de `solucionado` rodou pela última vez (ISO). */
  solucionadoVerificadoEm?: string | null;
  advertencia?: boolean;
  faltaTratativa?: boolean;
  tratativa?: "SUSPEICAO" | "ADVERTENCIA" | "VALE" | "REGISTRO" | null;
  analisadoPor?: string | null;
  analisadoPorUserId?: string | null;
  justificativaRegistro?: string | null;
  // Preenchidos depois de "Enviar ao Drive" (ver POST /reports/occurrences/:id/drive) —
  // o backend já devolve isso, só não estava declarado aqui.
  driveFileNome?: string | null;
  driveWebViewLink?: string | null;
  // Contador de notificações via WhatsApp por motorista (posição 1/2) — ver
  // POST /occurrences/:id/whatsapp-sent.
  whatsappSentCountD1?: number;
  whatsappLastSentD1At?: string | null;
  whatsappSentCountD2?: number;
  whatsappLastSentD2At?: string | null;
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
