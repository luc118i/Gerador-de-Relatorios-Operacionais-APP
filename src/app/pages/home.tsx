import {
  AlertTriangle,
  Home as HomeIcon,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  Tag,
  X,
} from "lucide-react";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { occurrencesApi } from "../../api/occurrences.api";
import type { OccurrenceDTO } from "../../domain/occurrences";
import type { Ocorrencia } from "../types";
import type { DriveStatus, BatchOverlay } from "../components/OccurrenceCardDTO";
import { OccurrencePreviewModal } from "./occurrences/preview/OccurrencePreviewModal";
import { DrivePickerModal } from "./occurrences/preview/components/DrivePickerModal";
import { formatToLocalDate, getLocalDateString } from "../../utils/dateUtils";
import { dtoToOcorrencia } from "../../utils/occurrenceMapper";
import { NovaOcorrencia } from "./nova-ocorrencia";
import { toast } from "sonner";
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
import { registerDisciplinaryOccurrence, fillMedidaLink, updateRizerOccurrence } from "../../api/automation.api";
import { useAutomationFolders } from "../../hooks/useAutomationFolders";
import { AutomationFoldersModal } from "../components/AutomationFoldersModal";
import { useAgentStatus } from "../../hooks/useAgentStatus";
import { BatchRizerModal, type BatchRizerItem } from "../components/BatchRizerModal";
import { tratativaToTipoMedida } from "../../utils/tratativa";
import { AgentProgressDock, type AgentJob } from "../components/AgentProgressDock";
import { buildDriverPdfFileName } from "../../utils/pdfDownload";
import { HomeHeader } from "./home/HomeHeader";
import { ReminderModal } from "./home/ReminderModal";
import { SkeletonCard } from "./home/SkeletonCard";
import { ConfirmActionModal } from "./home/ConfirmActionModal";
import { SubjectGroup } from "./home/SubjectGroup";
import { OccurrenceCardsView } from "./home/OccurrenceCardsView";

function getSaudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

interface HomeProps {
  onNovaOcorrencia: () => void;
  onGerarRelatorio: () => void;
  onGerenciarMotoristas: () => void;
  onGerenciarNomes: () => void;
  onGerenciarBaseResponsaveis: () => void;
  onOpenDrawer: () => void;
}

