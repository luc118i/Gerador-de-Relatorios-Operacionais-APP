import { request } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL as string;

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TelemetryAlert {
  tipo: string;
  nivel: "info" | "attention" | "critical";
  descricao: string;
  trecho?: string;
  distKm?: number;
  tempoMin?: number;
  velocidadeKmh?: number;
}

export interface TelemetrySegment {
  seq: number;
  de: string;
  para: string;
  distKm: number | null;
  tempoMin: number | null;
  velocidadeKmh: number | null;
  alertas: TelemetryAlert[];
}

export interface TelemetryPoint {
  seq: number;
  ponto: string;
  entrada: string | null;
  saida: string | null;
  parada_s: number;
  matched: boolean;
  codigo: string | null;
  tipo: string | null;
}

export interface MaiorParada {
  ponto: string;
  duracaoStr: string;
}

export interface TelemetrySummary {
  veiculo: string;
  motorista: string;
  dataViagem: string;
  dataFim: string;
  totalPontos: number;
  totalKm: number;
  tempoTotalMin: number;
  velocidadeMedia: number;
  maiorParada: MaiorParada | null;
  totalAlertas: number;
  alertasCriticos: number;
  pontosNaoId: number;
}

export interface AnalyzeResult {
  id: string;
  analysis: {
    points: TelemetryPoint[];
    segments: TelemetrySegment[];
    alerts: TelemetryAlert[];
    summary: TelemetrySummary;
  };
  comparison: unknown | null;
}

export interface AnalysisSummaryRow {
  id: string;
  veiculo: string;
  motorista: string;
  data_viagem: string;
  total_pontos: number;
  total_km: number;
  tempo_total_min: number;
  velocidade_media: number;
  total_alertas: number;
  alertas_criticos: number;
  pontos_nao_id: number;
  scheme_id: string | null;
  created_at: string;
}

export interface AnalysisFullRow extends AnalysisSummaryRow {
  data_fim: string | null;
  maior_parada: MaiorParada | null;
  points: TelemetryPoint[];
  segments: TelemetrySegment[];
  alerts: TelemetryAlert[];
  comparison: unknown | null;
}

export interface ListAnalysesResponse {
  data: AnalysisSummaryRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface TelemetryPdfResponse {
  url: string;
  cached: boolean;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const telemetryApi = {
  async analyzeCsv(csvText: string, schemeId?: string): Promise<AnalyzeResult> {
    const url = new URL(`${BASE_URL}/telemetry/analyze`);
    if (schemeId) url.searchParams.set("schemeId", schemeId);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: csvText,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Erro ${res.status} ao analisar CSV`);
    }

    return res.json() as Promise<AnalyzeResult>;
  },

  listAnalyses(params: {
    veiculo?: string;
    motorista?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }): Promise<ListAnalysesResponse> {
    return request<ListAnalysesResponse>({
      method: "GET",
      path: "/telemetry/analyses",
      query: {
        veiculo:    params.veiculo,
        motorista:  params.motorista,
        dataInicio: params.dataInicio,
        dataFim:    params.dataFim,
        page:       params.page ?? 1,
        limit:      params.limit ?? 20,
      },
    });
  },

  getAnalysis(id: string): Promise<AnalysisFullRow> {
    return request<AnalysisFullRow>({
      method: "GET",
      path: `/telemetry/analyses/${id}`,
    });
  },

  getPdfUrl(id: string, force = false): Promise<TelemetryPdfResponse> {
    return request<TelemetryPdfResponse>({
      method: "GET",
      path: `/reports/telemetry/${id}/pdf`,
      query: { force: force ? "1" : undefined },
    });
  },
};
