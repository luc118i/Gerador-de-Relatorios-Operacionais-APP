import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Home, AlertTriangle, ShieldAlert, ShieldCheck, Info, ExternalLink, FileDown, Loader2, RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { Driver, DriverOccurrenceHistoryEntry, DriverRizerComparison } from "../../domain/drivers";
import { driversApi } from "../../api/drivers.api";
import { getBaseBannerImage } from "../lib/baseImages";
import {
  useDriverSituation,
  useDriverMonthlyOccurrences,
  useDriverOccurrenceHistory,
} from "../../features/occurrences/queries/drivers.queries";

interface DriverProfilePageProps {
  driver: Driver;
  onVoltar: () => void;
  // Vai direto pra tela principal, pulando a listagem de motoristas.
  // Opcional pra não quebrar quem ainda monta esse componente sem ele.
  onHome?: () => void;
}

const MES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatMonthLabel(monthISO: string): string {
  // monthISO vem como YYYY-MM-DD (primeiro dia do mês)
  const [year, month] = monthISO.split("-");
  const idx = Number(month) - 1;
  return `${MES_ABREV[idx] ?? month}/${year.slice(2)}`;
}

const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO: "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE: "Vale",
  REGISTRO: "Registro",
};

const TRATATIVA_CLASS: Record<string, string> = {
  SUSPEICAO:
    "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  ADVERTENCIA:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  VALE: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  REGISTRO:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const TYPE_COLORS = [
  "#2563eb", "#f59e0b", "#ef4444", "#10b981",
  "#8b5cf6", "#06b6d4", "#f97316", "#6b7280",
];

