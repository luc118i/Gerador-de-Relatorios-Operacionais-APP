import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, FormEvent } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  Car,
  Users,
  Clock,
  TrendingDown,
  Zap,
  MapPin,
  BarChart2,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  MessageCircle,
  Printer,
  Gavel,
  Loader2,
  UserCheck,
  ClipboardCheck,
  SlidersHorizontal,
  CloudUpload,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { DrivePickerModal } from "./occurrences/preview/components/DrivePickerModal";
import { useDriveFolder, type DriveFolderConfig } from "../../hooks/useDriveFolder";
import { reportsDriveApi } from "../../api/reportsDrive.api";
import { registerDisciplinaryOccurrence } from "../../api/automation.api";
import { useAdminAuth } from "../context/AdminAuthContext";
import { AdminLoginModal } from "../components/AdminLoginModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getOccurrencesByDay, getDailyReportPdf, occurrencesApi } from "../../api/occurrences.api";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { buildDailyReport } from "../utils/relatorio-diario";

// ── Score / status ────────────────────────────────────────────────────────────

function calcScore(occurrences: OccurrenceDTO[]): number {
  if (occurrences.length === 0) return 10;
  let score = 10;
  for (const o of occurrences) {
    // Penalidades calibradas: até 5-6 ocorrências = ainda zona verde
    score -= o.typeCode === "EXCESSO_VELOCIDADE" ? 0.8 : 0.4;
  }
  return Math.max(0, Math.round(score * 10) / 10);
}

type ScoreStatus = {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  hex: string;
};

function getScoreStatus(score: number): ScoreStatus {
  if (score >= 8)
    return {
      label: "Operação dentro do padrão",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      hex: "#10b981",
    };
  if (score >= 6)
    return {
      label: "Atenção necessária",
      color: "text-yellow-700",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      dot: "bg-yellow-500",
      hex: "#f59e0b",
    };
  if (score >= 4)
    return {
      label: "Situação preocupante",
      color: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-orange-200",
      dot: "bg-orange-500",
      hex: "#f97316",
    };
  return {
    label: "Dia crítico",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    hex: "#ef4444",
  };
}

// ── Severity ──────────────────────────────────────────────────────────────────

type Severity = "high" | "medium" | "low";

function getSeverity(o: OccurrenceDTO): Severity {
  if (o.typeCode === "EXCESSO_VELOCIDADE")
    return (o.speedKmh ?? 0) > 100 ? "high" : "medium";
  return "low";
}

const SEV_BAR: Record<Severity, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-blue-400",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = [
    "Jan","Fev","Mar","Abr","Mai","Jun",
    "Jul","Ago","Set","Out","Nov","Dez",
  ];
  return `${d} ${months[parseInt(m ?? "1", 10) - 1]} ${y}`;
}

function abbrevType(code: string, title: string): string {
  const map: Record<string, string> = {
    EXCESSO_VELOCIDADE: "Excesso vel.",
    DESCUMP_OP_PARADA_FORA: "Parada irreg.",
    GENERICO: "Genérico",
  };
  return map[code] ?? (title.length > 18 ? title.slice(0, 16) + "…" : title);
}

function firstName(name: string): string {
  const parts = name.trim().split(" ");
  return parts.length <= 2 ? name : `${parts[0]} ${parts[1]}`;
}

// ── Main component ────────────────────────────────────────────────────────────

interface RelatorioDiarioProps {
  onVoltar: () => void;
}