export function Home({
  onNovaOcorrencia,
  onGerarRelatorio,
  onGerenciarMotoristas,
  onGerenciarNomes,
  onGerenciarBaseResponsaveis,
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
  // Controla a transição (drawer deslizando + fundo recolhendo), separado de
  // `editando` para que o conteúdo continue montado durante a animação de saída.
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (editando) {
      const raf = requestAnimationFrame(() => setPanelOpen(true));
      return () => cancelAnimationFrame(raf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando]);

  function closeDrawer() {
    setPanelOpen(false);
    setTimeout(() => setEditando(null), 320);
  }
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

  // ── Estatísticas da semana (só busca quando o dia selecionado está vazio,
  // pra dar algum contexto no lugar do card de "nada registrado") ──────────
  const isEmptyToday = !isLoading && !isError && ocorrencias.length === 0;
  const { data: weekCounts } = useQuery({
    queryKey: ["occurrences", "weekStats", selectedDate],
    queryFn: async () => {
      const dates: string[] = [];
      for (let i = 1; i <= 7; i++) {
        const d = new Date(selectedDateObj);
        d.setDate(d.getDate() - i);
        dates.push(getLocalDateString(d));
      }
      const me = normalizeText(profileName);
      return Promise.all(
        dates.map((d) =>
          occurrencesApi
            .listOccurrences(d)
            .then((res) =>
              isAdmin
                ? res.data.length
                : res.data.filter((o) => normalizeText(o.analisadoPor ?? "") === me).length,
            )
            .catch(() => 0),
        ),
      );
    },
    enabled: isEmptyToday,
    staleTime: 5 * 60_000,
  });
  const weekTotal = weekCounts?.reduce((a, b) => a + b, 0) ?? 0;
  const weekAvg = weekCounts ? (weekTotal / 7).toFixed(1) : "—";
  const weekActiveDays = weekCounts?.filter((c) => c > 0).length ?? 0;

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

  // ── Prefixos repetidos no dia ─────────────────────────────
  // Quando o mesmo veículo aparece em mais de uma ocorrência do dia,
  // destacamos isso na lista (não é a mesma ocorrência — são registros distintos).
  const vehicleOccurrenceCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of ocorrencias) {
      map.set(o.vehicleNumber, (map.get(o.vehicleNumber) ?? 0) + 1);
    }
    return map;
  }, [ocorrencias]);

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

  // Se todas as ocorrências já têm uma tratativa definida (badge no card),
  // registra direto no RIZER sem perguntar de novo. Só abre o modal quando
  // alguma ocorrência ainda não tem tratativa marcada.
  function requestRegistrarTodas(subject: string, unregistered: OccurrenceDTO[]) {
    const mapped = unregistered.map((o) => tratativaToTipoMedida(o.tratativa));
    if (mapped.every((m) => m !== null)) {
      const items: BatchRizerItem[] = unregistered.map((o, i) => ({
        id: o.id,
        advertencia: mapped[i] === "advertencia",
      }));
      startBatch(subject, items);
      return;
    }
    setBatchConfirm({ subject, occs: unregistered });
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

  async function handleEditar(id: string) {
    try {
      const full = await occurrencesApi.getOccurrenceById(id);

      // ✅ busca as URLs assinadas
      const signedRes = await occurrencesApi.getEvidenceSignedUrls(id);

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

  const handleSendToDrive = useCallback(async (occ: OccurrenceDTO) => {
    const occurrenceId = occ.id;

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

      const d1 = occ.drivers?.[0];
      const fileName = buildDriverPdfFileName({
        registry: d1?.registry,
        name: d1?.name,
        base: d1?.baseCode,
        occurrenceTitle:
          occ.typeCode === "GENERICO" && occ.reportTitle ? occ.reportTitle : occ.typeTitle,
        eventDate: occ.eventDate,
      });

      const needsUpdate = driveNeedsUpdateIds.has(occurrenceId);
      const res = await reportsDriveApi.sendOccurrenceToDrive({
        occurrenceId,
        accessToken: token,
        folderId: driveFolder.config.folderId,
        fileName,
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

  const anyBatchRunning = !!batchState || !!batchTratativaState || !!batchRevisarState;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} />}

      {/* Modal de lembrete às 17h */}
      {showReminder && (
        <ReminderModal onConfirm={handleConfirmReminder} />
      )}

      {/* Recolhe suavemente ao abrir o drawer de edição (efeito "iOS") */}
      <div
        className={`origin-top transition-all duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
          panelOpen ? "scale-[0.97] rounded-2xl overflow-hidden brightness-[0.92]" : "scale-100"
        }`}
      >
      <HomeHeader
        isAdmin={isAdmin}
        onOpenDrawer={onOpenDrawer}
        calendarRef={calendarRef}
        calendarVisible={calendarVisible}
        onToggleCalendar={() => setCalendarVisible((v) => !v)}
        changeDay={changeDay}
        formattedDate={formattedDate}
        dateDiffLabel={dateDiffLabel}
        goToday={goToday}
        selectedDateObj={selectedDateObj}
        onSelectDate={handleSelect}
        onGerarRelatorio={onGerarRelatorio}
        onGerenciarMotoristas={onGerenciarMotoristas}
        onGerenciarNomes={onGerenciarNomes}
        onGerenciarBaseResponsaveis={onGerenciarBaseResponsaveis}
        onNovaOcorrencia={onNovaOcorrencia}
        onShowAdminLogin={() => setShowAdminLogin(true)}
        logout={logout}
        agentAvailable={agentAvailable}
        automationFolders={automationFolders.config}
        onShowAutomationFolderModal={() => setShowAutomationFolderModal(true)}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isLoading && !isError && ocorrencias.length === 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                <HomeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <span className="text-xs font-bold tracking-wide text-blue-600 dark:text-blue-400 uppercase">
                Painel Inicial
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-xl shrink-0">
                👋
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {getSaudacao()}{profileName ? `, ${profileName.split(" ")[0]}` : ""}!
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">
              Que bom te ver por aqui. 😊
            </p>
          </div>
        )}

        {(isLoading || isError || ocorrencias.length > 0) && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Ocorrências do Dia
            </h2>
            {!isLoading && !isError && ocorrencias.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Busca universal */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar prefixo, carro, tipo, motorista…"
                    className="w-56 sm:w-72 pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
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
                      ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-400"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  Agrupar por assunto
                </button>
                {/* Toggle visualização */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                  <button
                    onClick={() => { setViewMode("cards"); localStorage.setItem("home_viewMode", "cards"); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === "cards"
                        ? "bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-100"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Cards
                  </button>
                  <button
                    onClick={() => { setViewMode("list"); localStorage.setItem("home_viewMode", "list"); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === "list"
                        ? "bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-100"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            <p className="text-sm text-gray-600 dark:text-gray-400">Carregando…</p>
          ) : isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Falha ao carregar ocorrências do dia.
            </p>
          ) : ocorrencias.length > 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {search.trim()
                ? `${filteredOcorrencias.length} de ${ocorrencias.length} registro${ocorrencias.length !== 1 ? "s" : ""}`
                : `${ocorrencias.length} registro${ocorrencias.length !== 1 ? "s" : ""}`}
            </p>
          ) : null}
        </div>
        )}

        {isError ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Não foi possível carregar as ocorrências
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Verifique a conexão com a API e tente novamente.
            </p>
            <button
              onClick={() => refetch()}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white transition-colors font-medium"
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
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-10 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Ainda não registramos nada hoje
              </p>

              <div className="flex items-center justify-center gap-6 mb-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {weekTotal}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5">
                    Últimos 7 dias
                  </p>
                </div>
                <div className="w-px h-9 bg-gray-200 dark:bg-gray-800" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {weekAvg}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5">
                    Média por dia
                  </p>
                </div>
                <div className="w-px h-9 bg-gray-200 dark:bg-gray-800" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {weekActiveDays}/7
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5">
                    Dias com registro
                  </p>
                </div>
              </div>

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
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
            <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
              Nenhum resultado para “{search.trim()}”
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Tente outro prefixo, motorista, base ou tipo de ocorrência.
            </p>
            <button
              onClick={() => setSearch("")}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white transition-colors font-medium text-sm"
            >
              <X className="w-4 h-4" /> Limpar busca
            </button>
          </div>
        ) : grouped ? (
          /* ── Agrupado por assunto ─────────────────────────────────── */
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([subject, occs]) => (
              <SubjectGroup
                key={subject}
                subject={subject}
                occs={occs}
                viewMode={viewMode}
                isAdmin={isAdmin}
                collapsed={collapsedSubjects.has(subject)}
                onToggleCollapse={() => toggleSubjectCollapse(subject)}
                anyBatchRunning={anyBatchRunning}
                onRequestRegistrarTodas={(unregistered) => requestRegistrarTodas(subject, unregistered)}
                onRequestEnviarTratativas={(ids) => setBatchTratativaConfirm({ subject, ids })}
                onRequestRevisarTodas={(ids) => setBatchRevisarConfirm({ subject, ids })}
                registroBatch={{
                  running: batchState?.subject === subject,
                  cancelRequested: batchState?.cancelRequested ?? false,
                  doneCount: batchState?.doneCount ?? 0,
                  total: batchState?.ids.length ?? 0,
                  onCancel: cancelBatch,
                }}
                tratativaBatch={{
                  running: batchTratativaState?.subject === subject,
                  cancelRequested: batchTratativaState?.cancelRequested ?? false,
                  doneCount: batchTratativaState?.doneCount ?? 0,
                  total: batchTratativaState?.ids.length ?? 0,
                  onCancel: cancelBatchTratativa,
                }}
                revisarBatch={{
                  running: batchRevisarState?.subject === subject,
                  cancelRequested: batchRevisarState?.cancelRequested ?? false,
                  doneCount: batchRevisarState?.doneCount ?? 0,
                  total: batchRevisarState?.ids.length ?? 0,
                  onCancel: cancelBatchRevisar,
                }}
                vehicleOccurrenceCount={vehicleOccurrenceCount}
                onOpen={setPreviewId}
                onEditar={handleEditar}
                onExcluir={setExcluindoId}
                getDriveStatus={getDriveStatus}
                onSendToDrive={handleSendToDrive}
                getBatchOverlay={(occId) => getBatchOverlay(occId, subject)}
                getTratativaOverlay={(occId) => getTratativaOverlay(occId, subject)}
                getRevisarOverlay={(occId) => getRevisarOverlay(occId, subject)}
                relatoriosFolderId={automationFolders.config?.relatoriosFolderId}
                medidasFolderId={automationFolders.config?.medidasFolderId}
                onNeedFolderConfig={() => setShowAutomationFolderModal(true)}
              />
            ))}
          </div>
        ) : (
          /* ── Lista simples (sem agrupamento) ─────────────────────── */
          <OccurrenceCardsView
            occurrences={filteredOcorrencias}
            viewMode={viewMode}
            vehicleOccurrenceCount={vehicleOccurrenceCount}
            onOpen={setPreviewId}
            onEditar={handleEditar}
            onExcluir={setExcluindoId}
            getDriveStatus={getDriveStatus}
            onSendToDrive={handleSendToDrive}
            relatoriosFolderId={automationFolders.config?.relatoriosFolderId}
            medidasFolderId={automationFolders.config?.medidasFolderId}
            onNeedFolderConfig={() => setShowAutomationFolderModal(true)}
          />
        )}

        {/* ── Pódio de apuração (tempo real) ───────────────────────── */}
        {/* O ranking conta as apurações de TODOS os analistas, mesmo que a
            lista acima esteja filtrada para mostrar só as do usuário logado. */}
        {!isLoading && !isError && allOcorrencias.length > 0 && (
          <ApuracaoPodium occurrences={allOcorrencias} className="mt-16 w-full" />
        )}

        <OccurrencePreviewModal
          occurrenceId={previewId}
          open={!!previewId}
          onClose={() => setPreviewId(null)}
        />
      </main>
      </div>

      {/* Drawer de Edição */}
      {editando && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
              panelOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeDrawer}
          />
          <div
            className={`relative w-full max-w-6xl bg-white dark:bg-gray-950 h-full overflow-y-auto shadow-2xl transition-transform duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
              panelOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <NovaOcorrencia
              edicao={editando ?? undefined}
              onVoltar={closeDrawer}
              onSaved={(args) => {
                closeDrawer();
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
        <ConfirmActionModal
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          iconBg="bg-amber-50 dark:bg-amber-950/40"
          title="Enviar tratativas no RIZER?"
          confirmLabel="Confirmar"
          confirmClassName="bg-amber-500 hover:bg-amber-600"
          onCancel={() => setBatchTratativaConfirm(null)}
          onConfirm={() => {
            const { subject, ids } = batchTratativaConfirm;
            setBatchTratativaConfirm(null);
            startBatchTratativa(subject, ids);
          }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Você está prestes a preencher a tratativa de{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {batchTratativaConfirm.ids.length} ocorrência{batchTratativaConfirm.ids.length !== 1 ? "s" : ""}
            </span>{" "}
            do assunto:
          </p>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 rounded-lg px-3 py-2 mb-5">
            {batchTratativaConfirm.subject}
          </p>
        </ConfirmActionModal>
      )}

      {/* Modal de Confirmação do Batch de Revisão */}
      {batchRevisarConfirm && (
        <ConfirmActionModal
          icon={<RefreshCw className="w-5 h-5 text-emerald-500" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          title="Revisar todas no RIZER?"
          confirmLabel="Confirmar"
          confirmClassName="bg-emerald-500 hover:bg-emerald-600"
          onCancel={() => setBatchRevisarConfirm(null)}
          onConfirm={() => {
            const { subject, ids } = batchRevisarConfirm;
            setBatchRevisarConfirm(null);
            startBatchRevisar(subject, ids);
          }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Você está prestes a reabrir e reescrever todos os campos de{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {batchRevisarConfirm.ids.length} ocorrência{batchRevisarConfirm.ids.length !== 1 ? "s" : ""}
            </span>{" "}
            já enviada{batchRevisarConfirm.ids.length !== 1 ? "s" : ""} do assunto:
          </p>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-lg px-3 py-2 mb-5">
            {batchRevisarConfirm.subject}
          </p>
        </ConfirmActionModal>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {excluindoId && (
        <ConfirmActionModal
          title="Excluir ocorrência?"
          confirmLabel={excluindo ? "Excluindo..." : "Excluir"}
          confirmClassName="bg-red-600 hover:bg-red-700"
          confirmDisabled={excluindo}
          cancelDisabled={excluindo}
          onCancel={() => setExcluindoId(null)}
          onConfirm={handleConfirmarExclusao}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Essa ação não pode ser desfeita.
          </p>
        </ConfirmActionModal>
      )}

      {/* Dock flutuante global — progresso do agente */}
      <AgentProgressDock jobs={agentJobs} />
    </div>
  );
}
