export type Driver = {
  id: string;
  code: string; // matrícula
  name: string;
  base: string | null;
  phone: string | null; // WhatsApp do motorista (com ou sem DDI/DDD)
  // Log de autoria do cadastro. Preenchido pelo frontend no POST /drivers
  // (mesmo padrão do `analisadoPor` das ocorrências) — só aparece na ficha
  // quando o backend devolve os campos.
  criadoPor?: string | null; // nome de exibição de quem cadastrou
  criadoPorId?: string | null; // auth.user.id (estável a rename de perfil)
  criadoEm?: string | null; // ISO timestamp
};

export type CreateDriverInput = {
  code: string;
  name: string;
  base?: string | null;
  phone?: string | null;
  criadoPor?: string | null;
  criadoPorId?: string | null;
};

// Estatísticas do motorista no período retido pelo banco (mês corrente).
export type DriverStats = {
  driverId: string;
  advertencia: number;
  vale: number;
  suspensao: number;
  total: number; // total de ocorrências no período (todos os tipos)
  periodLabel?: string | null; // ex.: "junho/2026"
};

// Situação disciplinar calculada (view driver_disciplinary_index no backend).
// Índice = 100 − (peso total das medidas dos últimos 90 dias × 10), piso 0.
// Pesos por tipo de medida: Registro/Orientação 0,05 · Advertência 1,0 ·
// Vale/Suspensão 2,0. Ocorrência sem medida ainda (não analisada) pesa 0.
export type DriverSituation = {
  driverId: string;
  totalOcorrencias: number;
  recentes90d: number;
  reincidencias: number;
  indice: number;
  situacao: "REGULAR" | "ATENCAO" | "CRITICO";
};

// Ponto da evolução mensal de ocorrências do motorista (view driver_monthly_occurrences).
export type DriverMonthlyOccurrence = {
  month: string; // YYYY-MM-DD (primeiro dia do mês)
  total: number;
  advertencias: number;
  vales: number;
  suspensoes: number;
};

// Item do histórico de ocorrências do motorista (seção "Histórico
// Disciplinar" do perfil). Sem "gravidade" — a tabela occurrence_types não
// tem esse campo hoje, não inventar no frontend.
export type DriverOccurrenceHistoryEntry = {
  id: string;
  eventDate: string; // YYYY-MM-DD
  typeCode: string | null;
  typeTitle: string | null;
  // Nome específico da ocorrência (texto livre, sourced dos presets do
  // RIZER). Mais descritivo que typeTitle quando o tipo é genérico (ver
  // TYPE_TITLES_TOO_GENERIC em DriverProfilePage.tsx).
  occurrenceName: string | null;
  place: string | null;
  vehicleNumber: string | null;
  tratativa: "SUSPEICAO" | "ADVERTENCIA" | "VALE" | "REGISTRO" | null;
  analisadoPor: string | null;
  // Preenchido só depois de "Enviar ao Drive" na ocorrência original.
  driveWebViewLink: string | null;
};

// Comparação por CONTAGEM de ocorrências (não ocorrência-a-ocorrência —
// o RIZER expõe data de cadastro, não data do evento, então não dá pra
// casar linha individual com confiança) contra a listagem do RIZER,
// filtrada pela matrícula do motorista.
export type DriverRizerComparison = {
  matriculaUsada: string | null;
  totalRizer: number;
  totalNosso: number;
  porTipo: Array<{
    tipo: string;
    nosso: number;
    rizer: number;
    // Só vem preenchido pros tipos onde o RIZER usa nomes mais específicos
    // que o nosso (ex.: "Excesso de Velocidade" agregando as 3 faixas do
    // RIZER) — mostra de onde veio a soma em vez de um número opaco.
    subtipos?: Array<{ label: string; count: number }>;
  }>;
};

// BI geral da tela de Motoristas (GET /dashboard/motoristas).
export type DriverDashboardSummary = {
  totals: {
    motoristas: number;
    comOcorrencia: number;
    reincidentes: number;
    criticos: number;
  };
  porBase: Array<{ base: string; total: number }>;
  // Piores motoristas por índice (menor primeiro) — ver fórmula em DriverSituation.
  ranking: Array<{
    driverId: string;
    code: string;
    name: string;
    base: string | null;
    totalOcorrencias: number;
    reincidencias: number;
    indice: number;
    situacao: "REGULAR" | "ATENCAO" | "CRITICO";
  }>;
};
