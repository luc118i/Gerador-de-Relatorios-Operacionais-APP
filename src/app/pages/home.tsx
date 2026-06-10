import type { ReactNode } from "react";
import {
  AlertTriangle,
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  Users,
  LayoutGrid,
  List,
  Tag,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  LogOut,
  Gavel,
  Loader2,
  X,
  BookMarked,
  Menu,
  Clock,
  Search,
} from "lucide-react";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { occurrencesApi } from "../../api/occurrences.api";
import type { OccurrenceDTO } from "../../domain/occurrences";
import type { Ocorrencia } from "../types";
import { OccurrenceCard, type DriveStatus } from "../components/OccurrenceCardDTO";
import { OccurrencePreviewModal } from "./occurrences/preview/OccurrencePreviewModal";
import { DrivePickerModal } from "./occurrences/preview/components/DrivePickerModal";
import { formatToLocalDate } from "../utils/dateUtils";
import { Calendar as CalendarIcon } from "lucide-react";
import { NovaOcorrencia } from "./nova-ocorrencia";
import { toast } from "sonner";
import { Calendar } from "../components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { useDriveFolder } from "../../hooks/useDriveFolder";
import { requestDriveToken } from "../../utils/googleAuth";
import { reportsDriveApi } from "../../api/reportsDrive.api";
import { setDriveLink } from "../../utils/driveLinkCache";
import { getApiErrorMessage } from "../../api/http";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useAuth } from "../context/AuthContext";
import { AdminLoginModal } from "../components/AdminLoginModal";
import { ApuracaoPodium } from "../components/ApuracaoPodium";
import { EmptyReportScene } from "../components/EmptyReportScene";
import { UserMenu } from "../components/UserMenu";
import { registerDisciplinaryOccurrence, fillMedidaLink, updateRizerOccurrence } from "../../api/automation.api";
import type { BatchOverlay } from "../components/OccurrenceCardDTO";
import { useAutomationFolders } from "../../hooks/useAutomationFolders";
import { AutomationFoldersModal } from "../components/AutomationFoldersModal";
import { FolderOpen, Cpu, RefreshCw } from "lucide-react";
import { useAgentStatus } from "../../hooks/useAgentStatus";
import { BatchRizerModal, type BatchRizerItem } from "../components/BatchRizerModal";
import { AgentProgressDock, type AgentJob } from "../components/AgentProgressDock";

interface HomeProps {
  onNovaOcorrencia: () => void;
  onGerarRelatorio: () => void;
  onGerenciarMotoristas: () => void;
  onGerenciarNomes: () => void;
  onOpenDrawer: () => void;
}

