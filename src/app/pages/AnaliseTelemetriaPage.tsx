import { useState, useRef, useCallback } from "react";
import {
  ArrowLeft, BarChart2, Upload, AlertTriangle, CheckCircle,
  Loader2, FileDown, X, MapPin, Clock, Gauge, Route,
  ChevronRight, TrendingUp, Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  telemetryApi,
  type AnalyzeResult,
  type AnalysisSummaryRow,
  type AnalysisFullRow,
  type TelemetryAlert,
  type TelemetryPoint,
  type TelemetrySegment,
} from "../../api/telemetry.api";
import { useListAnalyses, useAnalysis, telemetryKeys } from "../../features/telemetry/telemetry.queries";
import { toast } from "sonner";

interface Props {
  onVoltar: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtKm(v: number)     { return `${Number(v).toFixed(1)} km`; }
function fmtSpeed(v: number)  { return `${Number(v).toFixed(0)} km/h`; }
function fmtMin(min: number)  {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}
function fmtSec(s: number) {
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60)  return r > 0 ? `${m}min ${r}s` : `${m}min`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm > 0 ? `${h}h ${mm}min` : `${h}h`;
}

function tipoLabel(tipo: string | null) {
  const m: Record<string, string> = {
    "Ponto de Controle - 12": "Controle",
    "Garagem": "Garagem", "garagem": "Garagem",
    "Rodoviária": "Rodoviária", "rodoviaria": "Rodoviária",
    "Auxiliar": "Auxiliar",
  };
  return tipo ? (m[tipo] ?? tipo) : null;
}

function tipoTagClass(tipo: string | null): string {
  if (!tipo) return "bg-gray-100 text-gray-500";
  const t = tipo.toLowerCase();
  if (t.includes("garagem"))    return "bg-slate-100 text-slate-600";
  if (t.includes("rodoviária") || t.includes("rodoviaria")) return "bg-indigo-100 text-indigo-600";
  if (t.includes("controle"))   return "bg-blue-100 text-blue-600";
  if (t.includes("auxiliar"))   return "bg-emerald-100 text-emerald-600";
  return "bg-gray-100 text-gray-500";
}

function alertNivelStyle(nivel: string): { card: string; border: string; dot: string; title: string } {
  if (nivel === "critical")  return { card: "bg-red-50",   border: "border-l-red-500",   dot: "bg-red-500",   title: "text-red-700"  };
  if (nivel === "attention") return { card: "bg-amber-50", border: "border-l-amber-400", dot: "bg-amber-400", title: "text-amber-700" };
  return                            { card: "bg-blue-50",  border: "border-l-blue-400",  dot: "bg-blue-400",  title: "text-blue-700" };
}

function alertTipoTitle(tipo: string): string {
  const m: Record<string, string> = {
    VELOCIDADE_EXCESSIVA:    "Excesso Crítico de Velocidade",
    VELOCIDADE_ALTA:         "Velocidade Elevada",
    VELOCIDADE_BAIXA:        "Velocidade Abaixo do Ideal",
    PARADA_PROIBIDA:         "Parada em Local Proibido",
    PARADA_LONGA:            "Parada Prolongada",
    LOCAL_NAO_IDENTIFICADO:  "Local Não Identificado",
  };
  return m[tipo] ?? tipo;
}

// ── Leitura de CSV com detecção de encoding ───────────────────────────────────

function readWithEncoding(file: File, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error(`Falha ao ler arquivo como ${encoding}`));
    reader.readAsText(file, encoding);
  });
}