// Label de porcentagem DENTRO da fatia — o label padrão do Recharts (mesmo
// com labelLine={false}) fica fora do raio externo e transborda o card
// quando a fatia é pequena ou o nome do tipo é longo.
function renderPieLabel(props: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

// Legenda com truncamento — nomes de tipo podem ser bem longos (ex.:
// "DESCUMPRIMENTO OPERACIONAL / PARADA FORA DO PROGRAMADO") e o Legend
// padrão do Recharts só quebra linha, empurrando o layout. Trunca com
// reticências e mostra o nome completo no title (hover).
function TypeDistributionLegend({
  payload,
}: {
  payload?: Array<{ value?: string; color?: string }>;
}) {
  if (!payload?.length) return null;
  return (
    <ul className="flex flex-col gap-1 mt-2 px-1">
      {payload.map((entry, i) => (
        <li
          key={i}
          title={entry.value}
          className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 min-w-0"
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="truncate">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

function formatDate(dateISO: string): string {
  const [year, month, day] = dateISO.split("-");
  return `${day}/${month}/${year}`;
}

function TratativaBadge({ tratativa }: { tratativa: DriverOccurrenceHistoryEntry["tratativa"] }) {
  if (!tratativa) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Em análise
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TRATATIVA_CLASS[tratativa]}`}
    >
      {TRATATIVA_LABEL[tratativa]}
    </span>
  );
}

const SITUACAO_STYLE: Record<
  "REGULAR" | "ATENCAO" | "CRITICO",
  { label: string; className: string; Icon: typeof ShieldCheck }
> = {
  REGULAR: {
    label: "REGULAR",
    className:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900",
    Icon: ShieldCheck,
  },
  ATENCAO: {
    label: "ATENÇÃO",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
    Icon: AlertTriangle,
  },
  CRITICO: {
    label: "CRÍTICO",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
    Icon: ShieldAlert,
  },
};

export function DriverProfilePage({ driver, onVoltar, onHome }: DriverProfilePageProps) {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isComparingRizer, setIsComparingRizer] = useState(false);
  const [rizerComparison, setRizerComparison] = useState<DriverRizerComparison | null>(null);
  const [rizerError, setRizerError] = useState<string | null>(null);
  const situationQuery = useDriverSituation(driver.id);
  // occurrences tem retenção de 90 dias (purge mensal, ver
  // purge_occurrences_last_month no banco) — 3 meses é o máximo que a fonte
  // consegue sustentar de verdade, pedir mais só mostraria meses vazios.
  const monthlyQuery = useDriverMonthlyOccurrences(driver.id, 3);
  const historyQuery = useDriverOccurrenceHistory(driver.id);

  const situation = situationQuery.data;
  const monthly = monthlyQuery.data ?? [];
  const history = historyQuery.data ?? [];

  const chartData = monthly.map((m) => ({
    label: formatMonthLabel(m.month),
    total: m.total,
  }));

  // Breakdown de medidas por mês — os campos já vêm da API, só não eram
  // exibidos ainda. "outros" cobre Registro/Orientação (não quebrados
  // individualmente na view driver_monthly_occurrences).
  const measuresChartData = monthly.map((m) => ({
    label: formatMonthLabel(m.month),
    advertencia: m.advertencias,
    vale: m.vales,
    suspensao: m.suspensoes,
    outros: Math.max(0, m.total - m.advertencias - m.vales - m.suspensoes),
  }));

  // Distribuição por tipo de ocorrência, calculada a partir do histórico já
  // carregado — sem endpoint novo. Tipos cujo título sozinho não distingue
  // nada ("Genérico" cobre qualquer ocorrência fora das categorias
  // conhecidas) usam o occurrenceName específico da ocorrência quando
  // disponível — mesmo raciocínio já aplicado na comparação com o RIZER
  // (ver TIPO_RIZER_ALIASES/tipoAliasesOverride no backend).
  const typeDistribution = (() => {
    const counts = new Map<string, number>();
    for (const h of history) {
      const tipo = h.typeTitle ?? h.typeCode ?? "Outro";
      const key = tipo === "Genérico" && h.occurrenceName ? h.occurrenceName : tipo;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  })();

  const situacaoInfo = situation ? SITUACAO_STYLE[situation.situacao] : null;
  const bannerImage = getBaseBannerImage(driver.base);

  async function handleGerarRelatorio() {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      const blob = await driversApi.getDriverConductPdf(driver.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
      a.download = `${driver.code} - ${driver.name} - FICHA DE CONDUTA - ${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao gerar ficha de conduta.",
      );
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function handleCompareRizer() {
    if (isComparingRizer) return;
    setIsComparingRizer(true);
    setRizerError(null);
    try {
      const result = await driversApi.compareDriverWithRizer(driver.id);
      setRizerComparison(result);
    } catch (err) {
      setRizerError(
        err instanceof Error ? err.message : "Falha ao comparar com o RIZER.",
      );
    } finally {
      setIsComparingRizer(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onVoltar}
              className="cursor-pointer flex items-center gap-1 h-7 text-sm px-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            {onHome && (
              <button
                onClick={onHome}
                title="Ir para a tela principal"
                className="cursor-pointer flex items-center justify-center gap-1 h-7 w-7 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Home className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Perfil do Motorista
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCompareRizer}
              disabled={isComparingRizer}
              title="Compara a contagem de ocorrências por tipo com a listagem do RIZER (não é ocorrência-a-ocorrência)"
              className="cursor-pointer flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60"
            >
              {isComparingRizer ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Comparar com RIZER
            </button>

            <button
              onClick={handleGerarRelatorio}
              disabled={isGeneratingReport}
              className="cursor-pointer flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isGeneratingReport ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Gerar Relatório
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Cabeçalho do motorista — banner com foto da base quando disponível
            (ver src/app/lib/baseImages.ts); sem foto, cai num gradiente. */}
        <div
          className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 min-h-[128px] flex items-end bg-gradient-to-br from-blue-600 to-blue-900 bg-cover bg-center"
          style={bannerImage ? { backgroundImage: `url(${bannerImage})` } : undefined}
        >
          {bannerImage && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          )}

          {situacaoInfo && (
            <span
              className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shadow-sm ${situacaoInfo.className}`}
            >
              <situacaoInfo.Icon className="w-3.5 h-3.5" />
              {situacaoInfo.label}
            </span>
          )}

          <div className="relative p-4 sm:p-5">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
              {driver.name}
            </h2>
            <p className="text-sm mt-1 text-white/90 [text-shadow:_0_1px_2px_rgb(0_0_0_/_60%)]">
              Código <span className="font-semibold">{driver.code}</span> • Base:{" "}
              <span className="font-semibold">{driver.base ?? "-"}</span>
            </p>
          </div>
        </div>

        {situationQuery.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Falha ao carregar situação disciplinar.
          </p>
        )}

        <p className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Este perfil reflete só os últimos 90 dias — ocorrências mais antigas
          são removidas automaticamente do sistema (limpeza mensal de dados).
        </p>

        {/* Cards de indicadores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Ocorrências</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {situationQuery.isLoading ? "…" : situation?.totalOcorrencias ?? "-"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Últimos 90 dias</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {situationQuery.isLoading ? "…" : situation?.recentes90d ?? "-"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Reincidências</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {situationQuery.isLoading ? "…" : situation?.reincidencias ?? "-"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <p
              className="text-xs text-gray-500 dark:text-gray-400"
              title="100 − (peso das medidas dos últimos 90 dias × 10). Registro/Orientação 0,05 · Advertência 1,0 · Vale/Suspensão 2,0"
            >
              Índice disciplinar
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {situationQuery.isLoading ? "…" : situation ? `${situation.indice}/100` : "-"}
            </p>
          </div>
        </div>

        {/* Evolução mensal */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Evolução (últimos 3 meses)
          </h3>

          {monthlyQuery.isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando…</p>
          ) : monthlyQuery.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Falha ao carregar evolução mensal.
            </p>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sem ocorrências no período.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <ReTooltip />
                  <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Medidas por mês + Tipos de ocorrência */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Medidas por mês
            </h3>

            {monthlyQuery.isLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Carregando…</p>
            ) : monthlyQuery.isError ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                Falha ao carregar evolução mensal.
              </p>
            ) : measuresChartData.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sem ocorrências no período.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={measuresChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <ReTooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="outros" name="Registro/Outros" stackId="m" fill="#9ca3af" />
                    <Bar dataKey="advertencia" name="Advertência" stackId="m" fill="#f59e0b" />
                    <Bar dataKey="vale" name="Vale" stackId="m" fill="#3b82f6" />
                    <Bar dataKey="suspensao" name="Suspensão" stackId="m" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Tipos de Ocorrência
            </h3>

            {historyQuery.isLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Carregando…</p>
            ) : historyQuery.isError ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                Falha ao carregar histórico de ocorrências.
              </p>
            ) : typeDistribution.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhuma ocorrência registrada.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="42%"
                      outerRadius={65}
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {typeDistribution.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend content={<TypeDistributionLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Comparação com RIZER */}
        {(isComparingRizer || rizerComparison || rizerError) && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Comparação com RIZER
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Contagem por tipo, não é auditoria ocorrência-a-ocorrência.
            </p>

            {isComparingRizer ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando no RIZER (matrícula {driver.code})…
              </p>
            ) : rizerError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{rizerError}</p>
            ) : rizerComparison ? (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Termo usado na busca:{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {rizerComparison.matriculaUsada ?? "nenhum resultado"}
                  </span>{" "}
                  · Total RIZER: {rizerComparison.totalRizer} · Total nosso: {rizerComparison.totalNosso}
                </p>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-1.5 font-medium text-gray-700 dark:text-gray-300">Tipo</th>
                      <th className="text-right py-1.5 font-medium text-gray-700 dark:text-gray-300">Nosso</th>
                      <th className="text-right py-1.5 font-medium text-gray-700 dark:text-gray-300">RIZER</th>
                      <th className="text-right py-1.5 font-medium text-gray-700 dark:text-gray-300">Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rizerComparison.porTipo.map((t) => {
                      const diff = t.rizer - t.nosso;
                      const subtiposComContagem = t.subtipos?.filter((s) => s.count > 0) ?? [];
                      return (
                        <tr key={t.tipo} className="border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                          <td className="py-1.5 text-gray-900 dark:text-gray-100">
                            {t.tipo}
                            {subtiposComContagem.length > 0 && (
                              <span
                                title={`RIZER soma ${subtiposComContagem.length} variante(s) neste tipo:\n${subtiposComContagem
                                  .map((s) => `• ${s.label}: ${s.count}`)
                                  .join("\n")}`}
                                className="ml-1.5 inline-flex items-center cursor-help text-gray-400 dark:text-gray-500"
                              >
                                <Info className="w-3 h-3" />
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-right text-gray-700 dark:text-gray-300">{t.nosso}</td>
                          <td className="py-1.5 text-right text-gray-700 dark:text-gray-300">{t.rizer}</td>
                          <td
                            className={`py-1.5 text-right font-medium ${
                              diff === 0
                                ? "text-gray-400 dark:text-gray-500"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {diff === 0 ? "—" : diff > 0 ? `+${diff}` : diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : null}
          </div>
        )}

        {/* Histórico disciplinar */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 px-4 pt-4 pb-2">
            Histórico Disciplinar
          </h3>

          {historyQuery.isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 px-4 pb-4">Carregando…</p>
          ) : historyQuery.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400 px-4 pb-4">
              Falha ao carregar histórico de ocorrências.
            </p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 px-4 pb-4">
              Nenhuma ocorrência registrada.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-950 border-y border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Data
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Ocorrência
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Local
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Veículo
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {formatDate(h.eventDate)}
                    </td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-1.5">
                        <span>{h.typeTitle ?? h.typeCode ?? "-"}</span>
                        {h.driveWebViewLink && (
                          <a
                            href={h.driveWebViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir relatório no Drive"
                            className="shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {h.place || "-"}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {h.vehicleNumber || "-"}
                    </td>
                    <td className="px-4 py-2">
                      <TratativaBadge tratativa={h.tratativa} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