export function Home({
  onNovaOcorrencia,
  onGerarRelatorio,
  onGerenciarMotoristas,
  onGerenciarNomes,
  onOpenDrawer,
}: HomeProps) {
  const queryClient = useQueryClient();
  const { isAdmin, logout } = useAdminAuth();
  const { profileName } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  type BatchState = {
    subject: string;
    ids: string[];
    currentId: string | null;
    doneCount: number;
    cancelRequested: boolean;
  };
  const [batchState, setBatchState] = useState<BatchState | null>(null);
  const batchCancelRef = useRef(false);
  const [batchConfirm, setBatchConfirm] = useState<{ subject: string; occs: OccurrenceDTO[] } | null>(null);

  const [batchTratativaState, setBatchTratativaState] = useState<BatchState | null>(null);
  const batchTrataivaCancelRef = useRef(false);
  const [batchTratativaConfirm, setBatchTratativaConfirm] = useState<{ subject: string; ids: string[] } | null>(null);

  const [batchRevisarState, setBatchRevisarState] = useState<BatchState | null>(null);
  const batchRevisarCancelRef = useRef(false);
  const [batchRevisarConfirm, setBatchRevisarConfirm] = useState<{ subject: string; ids: string[] } | null>(null);

  // ── Estados ──────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDateString(new Date()),
  );
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [editando, setEditando] = useState<Ocorrencia | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">(
    () => (localStorage.getItem("home_viewMode") as "cards" | "list") ?? "cards",
  );
  const [groupBySubject, setGroupBySubject] = useState<boolean>(
    () => localStorage.getItem("home_groupBySubject") === "true",
  );
  const [search, setSearch] = useState("");
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("home_collapsedSubjects");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  const calendarRef = useRef<HTMLDivElement | null>(null);

  // ── Agente local (localhost:3334) ─────────────────────────
  const agentAvailable = useAgentStatus();

  // ── Pasta de relatórios (automação RIZER) ─────────────────
  const automationFolders = useAutomationFolders();
  const [showAutomationFolderModal, setShowAutomationFolderModal] = useState(false);

  // ── Lembrete 17h ─────────────────────────────────────────
  const [showReminder, setShowReminder] = useState(false);

  // ── Google Drive ──────────────────────────────────────────
  const driveFolder = useDriveFolder();
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [showDriveModal, setShowDriveModal] = useState(false);
  /** IDs que já foram enviados ao Drive nesta sessão (persiste no localStorage) */
  const [driveSentIds, setDriveSentIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("home_drive_sent");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });
  const [driveSendingId, setDriveSendingId] = useState<string | null>(null);
  /** Ocorrências editadas e ainda não reenviadas (precisam de force=true) */
  const [driveNeedsUpdateIds, setDriveNeedsUpdateIds] = useState<Set<string>>(new Set());

  // ── Derivados ─────────────────────────────────────────────
  const formattedDate = useMemo(
    () => formatToLocalDate(selectedDate),
    [selectedDate],
  );

  const dateDiffLabel = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = selectedDate.split("-").map(Number);
    const current = new Date(year, month - 1, day);
    current.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (today.getTime() - current.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays > 1) return `${diffDays} dias atrás`;
    if (diffDays === -1) return "Amanhã";
    return `Em ${Math.abs(diffDays)} dias`;
  }, [selectedDate]);

  const selectedDateObj = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDate]);

  // ── Query ─────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["occurrences", "byCreationDate", selectedDate],
    queryFn: async () => {
      const res = await occurrencesApi.listOccurrences(selectedDate);
      return res.data;
    },
    staleTime: 30_000,
  });

  const allOcorrencias: OccurrenceDTO[] = data ?? [];

  // ── Busca universal ───────────────────────────────────────
  // Normaliza removendo acentos e caixa, para casar "São Paulo" com "sao paulo".
  const normalizeText = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();

  // ── Visibilidade por autor ────────────────────────────────
  // Cada analista vê apenas as ocorrências que ele mesmo registrou
  // (campo `analisadoPor`, pré-preenchido com o nome do usuário logado).
  // O Admin (PIN) enxerga as ocorrências de todos.
  const ocorrencias = useMemo<OccurrenceDTO[]>(() => {
    if (isAdmin) return allOcorrencias;
    const me = normalizeText(profileName);
    if (!me) return [];
    return allOcorrencias.filter(
      (o) => normalizeText(o.analisadoPor ?? "") === me,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOcorrencias, isAdmin, profileName]);

  const filteredOcorrencias = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return ocorrencias;
    // cada termo (separado por espaço) precisa casar em algum campo (AND entre termos)
    const terms = q.split(/\s+/).filter(Boolean);
    return ocorrencias.filter((occ) => {
      const haystack = normalizeText(
        [
          occ.vehicleNumber,
          occ.lineLabel ?? "",
          occ.typeTitle,
          (occ as any).reportTitle ?? "",
          occ.occurrenceName ?? "",
          occ.place ?? "",
          occ.baseCode ?? "",
          occ.startTime ?? "",
          occ.endTime ?? "",
          ...(occ.drivers ?? []).flatMap((d) => [d.registry, d.name, d.baseCode]),
        ].join(" "),
      );
      return terms.every((t) => haystack.includes(t));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocorrencias, search]);

  const TYPO_CORRECTIONS: [RegExp, string][] = [
    [/\bOPERCIONAL\b/g, "OPERACIONAL"],
  ];

  const grouped = useMemo(() => {
    if (!groupBySubject || filteredOcorrencias.length === 0) return null;
    const map = new Map<string, OccurrenceDTO[]>();
    for (const occ of filteredOcorrencias) {
      const raw =
        occ.typeCode === "GENERICO"
          ? (occ as any).reportTitle || occ.typeTitle
          : occ.typeTitle;
      let subject = String(raw ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");
      for (const [pattern, correct] of TYPO_CORRECTIONS) {
        subject = subject.replace(pattern, correct);
      }
      if (!map.has(subject)) map.set(subject, []);
      map.get(subject)!.push(occ);
    }
    return map;
  }, [filteredOcorrencias, groupBySubject]);

  // ── Efeitos ───────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setCalendarVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // ── Handlers ──────────────────────────────────────────────
  function handleConfirmReminder() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    localStorage.setItem("kandango_reminder_confirmed", today);
    setShowReminder(false);
  }

  function changeDay(offset: number) {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + offset);
    setSelectedDate(getLocalDateString(date));
  }

  function goToday() {
    setSelectedDate(getLocalDateString(new Date()));
  }

  function handleSelect(date?: Date) {
    if (!date) return;
    setSelectedDate(getLocalDateString(date));
    setCalendarVisible(false);
  }

  async function startBatch(subject: string, items: BatchRizerItem[]) {
    if (!isAdmin || items.length === 0) return;
    if (!automationFolders.config) { setShowAutomationFolderModal(true); return; }
    batchCancelRef.current = false;
    setBatchState({ subject, ids: items.map(i => i.id), currentId: null, doneCount: 0, cancelRequested: false });

    for (let i = 0; i < items.length; i++) {
      if (batchCancelRef.current) break;
      const { id, advertencia } = items[i];
      setBatchState(prev => prev ? { ...prev, currentId: id } : null);
      try {
        await registerDisciplinaryOccurrence(
          id,
          automationFolders.config?.relatoriosFolderId,
          automationFolders.config?.medidasFolderId,
          { useAgent: agentAvailable, advertencia },
        );
      } catch {
        // falha individual não para a fila
      }
      setBatchState(prev => prev ? { ...prev, doneCount: i + 1, currentId: null } : null);
    }

    await queryClient.invalidateQueries({ queryKey: ["occurrences", "byCreationDate", selectedDate] });
    setBatchState(null);
    batchCancelRef.current = false;
  }

  function cancelBatch() {
    batchCancelRef.current = true;
    setBatchState(prev => prev ? { ...prev, cancelRequested: true } : null);
  }

  function getBatchOverlay(occId: string, subject: string): BatchOverlay | undefined {
    if (!batchState || batchState.subject !== subject) return undefined;
    if (batchState.currentId === occId) return "processing";
    if (batchState.ids.indexOf(occId) > batchState.ids.indexOf(batchState.currentId ?? "")) return "queued";
    return undefined;
  }

  async function startBatchTratativa(subject: string, ids: string[]) {
    if (!isAdmin || ids.length === 0) return;
    if (!automationFolders.config) { setShowAutomationFolderModal(true); return; }
    batchTrataivaCancelRef.current = false;
    setBatchTratativaState({ subject, ids, currentId: null, doneCount: 0, cancelRequested: false });

    for (let i = 0; i < ids.length; i++) {
      if (batchTrataivaCancelRef.current) break;
      const id = ids[i];
      setBatchTratativaState(prev => prev ? { ...prev, currentId: id } : null);
      try {
        await fillMedidaLink(id, automationFolders.config.medidasFolderId, { useAgent: agentAvailable });
      } catch {
        // falha individual não para a fila
      }
      setBatchTratativaState(prev => prev ? { ...prev, doneCount: i + 1, currentId: null } : null);
    }

    await queryClient.invalidateQueries({ queryKey: ["occurrences", "byCreationDate", selectedDate] });
    setBatchTratativaState(null);
    batchTrataivaCancelRef.current = false;
  }

  function cancelBatchTratativa() {
    batchTrataivaCancelRef.current = true;
    setBatchTratativaState(prev => prev ? { ...prev, cancelRequested: true } : null);
  }

  function getTratativaOverlay(occId: string, subject: string): BatchOverlay | undefined {
    if (!batchTratativaState || batchTratativaState.subject !== subject) return undefined;
    if (batchTratativaState.currentId === occId) return "processing";
    if (batchTratativaState.ids.indexOf(occId) > batchTratativaState.ids.indexOf(batchTratativaState.currentId ?? "")) return "queued";
    return undefined;
  }

  async function startBatchRevisar(subject: string, ids: string[]) {
    if (!isAdmin || ids.length === 0) return;
    if (!automationFolders.config) { setShowAutomationFolderModal(true); return; }
    batchRevisarCancelRef.current = false;
    setBatchRevisarState({ subject, ids, currentId: null, doneCount: 0, cancelRequested: false });

    for (let i = 0; i < ids.length; i++) {
      if (batchRevisarCancelRef.current) break;
      const id = ids[i];
      setBatchRevisarState(prev => prev ? { ...prev, currentId: id } : null);
      try {
        await updateRizerOccurrence(
          id,
          automationFolders.config?.relatoriosFolderId,
          automationFolders.config?.medidasFolderId,
          { useAgent: agentAvailable },
        );
      } catch {
        // falha individual não para a fila
      }
      setBatchRevisarState(prev => prev ? { ...prev, doneCount: i + 1, currentId: null } : null);
    }

    await queryClient.invalidateQueries({ queryKey: ["occurrences", "byCreationDate", selectedDate] });
    setBatchRevisarState(null);
    batchRevisarCancelRef.current = false;
  }

  function cancelBatchRevisar() {
    batchRevisarCancelRef.current = true;
    setBatchRevisarState(prev => prev ? { ...prev, cancelRequested: true } : null);
  }

  function getRevisarOverlay(occId: string, subject: string): BatchOverlay | undefined {
    if (!batchRevisarState || batchRevisarState.subject !== subject) return undefined;
    if (batchRevisarState.currentId === occId) return "processing";
    if (batchRevisarState.ids.indexOf(occId) > batchRevisarState.ids.indexOf(batchRevisarState.currentId ?? "")) return "queued";
    return undefined;
  }

  // ── Jobs ativos para o dock flutuante global ──────────────
  const agentJobs = useMemo<AgentJob[]>(() => {
    const jobs: AgentJob[] = [];
    if (batchState) {
      jobs.push({
        kind: "registro",
        subject: batchState.subject,
        doneCount: batchState.doneCount,
        total: batchState.ids.length,
        cancelRequested: batchState.cancelRequested,
        onCancel: cancelBatch,
      });
    }
    if (batchTratativaState) {
      jobs.push({
        kind: "tratativa",
        subject: batchTratativaState.subject,
        doneCount: batchTratativaState.doneCount,
        total: batchTratativaState.ids.length,
        cancelRequested: batchTratativaState.cancelRequested,
        onCancel: cancelBatchTratativa,
      });
    }
    if (batchRevisarState) {
      jobs.push({
        kind: "revisar",
        subject: batchRevisarState.subject,
        doneCount: batchRevisarState.doneCount,
        total: batchRevisarState.ids.length,
        cancelRequested: batchRevisarState.cancelRequested,
        onCancel: cancelBatchRevisar,
      });
    }
    return jobs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchState, batchTratativaState, batchRevisarState]);

  async function handleEditar(occ: OccurrenceDTO) {
    try {
      const full = await occurrencesApi.getOccurrenceById(occ.id);

      // ✅ busca as URLs assinadas
      const signedRes = await occurrencesApi.getEvidenceSignedUrls(occ.id);

      setEditando(dtoToOcorrencia(full as any, signedRes));
    } catch {
      toast.error("Erro ao carregar ocorrência.");
    }
  }

  async function handleConfirmarExclusao() {
    if (!excluindoId) return;
    setExcluindo(true);
    try {
      await occurrencesApi.deleteOccurrence(excluindoId);
      toast.success("Ocorrência excluída.");
      setExcluindoId(null);
      queryClient.invalidateQueries({
        queryKey: ["occurrences", "byCreationDate", selectedDate],
      });
    } catch {
      toast.error("Erro ao excluir ocorrência.");
    } finally {
      setExcluindo(false);
    }
  }

  function markDriveSent(id: string) {
    setDriveSentIds((prev) => {
      const next = new Set(prev).add(id);
      localStorage.setItem("home_drive_sent", JSON.stringify([...next]));
      return next;
    });
  }

  const handleSendToDrive = useCallback(async (occurrenceId: string) => {
    if (!driveFolder.config) {
      setShowDriveModal(true);
      return;
    }

    setDriveSendingId(occurrenceId);
    try {
      let token = driveToken;
      if (!token) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
        token = await requestDriveToken(clientId);
        setDriveToken(token);
      }

      const needsUpdate = driveNeedsUpdateIds.has(occurrenceId);
      const res = await reportsDriveApi.sendOccurrenceToDrive({
        occurrenceId,
        accessToken: token,
        folderId: driveFolder.config.folderId,
        force: needsUpdate,
      });

      markDriveSent(occurrenceId);
      setDriveNeedsUpdateIds((prev) => { const s = new Set(prev); s.delete(occurrenceId); return s; });

      const { webViewLink } = res.data.drive;
      setDriveLink(occurrenceId, webViewLink);
      toast.success(
        <span>
          PDF {needsUpdate ? "atualizado" : "enviado"} no Drive!{" "}
          <a href={webViewLink} target="_blank" rel="noreferrer" className="underline">
            Abrir
          </a>
        </span>,
        { duration: 6000 },
      );
    } catch (err) {
      toast.error(`Falha ao enviar ao Drive: ${getApiErrorMessage(err)}`);
    } finally {
      setDriveSendingId(null);
    }
  }, [driveToken, driveFolder.config, driveNeedsUpdateIds]);

  function handleDriveConfirm(args: { config: { folderId: string; folderName: string }; accessToken: string; saveAsDefault: boolean }) {
    if (args.saveAsDefault) driveFolder.save(args.config);
    setDriveToken(args.accessToken);
    setShowDriveModal(false);
  }

  function toggleSubjectCollapse(subject: string) {
    setCollapsedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      localStorage.setItem("home_collapsedSubjects", JSON.stringify([...next]));
      return next;
    });
  }

  function getDriveStatus(id: string): DriveStatus {
    if (driveSendingId === id) return "sending";
    if (driveSentIds.has(id) && !driveNeedsUpdateIds.has(id)) return "sent";
    return "idle";
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} />}

      {/* Modal de lembrete às 17h */}
      {showReminder && (
        <ReminderModal onConfirm={handleConfirmReminder} />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="relative flex items-center gap-3">

              {isAdmin && (
                <NavBtn onClick={onOpenDrawer} tooltip="Módulos">
                  <Menu className="w-4 h-4" />
                </NavBtn>
              )}

              <img src="/favicon.svg" alt="Logo" className="w-10 h-10 rounded-xl shrink-0 block" />

              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Gerador de Relatórios Operacionais
                </h1>
              </div>
              {/* Navegação de datas */}
              <div
                ref={calendarRef}
                className="relative flex items-center gap-1 ml-2"
              >
                <NavBtn onClick={() => setCalendarVisible((v) => !v)} tooltip="Abrir calendário">
                  <CalendarIcon className="w-4 h-4" />
                </NavBtn>
                <NavBtn onClick={() => changeDay(-1)} tooltip="Dia anterior">
                  <ChevronLeft className="w-4 h-4" />
                </NavBtn>
                <span className="text-sm text-gray-700 font-medium px-1 select-none capitalize whitespace-nowrap">
                  {formattedDate}
                </span>
                <NavBtn onClick={() => changeDay(1)} tooltip="Próximo dia">
                  <ChevronRight className="w-4 h-4" />
                </NavBtn>
                <button
                  onClick={goToday}
                  className="cursor-pointer ml-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition font-medium"
                  title={dateDiffLabel}
                >
                  {dateDiffLabel}
                </button>
                {calendarVisible && (
                  <div className="absolute top-9 left-0 bg-white shadow-lg border border-gray-200 rounded-xl z-50">
                    <Calendar
                      mode="single"
                      selected={selectedDateObj}
                      onSelect={handleSelect}
                      locale={ptBR}
                      initialFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Ações — icon-only com tooltip */}
            <div className="flex items-center gap-1.5">
              {isAdmin && (
                <ActionBtn onClick={onGerarRelatorio} tooltip="Relatorio Diario">
                  <FileText className="w-4 h-4" />
                </ActionBtn>
              )}
              {isAdmin && (
                <ActionBtn onClick={onGerenciarMotoristas} tooltip="Motoristas">
                  <Users className="w-4 h-4" />
                </ActionBtn>
              )}

              {/* Login de Admin — à esquerda do +, apenas quando não é admin */}
              {!isAdmin && (
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Entrar como Admin"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}

              <ActionBtn onClick={onNovaOcorrencia} tooltip="Nova Ocorrência" primary>
                <Plus className="w-4 h-4" />
              </ActionBtn>

              {/* Indicador do agente local — visível apenas para admin */}
              {isAdmin && (
                <>
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  {agentAvailable ? (
                    <div
                      title="Agente local conectado — automações rodam na sua máquina"
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50"
                    >
                      <Cpu className="w-3 h-3" />
                      <span className="hidden sm:inline">Agente</span>
                    </div>
                  ) : (
                    <a
                      href="https://github.com/luc118i/rizer-agent/releases/latest/download/RIZER.Agent.Setup.exe"
                      title="Baixar agente local — automações rodarão na sua máquina"
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-400 bg-gray-100 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      download
                    >
                      <Cpu className="w-3 h-3" />
                      <span className="hidden sm:inline">Servidor</span>
                    </a>
                  )}
                </>
              )}

              {/* Admin — dropdown apenas quando logado como admin */}
              {isAdmin && (
                <>
                  {/* Separador */}
                  <div className="w-px h-5 bg-gray-200 mx-0.5" />
                  <div className="relative group/admin">
                    <button
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      title="Logado como Admin"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Admin</span>
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 pointer-events-none group-hover/admin:opacity-100 group-hover/admin:pointer-events-auto transition-opacity z-50">
                      <button
                        onClick={() => setShowAutomationFolderModal(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-t-lg transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {automationFolders.config
                            ? `${automationFolders.config.relatoriosFolderName} / ${automationFolders.config.medidasFolderName}`
                            : "Pastas de automação"}
                        </span>
                      </button>
                      <button
                        onClick={onGerenciarNomes}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <BookMarked className="w-3.5 h-3.5 shrink-0" />
                        Nomes padronizados
                      </button>
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-b-lg transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sair da conta admin
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Perfil do usuário logado (Supabase) — sempre visível */}
              <div className="w-px h-5 bg-gray-200 mx-0.5" />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Ocorrências do Dia
            </h2>
            {!isLoading && !isError && ocorrencias.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Busca universal */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar prefixo, carro, tipo, motorista…"
                    className="w-56 sm:w-72 pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      aria-label="Limpar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* Toggle agrupamento */}
                <button
                  onClick={() => setGroupBySubject((v) => { const next = !v; localStorage.setItem("home_groupBySubject", String(next)); return next; })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    groupBySubject
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  Agrupar por assunto
                </button>
                {/* Toggle visualização */}
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => { setViewMode("cards"); localStorage.setItem("home_viewMode", "cards"); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === "cards"
                        ? "bg-white shadow-sm text-gray-800"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Cards
                  </button>
                  <button
                    onClick={() => { setViewMode("list"); localStorage.setItem("home_viewMode", "list"); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === "list"
                        ? "bg-white shadow-sm text-gray-800"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Lista
                  </button>
                </div>
              </div>
            )}
          </div>
          {isLoading ? (
            <p className="text-sm text-gray-600">Carregando…</p>
          ) : isError ? (
            <p className="text-sm text-red-600">
              Falha ao carregar ocorrências do dia.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              {search.trim()
                ? `${filteredOcorrencias.length} de ${ocorrencias.length} registro${ocorrencias.length !== 1 ? "s" : ""}`
                : `${ocorrencias.length} registro${ocorrencias.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        {isError ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Não foi possível carregar as ocorrências
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Verifique a conexão com a API e tente novamente.
            </p>
            <button
              onClick={() => refetch()}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : ocorrencias.length === 0 ? (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma ocorrência registrada
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Clique no botão "Nova Ocorrência" para registrar um descumprimento
                operacional
              </p>
              <button
                onClick={onNovaOcorrencia}
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" /> Nova Ocorrência
              </button>
            </div>
            <EmptyReportScene />
          </div>
        ) : filteredOcorrencias.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">
              Nenhum resultado para “{search.trim()}”
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Tente outro prefixo, motorista, base ou tipo de ocorrência.
            </p>
            <button
              onClick={() => setSearch("")}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              <X className="w-4 h-4" /> Limpar busca
            </button>
          </div>
        ) : grouped ? (
          /* ── Agrupado por assunto ─────────────────────────────────── */
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([subject, occs]) => {
              const collapsed = collapsedSubjects.has(subject);
              const unregistered = occs.filter(o => !o.rizerRegistered);
              const pendingTratativa = occs.filter(o => o.faltaTratativa);
              const registered = occs.filter(o => o.rizerRegistered);
              const isBatchRunning = batchState?.subject === subject;
              const isBatchTratativaRunning = batchTratativaState?.subject === subject;
              const isBatchRevisarRunning = batchRevisarState?.subject === subject;
              const anyBatchRunning = !!batchState || !!batchTratativaState || !!batchRevisarState;
              return (
                <div key={subject}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      {subject}
                    </h3>
                    <span className="text-xs text-gray-400 font-normal">
                      ({occs.length})
                    </span>

                    {/* Botão "Registrar todas" */}
                    {isAdmin && !anyBatchRunning && unregistered.length > 0 && (
                      <button
                        onClick={() => setBatchConfirm({ subject, occs: unregistered })}
                        className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                      >
                        <Gavel className="w-3 h-3" />
                        Registrar todas ({unregistered.length})
                      </button>
                    )}

                    {/* Botão "Enviar tratativas" */}
                    {isAdmin && !anyBatchRunning && pendingTratativa.length > 0 && (
                      <button
                        onClick={() => setBatchTratativaConfirm({ subject, ids: pendingTratativa.map(o => o.id) })}
                        className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Enviar tratativas ({pendingTratativa.length})
                      </button>
                    )}

                    {/* Botão "Revisar todas" */}
                    {isAdmin && !anyBatchRunning && registered.length > 0 && (
                      <button
                        onClick={() => setBatchRevisarConfirm({ subject, ids: registered.map(o => o.id) })}
                        className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Revisar todas ({registered.length})
                      </button>
                    )}

                    <button
                      onClick={() => toggleSubjectCollapse(subject)}
                      title={collapsed ? "Mostrar ocorrências" : "Ocultar ocorrências"}
                      className="cursor-pointer ml-auto p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {collapsed
                        ? <EyeOff className="w-3.5 h-3.5" />
                        : <Eye className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>

                  {/* Banner de progresso — registro */}
                  {isBatchRunning && batchState && (
                    <div className="mb-2 flex items-center gap-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin shrink-0" />
                      <span className="text-xs font-medium text-orange-700 flex-1">
                        {batchState.cancelRequested
                          ? "Cancelando após item atual..."
                          : `Registrando no RIZER… ${batchState.doneCount} de ${batchState.ids.length}`}
                      </span>
                      {!batchState.cancelRequested && (
                        <button
                          onClick={cancelBatch}
                          className="cursor-pointer flex items-center gap-1 text-[10px] font-medium text-orange-500 hover:text-orange-700 transition-colors"
                        >
                          <X className="w-3 h-3" /> Cancelar
                        </button>
                      )}
                    </div>
                  )}

                  {/* Banner de progresso — tratativas */}
                  {isBatchTratativaRunning && batchTratativaState && (
                    <div className="mb-2 flex items-center gap-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                      <span className="text-xs font-medium text-amber-700 flex-1">
                        {batchTratativaState.cancelRequested
                          ? "Cancelando após item atual..."
                          : `Preenchendo tratativas… ${batchTratativaState.doneCount} de ${batchTratativaState.ids.length}`}
                      </span>
                      {!batchTratativaState.cancelRequested && (
                        <button
                          onClick={cancelBatchTratativa}
                          className="cursor-pointer flex items-center gap-1 text-[10px] font-medium text-amber-500 hover:text-amber-700 transition-colors"
                        >
                          <X className="w-3 h-3" /> Cancelar
                        </button>
                      )}
                    </div>
                  )}

                  {/* Banner de progresso — revisão */}
                  {isBatchRevisarRunning && batchRevisarState && (
                    <div className="mb-2 flex items-center gap-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />
                      <span className="text-xs font-medium text-emerald-700 flex-1">
                        {batchRevisarState.cancelRequested
                          ? "Cancelando após item atual..."
                          : `Revisando no RIZER… ${batchRevisarState.doneCount} de ${batchRevisarState.ids.length}`}
                      </span>
                      {!batchRevisarState.cancelRequested && (
                        <button
                          onClick={cancelBatchRevisar}
                          className="cursor-pointer flex items-center gap-1 text-[10px] font-medium text-emerald-500 hover:text-emerald-700 transition-colors"
                        >
                          <X className="w-3 h-3" /> Cancelar
                        </button>
                      )}
                    </div>
                  )}
                  {!collapsed && (viewMode === "list" ? (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-0 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-400 uppercase tracking-wide" style={{ borderLeft: "3px solid transparent" }}>
                        <div className="w-[70px] flex-shrink-0 px-3 py-2">Prefixo</div>
                        <div className="w-[80px] flex-shrink-0 px-1 py-2 hidden sm:block">Base</div>
                        <div className="flex-1 px-2 py-2">Ocorrência</div>
                        <div className="w-[115px] flex-shrink-0 px-2 py-2 hidden sm:block">Horário</div>
                        <div className="w-[170px] flex-shrink-0 px-2 py-2 hidden lg:block">Motorista</div>
                        <div className="w-[140px] flex-shrink-0 px-1 py-2">Ações</div>
                      </div>
                      {occs.map((occ) => (
                        <OccurrenceCard
                          key={occ.id}
                          compact
                          occurrence={occ}
                          onOpen={() => setPreviewId(occ.id)}
                          onEditar={() => handleEditar(occ)}
                          onExcluir={() => setExcluindoId(occ.id)}
                          driveStatus={getDriveStatus(occ.id)}
                          onSendToDrive={() => handleSendToDrive(occ.id)}
                          batchOverlay={getBatchOverlay(occ.id, subject)}
                          tratativaOverlay={getTratativaOverlay(occ.id, subject)}
                          revisarOverlay={getRevisarOverlay(occ.id, subject)}
                          relatoriosFolderId={automationFolders.config?.relatoriosFolderId}
                          medidasFolderId={automationFolders.config?.medidasFolderId}
                          onNeedFolderConfig={() => setShowAutomationFolderModal(true)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {occs.map((occ) => (
                        <OccurrenceCard
                          key={occ.id}
                          occurrence={occ}
                          onOpen={() => setPreviewId(occ.id)}
                          onEditar={() => handleEditar(occ)}
                          onExcluir={() => setExcluindoId(occ.id)}
                          driveStatus={getDriveStatus(occ.id)}
                          onSendToDrive={() => handleSendToDrive(occ.id)}
                          batchOverlay={getBatchOverlay(occ.id, subject)}
                          tratativaOverlay={getTratativaOverlay(occ.id, subject)}
                          revisarOverlay={getRevisarOverlay(occ.id, subject)}
                          relatoriosFolderId={automationFolders.config?.relatoriosFolderId}
                          medidasFolderId={automationFolders.config?.medidasFolderId}
                          onNeedFolderConfig={() => setShowAutomationFolderModal(true)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : viewMode === "list" ? (
          /* ── Lista compacta ──────────────────────────────────────── */
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Cabeçalho da lista */}
            <div className="flex items-center gap-0 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-400 uppercase tracking-wide" style={{ borderLeft: "3px solid transparent" }}>
              <div className="w-[70px] flex-shrink-0 px-3 py-2">Prefixo</div>
              <div className="w-[80px] flex-shrink-0 px-1 py-2 hidden sm:block">Base</div>
              <div className="flex-1 px-2 py-2">Ocorrência</div>
              <div className="w-[115px] flex-shrink-0 px-2 py-2 hidden sm:block">Horário</div>
              <div className="w-[170px] flex-shrink-0 px-2 py-2 hidden lg:block">Motorista</div>
              <div className="w-[140px] flex-shrink-0 px-1 py-2">Ações</div>
            </div>
            {filteredOcorrencias.map((occ) => (
              <OccurrenceCard
                key={occ.id}
                compact
                occurrence={occ}
                onOpen={() => setPreviewId(occ.id)}
                onEditar={() => handleEditar(occ)}
                onExcluir={() => setExcluindoId(occ.id)}
                driveStatus={getDriveStatus(occ.id)}
                onSendToDrive={() => handleSendToDrive(occ.id)}
                relatoriosFolderId={automationFolders.config?.relatoriosFolderId}
                medidasFolderId={automationFolders.config?.medidasFolderId}
                onNeedFolderConfig={() => setShowAutomationFolderModal(true)}
              />
            ))}
          </div>
        ) : (
          /* ── Grid de cards ───────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOcorrencias.map((occ) => (
              <OccurrenceCard
                key={occ.id}
                occurrence={occ}
                onOpen={() => setPreviewId(occ.id)}
                onEditar={() => handleEditar(occ)}
                onExcluir={() => setExcluindoId(occ.id)}
                driveStatus={getDriveStatus(occ.id)}
                onSendToDrive={() => handleSendToDrive(occ.id)}
                relatoriosFolderId={automationFolders.config?.relatoriosFolderId}
                medidasFolderId={automationFolders.config?.medidasFolderId}
                onNeedFolderConfig={() => setShowAutomationFolderModal(true)}
              />
            ))}
          </div>
        )}

        {/* ── Pódio de apuração (tempo real) ───────────────────────── */}
        {!isLoading && !isError && ocorrencias.length > 0 && (
          <ApuracaoPodium occurrences={ocorrencias} className="mt-16 w-full" />
        )}

        <OccurrencePreviewModal
          occurrenceId={previewId}
          open={!!previewId}
          onClose={() => setPreviewId(null)}
        />
      </main>

      {/* Drawer de Edição */}
      {editando && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditando(null)}
          />
          <div className="relative w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl">
            <NovaOcorrencia
              edicao={editando}
              onVoltar={() => setEditando(null)}
              onSaved={(args) => {
                setEditando(null);
                toast.success("Ocorrência atualizada!");

                // Se o arquivo estava no Drive, marca para reenvio (force=true)
                if (driveSentIds.has(args.id)) {
                  setDriveNeedsUpdateIds((prev) => new Set(prev).add(args.id));
                }

                // Atualiza o card imediatamente no cache (sem esperar refetch)
                queryClient.setQueryData<OccurrenceDTO[]>(
                  ["occurrences", "byCreationDate", selectedDate],
                  (prev) =>
                    prev
                      ? prev.map((o) =>
                          o.id === args.id
                            ? {
                                ...o,
                                vehicleNumber:
                                  args.view.viagem &&
                                  "prefixo" in args.view.viagem
                                    ? (args.view.viagem as any).prefixo ?? o.vehicleNumber
                                    : o.vehicleNumber,
                                lineLabel:
                                  args.view.viagem &&
                                  "linha" in args.view.viagem
                                    ? (args.view.viagem as any).linha ?? o.lineLabel
                                    : o.lineLabel,
                                startTime: args.view.horarioInicial ?? o.startTime,
                                endTime: args.view.horarioFinal ?? o.endTime,
                                place: args.view.localParada ?? o.place,
                                speedKmh: args.view.speedKmh ?? o.speedKmh,
                                reportTitle: args.view.reportTitle ?? o.reportTitle,
                              }
                            : o,
                        )
                      : prev,
                );

                // Invalida a lista para garantir sincronização com o backend
                queryClient.invalidateQueries({
                  queryKey: ["occurrences", "byCreationDate", selectedDate],
                });

                // Invalida o cache da ocorrência individual (usado pelo modal de preview)
                queryClient.invalidateQueries({
                  queryKey: ["occurrence", args.id],
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de Configuração das Pastas de Automação (RIZER) */}
      {showAutomationFolderModal && (
        <AutomationFoldersModal
          current={automationFolders.config}
          onConfirm={(data) => {
            automationFolders.save(data);
            setShowAutomationFolderModal(false);
          }}
          onClose={() => setShowAutomationFolderModal(false)}
        />
      )}

      {/* Modal de Configuração do Google Drive */}
      {showDriveModal && (
        <DrivePickerModal
          currentConfig={driveFolder.config ?? null}
          onConfirm={handleDriveConfirm}
          onClose={() => setShowDriveModal(false)}
        />
      )}

      {/* Modal de Confirmação do Batch */}
      {batchConfirm && (
        <BatchRizerModal
          open={true}
          subject={batchConfirm.subject}
          occs={batchConfirm.occs}
          onConfirm={(items) => {
            const subject = batchConfirm.subject;
            setBatchConfirm(null);
            startBatch(subject, items);
          }}
          onCancel={() => setBatchConfirm(null)}
        />
      )}

      {/* Modal de Confirmação do Batch de Tratativas */}
      {batchTratativaConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setBatchTratativaConfirm(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Enviar tratativas no RIZER?
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Você está prestes a preencher a tratativa de{" "}
              <span className="font-semibold text-gray-800">
                {batchTratativaConfirm.ids.length} ocorrência{batchTratativaConfirm.ids.length !== 1 ? "s" : ""}
              </span>{" "}
              do assunto:
            </p>
            <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-5">
              {batchTratativaConfirm.subject}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBatchTratativaConfirm(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const { subject, ids } = batchTratativaConfirm;
                  setBatchTratativaConfirm(null);
                  startBatchTratativa(subject, ids);
                }}
                className="px-4 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação do Batch de Revisão */}
      {batchRevisarConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setBatchRevisarConfirm(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <RefreshCw className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Revisar todas no RIZER?
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Você está prestes a reabrir e reescrever todos os campos de{" "}
              <span className="font-semibold text-gray-800">
                {batchRevisarConfirm.ids.length} ocorrência{batchRevisarConfirm.ids.length !== 1 ? "s" : ""}
              </span>{" "}
              já enviada{batchRevisarConfirm.ids.length !== 1 ? "s" : ""} do assunto:
            </p>
            <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-5">
              {batchRevisarConfirm.subject}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBatchRevisarConfirm(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const { subject, ids } = batchRevisarConfirm;
                  setBatchRevisarConfirm(null);
                  startBatchRevisar(subject, ids);
                }}
                className="px-4 py-2 text-sm rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {excluindoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !excluindo && setExcluindoId(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Excluir ocorrência?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setExcluindoId(null)}
                disabled={excluindo}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarExclusao}
                disabled={excluindo}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dock flutuante global — progresso do agente */}
      <AgentProgressDock jobs={agentJobs} />
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dtoToOcorrencia(
  dto: any,
  signedUrls: Array<{
    id: string;
    url: string;
    caption?: string;
    linkTexto?: string;
    linkUrl?: string;
  }> = [],
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

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="h-5 w-28 bg-gray-100 rounded mb-3" />
      <div className="h-4 w-44 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-36 bg-gray-100 rounded mb-4" />
      <div className="h-3 w-52 bg-gray-100 rounded" />
    </div>
  );
}

// ── Botões compactos com tooltip ──────────────────────────────────────────────

function NavBtn({
  onClick,
  tooltip,
  children,
}: {
  onClick: () => void;
  tooltip: string;
  children: ReactNode;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="cursor-pointer p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
      >
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-gray-900 text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {tooltip}
      </span>
    </div>
  );
}

function ActionBtn({
  onClick,
  tooltip,
  primary,
  children,
}: {
  onClick: () => void;
  tooltip: string;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`cursor-pointer p-2 rounded-lg transition-colors ${
          primary
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
        }`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-gray-900 text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {tooltip}
      </span>
    </div>
  );
}