async function readCsvText(file: File): Promise<string> {
  // Tenta UTF-8 primeiro; se houver caracteres de substituição (U+FFFD),
  // o arquivo está em Windows-1252 (padrão de sistemas brasileiros).
  const utf8 = await readWithEncoding(file, "utf-8");
  if (utf8.includes("�")) {
    return readWithEncoding(file, "windows-1252");
  }
  return utf8;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AnaliseTelemetriaPage({ onVoltar }: Props) {
  const queryClient   = useQueryClient();
  const [view, setView]             = useState<"list" | "detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [page, setPage]             = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: listData, isLoading: listLoading } = useListAnalyses({ page, limit: 15 });
  const { data: detail, isLoading: detailLoading } = useAnalysis(selectedId);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Selecione um arquivo .csv");
      return;
    }
    setUploading(true);
    try {
      const text   = await readCsvText(file);
      const result = await telemetryApi.analyzeCsv(text);
      setSelectedId(result.id);
      setView("detail");
      queryClient.invalidateQueries({ queryKey: telemetryKeys.lists() });
      toast.success("Análise concluída!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao analisar CSV");
    } finally {
      setUploading(false);
    }
  }, [queryClient]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handlePdf = async (id: string) => {
    setPdfLoading(true);
    try {
      const { url } = await telemetryApi.getPdfUrl(id);
      window.open(url, "_blank");
    } catch { toast.error("Erro ao gerar PDF"); }
    finally  { setPdfLoading(false); }
  };

  const openDetail = (id: string) => { setSelectedId(id); setView("detail"); };

  // ── Vista detalhe ─────────────────────────────────────────────────────────

  if (view === "detail") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setView("list")} className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <BarChart2 className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">Detalhe da Análise</h1>
            </div>
            {selectedId && (
              <button
                onClick={() => handlePdf(selectedId)}
                disabled={pdfLoading}
                className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Gerar PDF
              </button>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {detailLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}
          {detail && <AnalysisDetail row={detail} />}
        </main>
      </div>
    );
  }

  // ── Vista lista ───────────────────────────────────────────────────────────

  const analyses = listData?.data ?? [];
  const meta     = listData?.meta;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <button onClick={onVoltar} className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <BarChart2 className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">Análise de Viagem</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 transition-colors ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          {uploading ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-sm font-medium text-gray-600">Analisando viagem...</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Upload className="w-7 h-7 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">Arraste o CSV aqui ou clique para selecionar</p>
                <p className="text-xs text-gray-400 mt-1">Arquivo exportado do sistema de telemetria</p>
              </div>
            </>
          )}
        </div>

        {/* Histórico */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Histórico {meta ? `· ${meta.total} análises` : ""}
          </h2>

          {listLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          )}

          {!listLoading && analyses.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
              Nenhuma análise encontrada. Envie um CSV acima para começar.
            </div>
          )}

          {analyses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Veículo / Motorista</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Data</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Km</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Vel. Média</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((row, i) => (
                    <tr
                      key={row.id}
                      onClick={() => openDetail(row.id)}
                      className={`cursor-pointer border-b border-gray-50 hover:bg-blue-50/40 transition-colors ${i % 2 !== 0 ? "bg-gray-50/40" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{row.veiculo}</p>
                        <p className="text-xs text-gray-400">{row.motorista}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{row.data_viagem}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmtKm(row.total_km)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmtSpeed(row.velocidade_media)}</td>
                      <td className="px-4 py-3 text-center">
                        {row.alertas_criticos > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                            <AlertTriangle className="w-3 h-3" />{row.alertas_criticos} crítico{row.alertas_criticos > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                            <CheckCircle className="w-3 h-3" />OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">Página {meta.page} de {meta.totalPages}</span>
                  <div className="flex gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="cursor-pointer px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Anterior
                    </button>
                    <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}
                      className="cursor-pointer px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Detalhe completo ──────────────────────────────────────────────────────────

function AnalysisDetail({ row }: { row: AnalysisFullRow }) {
  const alerts   = (row.alerts   ?? []) as TelemetryAlert[];
  const segments = (row.segments ?? []) as TelemetrySegment[];
  const points   = (row.points   ?? []) as TelemetryPoint[];

  const criticos  = alerts.filter(a => a.nivel === "critical");
  const atencao   = alerts.filter(a => a.nivel === "attention");
  const info      = alerts.filter(a => a.nivel === "info");
  const sortedAlerts = [...criticos, ...atencao, ...info];

  const naoId     = points.filter(p => !p.matched).length;
  const maiorParada = row.maior_parada;

  return (
    <div className="space-y-8">

      {/* ── 6 cards de resumo ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Planejados"
          value={String(segments.length + 1)}
          icon={<Route className="w-4 h-4" />}
        />
        <MetricCard
          label="Realizados"
          value={String(points.filter(p => p.matched).length)}
          icon={<CheckCircle className="w-4 h-4" />}
          color="green"
        />
        <MetricCard
          label="Não identificados"
          value={String(naoId)}
          icon={<MapPin className="w-4 h-4" />}
          color={naoId > 0 ? "red" : "default"}
        />
        <MetricCard
          label="Km Total"
          value={fmtKm(row.total_km)}
          icon={<TrendingUp className="w-4 h-4" />}
          color="blue"
        />
        <MetricCard
          label="Tempo Viagem"
          value={fmtMin(row.tempo_total_min)}
          icon={<Clock className="w-4 h-4" />}
        />
        <MetricCard
          label="Maior Parada"
          value={maiorParada ? maiorParada.duracaoStr : "—"}
          sub={maiorParada?.ponto}
          icon={<Gauge className="w-4 h-4" />}
        />
      </div>

      {/* ── Info da viagem ── */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex flex-wrap gap-x-8 gap-y-3">
        <InfoItem label="Veículo"   value={row.veiculo} />
        <InfoItem label="Motorista" value={row.motorista} />
        <InfoItem label="Data"      value={row.data_viagem} />
        <InfoItem label="Vel. Média" value={fmtSpeed(row.velocidade_media)} />
        <InfoItem label="Alertas"   value={`${row.total_alertas} (${criticos.length} críticos)`} />
      </div>

      {/* ── Alertas ── */}
      {sortedAlerts.length > 0 && (
        <section>
          <SectionTitle>Alertas Operacionais <Count n={sortedAlerts.length} /></SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedAlerts.map((a, i) => <AlertCard key={i} alert={a} />)}
          </div>
        </section>
      )}

      {/* ── Tabela de eventos ── */}
      <section>
        <SectionTitle>Eventos da Viagem <Count n={points.length} /></SectionTitle>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <Th w="w-8">#</Th>
                  <Th>Ponto</Th>
                  <Th>Tipo</Th>
                  <Th>Status</Th>
                  <Th align="right">Entrada</Th>
                  <Th align="right">Saída</Th>
                  <Th align="right">Parada</Th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => <EventRow key={i} point={p} i={i} alerts={alerts} />)}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Trechos ── */}
      {segments.length > 0 && (
        <section>
          <SectionTitle>Trechos <Count n={segments.length} /></SectionTitle>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <Th w="w-8">#</Th>
                    <Th>De</Th>
                    <Th>Para</Th>
                    <Th align="right">Dist.</Th>
                    <Th align="right">Tempo</Th>
                    <Th align="right">Vel. Média</Th>
                    <Th align="center">Alertas</Th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((s, i) => (
                    <tr key={i} className={`border-b border-gray-50 ${i % 2 !== 0 ? "bg-gray-50/40" : ""}`}>
                      <Td className="text-gray-300 text-xs text-center">{i + 1}</Td>
                      <Td>{s.de}</Td>
                      <Td>{s.para}</Td>
                      <Td align="right">{s.distKm != null ? fmtKm(s.distKm) : "—"}</Td>
                      <Td align="right">{s.tempoMin != null ? fmtMin(s.tempoMin) : "—"}</Td>
                      <Td align="right">
                        <span className={
                          s.velocidadeKmh != null && s.velocidadeKmh > 100 ? "text-red-600 font-semibold" :
                          s.velocidadeKmh != null && s.velocidadeKmh > 90  ? "text-amber-600 font-semibold" : ""
                        }>
                          {s.velocidadeKmh != null ? fmtSpeed(s.velocidadeKmh) : "—"}
                        </span>
                      </Td>
                      <Td align="center">
                        {s.alertas.length > 0
                          ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">{s.alertas.length}</span>
                          : <span className="text-gray-200">—</span>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Linha de evento ───────────────────────────────────────────────────────────

function EventRow({ point: p, i, alerts }: { point: TelemetryPoint; i: number; alerts: TelemetryAlert[] }) {
  const pointAlerts = alerts.filter(a => a.trecho?.includes(p.ponto) || false);
  const hasCritical = pointAlerts.some(a => a.nivel === "critical");
  const hasWarning  = pointAlerts.some(a => a.nivel === "attention");

  const rowBg = !p.matched
    ? "opacity-60"
    : hasCritical
    ? "bg-red-50/60"
    : hasWarning
    ? "bg-amber-50/40"
    : i % 2 !== 0 ? "bg-gray-50/40" : "";

  const label = tipoLabel(p.tipo);
  const tagClass = tipoTagClass(p.tipo);

  return (
    <tr className={`border-b border-gray-50 ${rowBg}`}>
      <Td className="text-gray-300 text-xs text-center">{p.seq}</Td>
      <Td>
        <span className="font-medium text-gray-800 truncate max-w-[200px] block">{p.ponto}</span>
      </Td>
      <Td>
        {label
          ? <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${tagClass}`}>{label}</span>
          : <span className="text-gray-300">—</span>}
      </Td>
      <Td>
        {!p.matched ? (
          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">N/Id.</span>
        ) : hasCritical ? (
          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-600">Crítico</span>
        ) : hasWarning ? (
          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-600">Atenção</span>
        ) : (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-600">
            <CheckCircle className="w-3 h-3" />OK
          </span>
        )}
      </Td>
      <Td align="right" className="font-mono text-xs text-gray-400">{p.entrada ?? "—"}</Td>
      <Td align="right" className="font-mono text-xs text-gray-400">{p.saida ?? "—"}</Td>
      <Td align="right" className="text-xs">
        {p.parada_s > 0
          ? <span className={p.parada_s > 1800 ? "text-red-600 font-semibold" : p.parada_s > 600 ? "text-amber-600" : "text-gray-500"}>
              {fmtSec(p.parada_s)}
            </span>
          : <span className="text-gray-300">—</span>}
      </Td>
    </tr>
  );
}