export function RelatorioDiario({ onVoltar }: RelatorioDiarioProps) {
  const { isAdmin } = useAdminAuth();
  const [dataSelecionada, setDataSelecionada] = useState(todayISO);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<OccurrenceDTO[]>([]);
  const [copiado, setCopiado] = useState<false | "padrao" | "whatsapp">(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [mode, setMode] = useState<"gestor" | "operacional">("gestor");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterBase, setFilterBase] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [apuracaoSaving, setApuracaoSaving] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [reportExcludedCodes, setReportExcludedCodes] = useState<Set<string>>(new Set());
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [sendingToDrive, setSendingToDrive] = useState(false);
  const [driveSent, setDriveSent] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  const { config: driveConfig, save: saveDriveConfig } = useDriveFolder();
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const copyMenuRef    = useRef<HTMLDivElement>(null);

  // Fecha menu de cópia ao clicar FORA do container (não interfere com os botões internos)
  useEffect(() => {
    if (!showCopyMenu) return;
    function handleOutside(e: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showCopyMenu]);

  // Fecha painel de filtro de relatório ao clicar fora
  useEffect(() => {
    if (!showFilterPanel) return;
    function handleOutside(e: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showFilterPanel]);

  // Lembrete diário às 17h em dias úteis
  useEffect(() => {
    function check() {
      const now = new Date();
      const dow = now.getDay();
      if (dow === 0 || dow === 6) return; // fim de semana
      if (now.getHours() < 17) return;   // antes das 17h
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const confirmed = localStorage.getItem("kandango_reminder_confirmed");
      if (confirmed !== today) setShowReminder(true);
    }
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErrorMsg(null);
    getOccurrencesByDay(dataSelecionada)
      .then((data) => { if (alive) setOccurrences(data); })
      .catch((e) => { if (alive) { setOccurrences([]); setErrorMsg(e?.message ?? "Falha ao carregar"); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [dataSelecionada]);

  const typeCodesInDay = useMemo(() => {
    const seen = new Map<string, string>();
    for (const o of occurrences) {
      if (!seen.has(o.typeCode)) seen.set(o.typeCode, o.typeTitle);
    }
    return [...seen.entries()].map(([code, title]) => ({ code, title }));
  }, [occurrences]);

  const reportOccurrences = useMemo(
    () =>
      reportExcludedCodes.size === 0
        ? occurrences
        : occurrences.filter((o) => !reportExcludedCodes.has(o.typeCode)),
    [occurrences, reportExcludedCodes],
  );

  const report = useMemo(() => buildDailyReport(reportOccurrences), [reportOccurrences]);

  const filtered = useMemo(
    () =>
      occurrences.filter((o) => {
        if (filterType && o.typeCode !== filterType) return false;
        if (filterBase && o.baseCode !== filterBase) return false;
        return true;
      }),
    [occurrences, filterType, filterBase],
  );

  const stats = useMemo(() => {
    const driversSet = new Set<string>();
    const vehiclesSet = new Set<string>();
    const basesMap = new Map<string, number>();
    const typesMap = new Map<string, { title: string; count: number }>();
    const byHour = Array.from({ length: 24 }, (_, i) => ({
      hour: String(i).padStart(2, "0") + "h",
      count: 0,
    }));

    for (const o of occurrences) {
      vehiclesSet.add(o.vehicleNumber);
      for (const d of o.drivers) driversSet.add(d.driverId);
      const base = o.baseCode || "—";
      basesMap.set(base, (basesMap.get(base) ?? 0) + 1);
      const prev = typesMap.get(o.typeCode) ?? { title: o.typeTitle, count: 0 };
      typesMap.set(o.typeCode, { ...prev, count: prev.count + 1 });
      const hour = parseInt(o.startTime.split(":")[0] ?? "0", 10);
      if (!isNaN(hour) && byHour[hour]) byHour[hour]!.count++;
    }

    const topTypeEntry = [...typesMap.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    const topBase = [...basesMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const driverCounts = new Map<string, { name: string; count: number; base: string }>();
    for (const o of occurrences) {
      const d = o.drivers[0];
      if (!d) continue;
      const prev = driverCounts.get(d.driverId) ?? { name: d.name, count: 0, base: d.baseCode };
      driverCounts.set(d.driverId, { ...prev, count: prev.count + 1 });
    }
    const topDriver = [...driverCounts.values()].sort((a, b) => b.count - a.count)[0];
    const driverRanking = [...driverCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    const byType = [...typesMap.entries()].map(([code, { title, count }]) => ({
      name: abbrevType(code, title),
      value: count,
    }));

    return {
      totalOcc: occurrences.length,
      totalDrivers: driversSet.size,
      totalVehicles: vehiclesSet.size,
      totalEvidences: occurrences.reduce((s, o) => s + (o.evidenceCount ?? 0), 0),
      windowStart: report.totals.windowStart,
      windowEnd: report.totals.windowEnd,
      topTypeEntry,
      topBase,
      topDriver,
      driverRanking,
      byHour,
      byType,
      allBases: [...basesMap.keys()],
      allTypeCodes: [...typesMap.keys()],
    };
  }, [occurrences, report.totals]);

  const score = useMemo(() => calcScore(occurrences), [occurrences]);
  const scoreStatus = getScoreStatus(score);
  const canActions = occurrences.length > 0 && !loading;
  const displayDate = formatDateDisplay(dataSelecionada);

  function changeDay(offset: number) {
    const [y, m, d] = dataSelecionada.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + offset);
    setDataSelecionada(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    );
  }

  async function handleCopiar(formato: "padrao" | "whatsapp") {
    if (!canActions) return;
    setShowCopyMenu(false);
    const text = formato === "whatsapp" ? report.textForWhatsApp : report.textForCopy;
    await navigator.clipboard.writeText(text);
    setCopiado(formato);
    setTimeout(() => setCopiado(false), 2000);
  }

  function handleExportar() {
    if (!canActions) return;
    const blob = new Blob([report.textForCopy], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-diario-${dataSelecionada}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleExportarPDF() {
    if (!canActions || exportingPdf) return;
    setExportingPdf(true);
    try {
      const blob = await getDailyReportPdf(dataSelecionada);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const [yy, mm, dd] = dataSelecionada.split("-");
      a.download = `${dd}.${mm}.${yy} - RELATORIO DIARIO MONITORAMENTO.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Falha ao gerar PDF: ${e?.message ?? "erro desconhecido"}`);
    } finally {
      setExportingPdf(false);
    }
  }

  function handleConfirmReminder() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    localStorage.setItem("kandango_reminder_confirmed", today);
    setShowReminder(false);
  }

  async function handleSendToDrive({
    config,
    accessToken,
    saveAsDefault,
  }: {
    config: DriveFolderConfig;
    accessToken: string;
    saveAsDefault: boolean;
  }) {
    if (saveAsDefault) saveDriveConfig(config);
    setShowDrivePicker(false);
    setSendingToDrive(true);
    setDriveSent(false);
    try {
      await reportsDriveApi.sendDailyReportToDrive({
        date: dataSelecionada,
        accessToken,
        folderId: config.folderId,
      });
      setDriveSent(true);
      setTimeout(() => setDriveSent(false), 4000);
    } catch (e: any) {
      alert(`Falha ao enviar para o Drive: ${e?.message ?? "erro desconhecido"}`);
    } finally {
      setSendingToDrive(false);
    }
  }

  if (!isAdmin) return <AdminGate onVoltar={onVoltar} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            {/* Esquerda: voltar + título + nav data */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onVoltar}
                className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-gray-500" />
              </button>
              <div className="hidden sm:block min-w-0">
                <h1 className="text-sm font-semibold text-gray-900 leading-none">
                  Relatório Diário
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">Consolidado operacional</p>
              </div>

              {/* Navegação de datas */}
              <div className="flex items-center gap-1 sm:ml-3 shrink-0">
                <button
                  onClick={() => changeDay(-1)}
                  className="cursor-pointer p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-gray-700 px-2 whitespace-nowrap">
                  {displayDate}
                </span>
                <button
                  onClick={() => changeDay(1)}
                  className="cursor-pointer p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Status badge */}
              {!loading && occurrences.length > 0 && (
                <span
                  className={`hidden md:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${scoreStatus.bg} ${scoreStatus.border} ${scoreStatus.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${scoreStatus.dot}`} />
                  {scoreStatus.label}
                </span>
              )}
            </div>

            {/* Direita: modo + ações */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Toggle modo */}
              <div className="hidden sm:flex bg-gray-100 rounded-lg p-0.5 text-xs">
                {(["gestor", "operacional"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`cursor-pointer px-2.5 py-1.5 rounded-md font-medium capitalize transition-all ${
                      mode === m
                        ? "bg-white shadow-sm text-gray-800"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Botão copiar com dropdown */}
              <div ref={copyMenuRef} className="relative">
                <div
                  className={`flex items-center rounded-lg border overflow-hidden transition-colors ${
                    canActions
                      ? "border-gray-200 bg-white"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <button
                    onClick={() => canActions && handleCopiar("padrao")}
                    disabled={!canActions}
                    className={`cursor-pointer h-8 px-3 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      canActions ? "hover:bg-gray-50 text-gray-700" : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {copiado ? (
                      <><Check className="w-3.5 h-3.5 text-emerald-500" />{copiado === "whatsapp" ? "WhatsApp!" : "Copiado!"}</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" />Copiar</>
                    )}
                  </button>
                  <button
                    onClick={() => canActions && setShowCopyMenu((v) => !v)}
                    disabled={!canActions}
                    className={`cursor-pointer h-8 px-1.5 border-l text-xs flex items-center transition-colors ${
                      canActions
                        ? "border-gray-200 hover:bg-gray-50 text-gray-500"
                        : "border-gray-100 text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showCopyMenu && canActions && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                    <button
                      onClick={() => handleCopiar("padrao")}
                      className="cursor-pointer w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      Formato padrão
                    </button>
                    <button
                      onClick={() => handleCopiar("whatsapp")}
                      className="cursor-pointer w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                      Formato WhatsApp
                    </button>
                  </div>
                )}
              </div>

              {/* PDF */}
              <button
                onClick={handleExportarPDF}
                disabled={!canActions || exportingPdf || apuracaoSaving}
                className={`cursor-pointer h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  canActions && !exportingPdf && !apuracaoSaving
                    ? "bg-gray-800 text-white hover:bg-gray-900"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                title={apuracaoSaving ? "Aguarde — salvando apurações..." : "Baixar relatório diário em PDF"}
              >
                {exportingPdf || apuracaoSaving ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="12" />
                  </svg>
                ) : (
                  <Printer className="w-3.5 h-3.5" />
                )}
                {exportingPdf ? "Gerando..." : apuracaoSaving ? "Salvando..." : "PDF"}
              </button>

              {/* Filtro de tipos no relatório */}
              <div ref={filterPanelRef} className="relative">
                <button
                  onClick={() => canActions && setShowFilterPanel((v) => !v)}
                  disabled={!canActions}
                  className={`cursor-pointer h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                    canActions
                      ? showFilterPanel
                        ? "border-gray-300 bg-gray-100 text-gray-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
                  title="Filtrar tipos de ocorrência no relatório"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {reportExcludedCodes.size > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  )}
                </button>

                {showFilterPanel && canActions && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2 min-w-[220px]">
                    <div className="px-3 pb-2 border-b border-gray-100 mb-1">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        Tipos no relatório
                      </p>
                    </div>
                    {typeCodesInDay.map(({ code, title }) => {
                      const included = !reportExcludedCodes.has(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() =>
                            setReportExcludedCodes((prev) => {
                              const next = new Set(prev);
                              if (included) next.add(code);
                              else next.delete(code);
                              return next;
                            })
                          }
                          className="w-full px-3 py-2 flex items-center gap-2.5 text-xs hover:bg-gray-50 transition-colors text-left"
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              included
                                ? "bg-blue-600 border-blue-600"
                                : "bg-white border-gray-300"
                            }`}
                          >
                            {included && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-gray-700 font-medium flex-1 truncate">
                            {abbrevType(code, title)}
                          </span>
                          <span className="text-gray-400 text-[10px] tabular-nums">
                            {occurrences.filter((o) => o.typeCode === code).length}
                          </span>
                        </button>
                      );
                    })}
                    {reportExcludedCodes.size > 0 && (
                      <div className="px-3 pt-2 border-t border-gray-100 mt-1">
                        <button
                          type="button"
                          onClick={() => setReportExcludedCodes(new Set())}
                          className="cursor-pointer text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Incluir todos
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drive */}
              <button
                onClick={() => canActions && !driveSent && setShowDrivePicker(true)}
                disabled={!canActions || sendingToDrive || apuracaoSaving}
                className={`cursor-pointer h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  !canActions || apuracaoSaving
                    ? "bg-blue-100 text-blue-300 cursor-not-allowed"
                    : sendingToDrive
                      ? "bg-blue-500 text-white cursor-not-allowed"
                      : driveSent
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                title={driveSent ? "Relatório enviado ao Drive" : "Enviar relatório diário para o Google Drive"}
              >
                {sendingToDrive ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="12" />
                  </svg>
                ) : driveSent ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                {sendingToDrive ? "Enviando..." : driveSent ? "Enviado!" : "Drive"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Carregando...</span>
            </div>
          </div>
        )}

        {/* Erro */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Vazio */}
        {!loading && !errorMsg && occurrences.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-medium text-gray-600">Nenhuma ocorrência</p>
            <p className="text-sm text-gray-400 mt-1">Sem registros para {displayDate}</p>
          </div>
        )}

        {!loading && !errorMsg && occurrences.length > 0 && (
          <>
            {/* ── Bloco 1: Score + Métricas ────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* Score */}
              <div
                className={`col-span-2 sm:col-span-1 lg:col-span-1 rounded-xl border p-4 flex flex-col items-center justify-center gap-1.5 ${scoreStatus.bg} ${scoreStatus.border}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Nota do dia
                </div>
                <div
                  className="text-5xl font-black tabular-nums leading-none"
                  style={{ color: scoreStatus.hex }}
                >
                  {score.toFixed(1)}
                </div>
                <div className={`text-[11px] font-semibold text-center leading-tight ${scoreStatus.color}`}>
                  {scoreStatus.label}
                </div>
              </div>

              {/* Ocorrências */}
              <MetricCard
                icon={<AlertTriangle className="w-4 h-4" />}
                label="Ocorrências"
                value={stats.totalOcc}
                colorClass="text-orange-600"
                bgClass="bg-orange-50"
              />
              {/* Veículos */}
              <MetricCard
                icon={<Car className="w-4 h-4" />}
                label="Veículos"
                value={stats.totalVehicles}
                colorClass="text-blue-600"
                bgClass="bg-blue-50"
              />
              {/* Motoristas */}
              <MetricCard
                icon={<Users className="w-4 h-4" />}
                label="Motoristas"
                value={stats.totalDrivers}
                colorClass="text-violet-600"
                bgClass="bg-violet-50"
              />
              {/* Janela */}
              <MetricCard
                icon={<Clock className="w-4 h-4" />}
                label="Janela de tempo"
                value={
                  stats.windowStart && stats.windowEnd
                    ? `${stats.windowStart} — ${stats.windowEnd}`
                    : "—"
                }
                colorClass="text-gray-600"
                bgClass="bg-gray-50"
                small
              />
            </div>

            {/* ── Bloco 2: Gráficos (modo gestor) ──────────────────────── */}
            {mode === "gestor" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Timeline por hora */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    Ocorrências por horário
                  </h3>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart
                      data={stats.byHour}
                      margin={{ top: 0, right: 4, bottom: 0, left: -28 }}
                    >
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 9, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        interval={3}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <ReTooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                        }}
                        cursor={{ fill: "#f9fafb" }}
                        formatter={(v: number) => [v, "Ocorrências"]}
                      />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                        {stats.byHour.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.count > 0 ? "#3b82f6" : "#e5e7eb"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Por tipo — barras horizontais */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    Por tipo
                  </h3>
                  <div className="space-y-3">
                    {stats.byType
                      .sort((a, b) => b.value - a.value)
                      .map(({ name, value }) => (
                        <div key={name}>
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="text-gray-600 truncate max-w-[130px]">
                              {name}
                            </span>
                            <span className="font-semibold text-gray-700 tabular-nums ml-2">
                              {value}
                              <span className="text-gray-400 font-normal ml-1">
                                ({Math.round((value / stats.totalOcc) * 100)}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${(value / stats.totalOcc) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Bloco 3: Insights + Ranking (modo gestor) ────────────── */}
            {mode === "gestor" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Insights automáticos */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    Insights automáticos
                  </h3>
                  <div className="space-y-3">
                    {stats.topTypeEntry && (
                      <InsightRow
                        icon={<AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                        label="Maior problema"
                        value={`${abbrevType(stats.topTypeEntry[0], stats.topTypeEntry[1].title)} — ${Math.round((stats.topTypeEntry[1].count / stats.totalOcc) * 100)}% das ocorrências`}
                      />
                    )}
                    {stats.topDriver ? (
                      <InsightRow
                        icon={<Users className="w-3.5 h-3.5 text-violet-500" />}
                        label="Motorista em destaque"
                        value={`${stats.topDriver.name} (${stats.topDriver.count} ocorrência${stats.topDriver.count > 1 ? "s" : ""})`}
                      />
                    ) : null}
                    {stats.topBase && (
                      <InsightRow
                        icon={<MapPin className="w-3.5 h-3.5 text-blue-500" />}
                        label="Base mais afetada"
                        value={`${stats.topBase[0]} — ${stats.topBase[1]} ocorrência${stats.topBase[1] > 1 ? "s" : ""}`}
                      />
                    )}
                    <InsightRow
                      icon={<BarChart2 className="w-3.5 h-3.5 text-gray-400" />}
                      label="Evidências registradas"
                      value={String(stats.totalEvidences)}
                    />
                  </div>
                </div>

                {/* Ranking de motoristas */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    Motoristas com mais ocorrências
                  </h3>
                  <DriverRanking ranking={stats.driverRanking} />
                </div>
              </div>
            )}

            {/* ── Bloco 4: Filtros ─────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <FChip
                label="Todos"
                active={filterType === null && filterBase === null}
                onClick={() => { setFilterType(null); setFilterBase(null); }}
              />
              {stats.allTypeCodes.map((tc) => {
                const entry = occurrences.find((o) => o.typeCode === tc);
                return (
                  <FChip
                    key={tc}
                    label={abbrevType(tc, entry?.typeTitle ?? tc)}
                    active={filterType === tc}
                    onClick={() => setFilterType(filterType === tc ? null : tc)}
                  />
                );
              })}
              {stats.allBases.length > 1 && (
                <>
                  <span className="w-px h-3.5 bg-gray-200 mx-0.5" />
                  {stats.allBases.map((b) => (
                    <FChip
                      key={b}
                      label={b}
                      active={filterBase === b}
                      onClick={() => setFilterBase(filterBase === b ? null : b)}
                      variant="base"
                    />
                  ))}
                </>
              )}
            </div>

            {/* ── Bloco 5: Lista de ocorrências ───────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ocorrências
                  {filtered.length !== occurrences.length && (
                    <span className="ml-2 text-gray-400 normal-case font-normal">
                      {filtered.length} de {occurrences.length}
                    </span>
                  )}
                </h3>
                <span className="text-xs text-gray-400">
                  {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    Nenhuma ocorrência para os filtros selecionados
                  </div>
                ) : (
                  filtered.map((o) => (
                    <OccurrenceRow
                      key={o.id}
                      occurrence={o}
                      expanded={expandedId === o.id}
                      onToggle={() =>
                        setExpandedId(expandedId === o.id ? null : o.id)
                      }
                    />
                  ))
                )}
              </div>
            </div>

            {/* ── Bloco 6: Apuração ───────────────────────────────────── */}
            <ApuracaoTable occurrences={occurrences} onSavingChange={setApuracaoSaving} />

            {/* ── Bloco 7: Relatório texto (colapsável) ───────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowReport((v) => !v)}
                className="cursor-pointer w-full px-5 py-3.5 flex items-center justify-between text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Relatório em texto (formato padronizado)
                </span>
                {showReport ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {showReport && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <textarea
                    value={report.textWithMarkers}
                    readOnly
                    rows={20}
                    className="mt-4 w-full px-4 py-3 font-mono text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal de lembrete às 17h */}
      {showReminder && (
        <ReminderModal onConfirm={handleConfirmReminder} />
      )}

      {/* Drive picker modal */}
      {showDrivePicker && (
        <DrivePickerModal
          currentConfig={driveConfig}
          onConfirm={handleSendToDrive}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  colorClass,
  bgClass,
  small,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  colorClass: string;
  bgClass: string;
  small?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between gap-3">
      <div
        className={`w-8 h-8 rounded-lg ${bgClass} ${colorClass} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div>
        <div
          className={`font-bold leading-none ${colorClass} ${small ? "text-sm" : "text-2xl"}`}
        >
          {value}
        </div>
        <div className="text-xs text-gray-400 mt-1">{label}</div>
      </div>
    </div>
  );
}

function InsightRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="text-sm">
        <span className="text-gray-400 text-xs">{label}: </span>
        <span className="text-gray-700 font-medium">{value}</span>
      </div>
    </div>
  );
}

function FChip({
  label,
  active,
  onClick,
  variant = "type",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: "type" | "base";
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
        active
          ? variant === "base"
            ? "bg-violet-600 border-violet-600 text-white"
            : "bg-blue-600 border-blue-600 text-white"
          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
      }`}
    >
      {label}
    </button>
  );
}

type DisciplinaryState = "idle" | "loading" | "success" | "error";


function OccurrenceRow({
  occurrence: o,
  expanded,
  onToggle,
}: {
  occurrence: OccurrenceDTO;
  expanded: boolean;
  onToggle: () => void;
}) {
  const severity = getSeverity(o);
  const driver = o.drivers[0];

  const { isAdmin } = useAdminAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [disciplinaryState, setDisciplinaryState] = useState<DisciplinaryState>(
    o.rizerRegistered ? "success" : "idle"
  );
  const [localFaltaTratativa, setLocalFaltaTratativa] = useState<boolean>(
    o.faltaTratativa ?? false
  );

  async function handleRegisterDisciplinary() {
    if (!isAdmin) { setShowAdminLogin(true); return; }
    if (disciplinaryState === "loading" || disciplinaryState === "success") return;
    setDisciplinaryState("loading");
    try {
      const res = await registerDisciplinaryOccurrence(o.id);
      setDisciplinaryState("success");
      if (res.faltaTratativa) setLocalFaltaTratativa(true);
    } catch (err: unknown) {
      setDisciplinaryState("error");
    }
  }

  const typeBadgeStyle: Record<string, string> = {
    EXCESSO_VELOCIDADE: "bg-red-100 text-red-700",
    DESCUMP_OP_PARADA_FORA: "bg-orange-100 text-orange-700",
    GENERICO: "bg-blue-100 text-blue-700",
  };

  const typeLabel: Record<string, string> = {
    EXCESSO_VELOCIDADE: "Excesso vel.",
    DESCUMP_OP_PARADA_FORA: "Parada irreg.",
    GENERICO: "Genérico",
  };

  return (
    <div className={expanded ? "bg-blue-50/30" : "hover:bg-gray-50/60"}>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-5 py-3.5 flex items-center gap-3 text-left"
      >
        {/* Barra de severidade */}
        <div className={`w-1 h-9 rounded-full shrink-0 ${SEV_BAR[severity]}`} />

        {/* Horário */}
        <div className="w-11 text-xs font-mono font-semibold text-gray-600 shrink-0">
          {o.startTime}
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800 truncate">
              {o.typeCode === "GENERICO" && o.reportTitle
                ? o.reportTitle
                : o.typeTitle}
            </span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                typeBadgeStyle[o.typeCode] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {typeLabel[o.typeCode] ?? o.typeCode}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
            <span>Prefixo {o.vehicleNumber}</span>
            {o.place && (
              <>
                <span>·</span>
                <span className="truncate max-w-[180px]">{o.place}</span>
              </>
            )}
          </div>
        </div>

        {/* Motorista */}
        {driver && (
          <div className="hidden sm:block text-right shrink-0">
            <div className="text-xs font-medium text-gray-700">
              {firstName(driver.name)}
            </div>
            <div className="text-[10px] text-gray-400">{driver.baseCode}</div>
          </div>
        )}

        {/* Evidências */}
        <div className="text-xs text-gray-400 shrink-0 tabular-nums">
          <span className="font-semibold text-gray-600">{o.evidenceCount ?? 0}</span> ev.
        </div>

        {/* Chevron */}
        <div className="text-gray-300 shrink-0">
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Detalhe expandido */}
      {expanded && (
        <div className="px-5 pb-4 ml-4">
          <div className="border-l-2 border-blue-100 pl-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-xs">
            <DetailItem label="Linha" value={o.lineLabel ?? "—"} />
            <DetailItem label="Base" value={o.baseCode ?? "—"} />
            <DetailItem label="Data evento" value={o.eventDate} />
            <DetailItem label="Data viagem" value={o.tripDate} />
            {o.typeCode === "EXCESSO_VELOCIDADE" && o.speedKmh != null && (
              <DetailItem label="Velocidade" value={`${o.speedKmh} km/h`} />
            )}
            {o.drivers.map((d) => (
              <DetailItem
                key={d.driverId}
                label={d.position === 1 ? "Motorista 1" : "Motorista 2"}
                value={`${d.name} · ${d.registry}`}
              />
            ))}
          </div>

          {/* ── Ação: Registrar Ocorrência Disciplinar ──────────────────── */}
          {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} />}
          <div className="mt-4 border-l-2 border-orange-100 pl-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => void handleRegisterDisciplinary()}
              disabled={disciplinaryState === "loading"}
              className={`cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                disciplinaryState === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default"
                  : disciplinaryState === "error"
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
              }`}
            >
              {disciplinaryState === "loading"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : disciplinaryState === "success"
                  ? <Check className="w-3.5 h-3.5" />
                  : <Gavel className="w-3.5 h-3.5" />}
              {disciplinaryState === "loading"
                ? "Registrando..."
                : disciplinaryState === "success"
                  ? "Registrado no RIZER"
                  : disciplinaryState === "error"
                    ? "Erro — Tentar novamente"
                    : "Registrar no RIZER"}
            </button>
            {localFaltaTratativa && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3 h-3" />
                Falta a tratativa
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-gray-400 mb-0.5">{label}</div>
      <div className="font-medium text-gray-700 truncate">{value}</div>
    </div>
  );
}

// ── Apuração ──────────────────────────────────────────────────────────────────

type TratativaKey = "SUSPEICAO" | "ADVERTENCIA" | "VALE" | "REGISTRO";

const TRATATIVA_OPTIONS: { value: TratativaKey; label: string; dot: string; badge: string }[] = [
  { value: "SUSPEICAO",   label: "Suspeição",     dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "ADVERTENCIA", label: "Advertência",   dot: "bg-amber-400",  badge: "bg-amber-50  text-amber-700  border-amber-200"  },
  { value: "VALE",        label: "Vale",          dot: "bg-red-500",    badge: "bg-red-50    text-red-700    border-red-200"    },
  { value: "REGISTRO",    label: "Só o Registro", dot: "bg-gray-400",   badge: "bg-gray-100  text-gray-600   border-gray-200"   },
];

function getTratativaOpt(v: string | null | undefined) {
  return TRATATIVA_OPTIONS.find((o) => o.value === v) ?? null;
}

// ── TratativaSelect — dropdown custom ────────────────────────────────────────

function TratativaSelect({
  value,
  onChange,
}: {
  value: TratativaKey | null;
  onChange: (val: TratativaKey | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opt = getTratativaOpt(value);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer transition-all select-none ${
          opt
            ? `${opt.badge} hover:brightness-95`
            : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt ? opt.dot : "bg-gray-300"}`} />
        {opt ? opt.label : "Sem tratativa"}
        <ChevronDown className={`w-3 h-3 opacity-40 ml-0.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Painel */}
      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[168px]">
          {/* Sem tratativa */}
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full px-3 py-2 flex items-center gap-2.5 text-xs hover:bg-gray-50 transition-colors text-left group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
            <span className="text-gray-400 font-medium flex-1">Sem tratativa</span>
            {value === null && <Check className="w-3 h-3 text-gray-400 shrink-0" />}
          </button>

          <div className="my-1 mx-2 border-t border-gray-100" />

          {TRATATIVA_OPTIONS.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => { onChange(op.value); setOpen(false); }}
              className={`w-full px-3 py-2 flex items-center gap-2.5 text-xs transition-colors text-left ${
                value === op.value ? "bg-gray-50/80" : "hover:bg-gray-50"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${op.dot}`} />
              <span className="font-medium text-gray-700 flex-1">{op.label}</span>
              {value === op.value && <Check className="w-3 h-3 text-gray-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ApuracaoRow ───────────────────────────────────────────────────────────────

function ApuracaoRow({
  occurrence: o,
  onSavingStart,
  onSavingEnd,
}: {
  occurrence: OccurrenceDTO;
  onSavingStart: () => void;
  onSavingEnd: () => void;
}) {
  const [tratativa, setTratativa]               = useState<TratativaKey | null>((o.tratativa as TratativaKey) ?? null);
  const [analista, setAnalista]                 = useState(o.analisadoPor ?? "");
  const [justificativa, setJustificativa]       = useState(o.justificativaRegistro ?? "");
  const [showJustificativa, setShowJustificativa] = useState(() => (o.justificativaRegistro ?? "").trim().length > 0);
  const [saveState, setSaveState]               = useState<"idle" | "saving" | "saved">("idle");
  const [analistaDirty, setAnalistaDirty]       = useState(false);
  const [justificativaDirty, setJustificativaDirty] = useState(false);

  const driver = o.drivers[0];
  const title  = o.typeCode === "GENERICO" && o.reportTitle ? o.reportTitle : o.typeTitle;

  async function save(t: TratativaKey | null, a: string, j: string) {
    onSavingStart();
    setSaveState("saving");
    try {
      await occurrencesApi.patchTratativa(o.id, t, a.trim() || null, j.trim() || null);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    } catch {
      setSaveState("idle");
    } finally {
      onSavingEnd();
    }
  }

  function handleAnalistaBlur() {
    if (!analistaDirty) return;
    setAnalistaDirty(false);
    void save(tratativa, analista, justificativa);
  }

  function handleJustificativaBlur() {
    if (!justificativaDirty) return;
    setJustificativaDirty(false);
    void save(tratativa, analista, justificativa);
  }

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
        {/* Prefixo */}
        <td className="px-4 py-3 align-middle text-xs font-mono font-semibold text-gray-700 whitespace-nowrap">
          {o.vehicleNumber}
        </td>

        {/* Ocorrência */}
        <td className="px-4 py-3 align-middle min-w-0">
          <div className="text-xs font-medium text-gray-800 truncate max-w-[220px]">{title}</div>
          {driver && (
            <div className="text-[11px] text-gray-400 truncate mt-0.5">{driver.name}</div>
          )}
        </td>

        {/* Base */}
        <td className="px-4 py-3 align-middle text-xs text-gray-500 whitespace-nowrap">
          {o.baseCode ?? "—"}
        </td>

        {/* Tratativa */}
        <td className="px-4 py-3 align-middle">
          <div className="flex flex-col items-start gap-1">
            <TratativaSelect
              value={tratativa}
              onChange={(val) => {
                setTratativa(val);
                if (val === null) setShowJustificativa(false);
                void save(val, analista, justificativa);
              }}
            />
            {tratativa !== null && (
              <button
                type="button"
                onClick={() => setShowJustificativa((v) => !v)}
                className={`flex items-center gap-0.5 text-[10px] transition-colors cursor-pointer ${
                  justificativa.trim()
                    ? "text-amber-600 hover:text-amber-800 font-medium"
                    : "text-gray-400 hover:text-gray-500"
                }`}
              >
                <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-150 ${showJustificativa ? "rotate-180" : ""}`} />
                Justificativa
              </button>
            )}
          </div>
        </td>

        {/* Analista */}
        <td className="px-4 py-3 align-middle">
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <UserCheck className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 pointer-events-none" />
              <input
                type="text"
                value={analista}
                placeholder="Quem apurou"
                onChange={(e) => { setAnalista(e.target.value); setAnalistaDirty(true); }}
                onBlur={handleAnalistaBlur}
                className="text-xs pl-6 pr-2 py-1.5 border border-gray-200 rounded-lg w-36 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-300 bg-white"
              />
            </div>
            {saveState === "saving" && (
              <Loader2 className="w-3 h-3 text-gray-300 animate-spin shrink-0" />
            )}
            {saveState === "saved" && (
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
            )}
          </div>
        </td>
      </tr>

      {/* Sub-linha de justificativa — recolhida por padrão */}
      {tratativa !== null && showJustificativa && (
        <tr className="border-b border-gray-50 bg-gray-50/40">
          <td />
          <td colSpan={4} className="px-4 pb-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 shrink-0">Justificativa:</span>
              <input
                type="text"
                value={justificativa}
                placeholder="Ex: falha do comercial, veículo quebrado..."
                onChange={(e) => { setJustificativa(e.target.value); setJustificativaDirty(true); }}
                onBlur={handleJustificativaBlur}
                className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 placeholder:text-gray-300 bg-white"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ApuracaoTable({
  occurrences,
  onSavingChange,
}: {
  occurrences: OccurrenceDTO[];
  onSavingChange?: (saving: boolean) => void;
}) {
  const sorted = [...occurrences].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const [savingCount, setSavingCount] = useState(0);

  useEffect(() => {
    onSavingChange?.(savingCount > 0);
  }, [savingCount, onSavingChange]);

  function handleSavingStart() { setSavingCount((c) => c + 1); }
  function handleSavingEnd()   { setSavingCount((c) => Math.max(0, c - 1)); }

  if (sorted.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-gray-400" />
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Apuração
        </h3>
        <span className="ml-auto text-xs text-gray-400">{sorted.length} ocorrência{sorted.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Prefixo</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ocorrência</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Base</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tratativa</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Quem apurou</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <ApuracaoRow
                key={o.id}
                occurrence={o}
                onSavingStart={handleSavingStart}
                onSavingEnd={handleSavingEnd}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ReminderModal ─────────────────────────────────────────────────────────────

function ReminderModal({ onConfirm }: { onConfirm: () => void }) {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, "0");
  const min  = String(now.getMinutes()).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Topo colorido */}
        <div className="bg-amber-500 px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Lembrete — {hour}h{min}</p>
            <p className="text-amber-100 text-xs mt-0.5">Encerramento do turno</p>
          </div>
        </div>

        {/* Corpo */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            Confira se todas as ocorrencias foram apuradas e envie o{" "}
            <span className="font-semibold text-gray-900">Relatorio Diario</span>{" "}
            para o Google Drive antes de encerrar o turno.
          </p>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Use o botao <span className="font-semibold">Drive</span> no topo da pagina para enviar o PDF automaticamente.
            </p>
          </div>
        </div>

        {/* Rodape */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onConfirm}
            className="cursor-pointer h-9 px-6 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AdminGate — tela de bloqueio para não-admins ──────────────────────────────

function AdminGate({ onVoltar }: { onVoltar: () => void }) {
  const { login } = useAdminAuth();
  const [pin, setPin]         = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError]     = useState(false);
  const [shake, setShake]     = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = login(pin);
    if (!ok) {
      setError(true);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    }
    // se ok === true, isAdmin vira true e o componente pai re-renderiza automaticamente
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header mínimo */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-3">
            <button
              onClick={onVoltar}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-900">Relatório Diário</span>
          </div>
        </div>
      </header>

      {/* Conteúdo centralizado */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className={`bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 border border-gray-100 ${shake ? "animate-shake" : ""}`}>
          {/* Ícone */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
              <Lock className="w-7 h-7 text-orange-500" />
            </div>
          </div>

          <h2 className="text-center text-lg font-semibold text-gray-800 mb-1">
            Acesso Restrito
          </h2>
          <p className="text-center text-sm text-gray-500 mb-6">
            O Relatório Diário é exclusivo para administradores.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(false); }}
                placeholder="Senha de acesso"
                className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm outline-none transition-colors ${
                  error
                    ? "border-red-400 bg-red-50 focus:ring-1 focus:ring-red-300"
                    : "border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPin((v) => !v)}
                className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">Senha incorreta. Tente novamente.</p>
            )}

            <button
              type="submit"
              disabled={!pin}
              className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Entrar como Admin
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.45s ease-in-out; }
      `}</style>
    </div>
  );
}

function DriverRanking({
  ranking,
}: {
  ranking: { name: string; count: number; base: string }[];
}) {
  const max = ranking[0]?.count ?? 1;

  if (ranking.length === 0)
    return <p className="text-xs text-gray-400">Nenhum motorista registrado</p>;

  return (
    <div className="space-y-3">
      {ranking.map((d, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              i === 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
            }`}
          >
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700 truncate max-w-[160px]">
                {d.name}
              </span>
              <span
                className={`text-xs font-bold tabular-nums ml-2 shrink-0 ${
                  i === 0 ? "text-red-500" : "text-gray-500"
                }`}
              >
                {d.count}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  i === 0 ? "bg-red-400" : "bg-gray-300"
                }`}
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