// ── Card de alerta ────────────────────────────────────────────────────────────

function AlertCard({ alert: a }: { alert: TelemetryAlert }) {
  const s = alertNivelStyle(a.nivel);
  return (
    <div className={`rounded-xl border border-l-4 ${s.card} ${s.border} border-gray-100 p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${s.title}`}>{alertTipoTitle(a.tipo)}</p>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{a.descricao}</p>
          <div className="flex flex-wrap gap-3 mt-2">
            {a.trecho       && <CtxItem label="Trecho"     value={a.trecho} />}
            {a.distKm       != null && <CtxItem label="Dist."   value={fmtKm(a.distKm)} />}
            {a.velocidadeKmh != null && <CtxItem label="Vel."   value={fmtSpeed(a.velocidadeKmh)} />}
            {a.tempoMin      != null && <CtxItem label="Tempo"  value={fmtMin(a.tempoMin)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Micro-componentes ─────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon, color = "default" }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color?: "default" | "green" | "red" | "blue";
}) {
  const colorMap = {
    default: { card: "bg-white border-gray-100", val: "text-gray-800", icon: "text-gray-400" },
    green:   { card: "bg-green-50 border-green-100", val: "text-green-700", icon: "text-green-400" },
    red:     { card: "bg-red-50 border-red-100",   val: "text-red-700",   icon: "text-red-400"   },
    blue:    { card: "bg-blue-50 border-blue-100", val: "text-blue-700",  icon: "text-blue-400"  },
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${c.card}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${c.icon}`}>
        {icon}{label}
      </div>
      <p className={`text-2xl font-bold leading-none ${c.val}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{children}</h2>;
}

function Count({ n }: { n: number }) {
  return <span className="font-normal normal-case tracking-normal text-gray-300">· {n}</span>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] text-gray-400 uppercase tracking-wide block">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function CtxItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[10px] text-gray-500">
      <span className="text-gray-400">{label} </span>{value}
    </span>
  );
}

function Th({ children, align, w }: { children?: React.ReactNode; align?: "right" | "center"; w?: string }) {
  return (
    <th className={`px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide text-${align ?? "left"} ${w ?? ""}`}>
      {children}
    </th>
  );
}

function Td({ children, className, align }: { children?: React.ReactNode; className?: string; align?: "right" | "center" }) {
  return <td className={`px-4 py-2.5 text-${align ?? "left"} text-sm ${className ?? ""}`}>{children}</td>;
}
