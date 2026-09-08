import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ClipboardList, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type {
  BoardFilters,
  OccurrenceDTO,
  Prioridade,
  WorkflowStatus,
} from "../../../domain/occurrences";
import { occurrencesApi } from "../../../api/occurrences.api";
import { dtoToOcorrencia } from "../../../utils/occurrenceMapper";
import { normalizeText } from "../../../utils/occurrenceVisibility";
import { getLocalDateString } from "../../../utils/dateUtils";
import { useAuth } from "../../context/AuthContext";
import { useAdminAuth } from "../../context/AdminAuthContext";
import {
  useCentralCover,
  useClearCentralCover,
  useSetCentralCover,
} from "../../../features/central/centralCover.queries";
import {
  useBoardOccurrences,
  usePatchStatus,
} from "../../../features/occurrences/queries/occurrences.queries";
import { occurrencesKeys } from "../../../features/occurrences/queries/occurrences.keys";
import {
  BOARD_COLUMNS,
  STATUS_NEEDS_CONFIRM,
  getWorkflowStatusConfig,
  nextBoardStatus,
} from "../../config/occurrenceWorkflow";
import type { Ocorrencia } from "../../types";
import { NovaOcorrencia } from "../nova-ocorrencia";
import { ConfirmActionModal } from "../home/ConfirmActionModal";
import { QuickOccurrenceModal } from "./QuickOccurrenceModal";
import { ImportPassagemModal } from "./ImportPassagemModal";
import { BoardColumn } from "./BoardColumn";
import { BoardFilters as BoardFiltersBar, emptyBoardFilters, type BoardUiFilters } from "./BoardFilters";
import { BoardIndicators, type IndicatorFilter } from "./BoardIndicators";
import { OccurrenceDetailPanel } from "./OccurrenceDetailPanel";
import { PersonalizarLayoutPopover } from "./PersonalizarLayoutPopover";
import { BoardListView } from "./BoardListView";
import { BoardTableView } from "./BoardTableView";
import { useCentralLayout } from "./useCentralLayout";

interface Props {
  onVoltar: () => void;
}

const EMPTY_LIST: OccurrenceDTO[] = [];

export function CentralOcorrenciasPage({ onVoltar }: Props) {
  const queryClient = useQueryClient();
  const { profileName, user } = useAuth();
  const { layout, setView, setDensity, toggleShow, toggleColumn } = useCentralLayout();

  const { isAdmin } = useAdminAuth();
  const { data: cover } = useCentralCover();
  const setCover = useSetCentralCover();
  const clearCover = useClearCentralCover();
  const coverBusy = setCover.isPending || clearCover.isPending;

  const handlePickCover = useCallback(
    (file: Blob) => {
      setCover.mutate(
        { file, actorNome: profileName || undefined },
        {
          onSuccess: () => toast.success("Plano de fundo atualizado."),
          onError: () => toast.error("Não foi possível salvar a imagem."),
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setCover.mutate, profileName],
  );

  const handleClearCover = useCallback(() => {
    clearCover.mutate(profileName || undefined, {
      onSuccess: () => toast.success("Plano de fundo removido."),
      onError: () => toast.error("Não foi possível remover a imagem."),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearCover.mutate, profileName]);

  // Tela diária: por padrão carrega só o dia de hoje. O período é ajustável
  // nos filtros (De / Até) pra puxar dias anteriores quando precisar.
  const [filters, setFilters] = useState<BoardUiFilters>(() => {
    const today = getLocalDateString(new Date());
    return emptyBoardFilters(today, today);
  });
  const [indicator, setIndicator] = useState<IndicatorFilter>({ kind: "all" });
  // Guarda só o id — o objeto do painel é sempre derivado da lista viva, pra
  // refletir na hora mudanças feitas pelo próprio painel (status, prioridade).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editando, setEditando] = useState<Ocorrencia | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickInitialStatus, setQuickInitialStatus] = useState<WorkflowStatus | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ id: string; to: WorkflowStatus } | null>(null);

  // ── Drag-and-drop nativo (HTML5) — sem react-dnd ─────────────────────────
  const [drag, setDrag] = useState<{ id: string; from: WorkflowStatus } | null>(null);
  const dragRef = useRef<{ id: string; from: WorkflowStatus } | null>(null);
  dragRef.current = drag;
  // destino escolhido no `drop` — só é efetivado no `dragend` (uma vez só,
  // depois que o navegador limpa a imagem-fantasma do arrasto).
  const pendingDropRef = useRef<{ id: string; to: WorkflowStatus } | null>(null);
  const [overStatus, setOverStatus] = useState<WorkflowStatus | null>(null);

  const patchStatus = usePatchStatus();

  // Só o período vai ao servidor; o resto é filtrado em memória sobre a
  // janela retornada (volume da Fase 1 comporta).
  const apiFilters: BoardFilters = useMemo(
    () => ({ from: filters.from, to: filters.to }),
    [filters.from, filters.to],
  );
  const { data, isLoading, isError, refetch, isFetching } = useBoardOccurrences(apiFilters);

  // Objeto do painel de detalhe — sempre a versão atual da lista.
  const selected = useMemo(
    () => (selectedId ? (data ?? []).find((o) => o.id === selectedId) ?? null : null),
    [data, selectedId],
  );

  const actor = useMemo(
    () => ({ actorUserId: user?.id ?? null, actorNome: profileName || null }),
    [user?.id, profileName],
  );

  // A Central é compartilhada: todo usuário vê todas as ocorrências do
  // período (diferente da Home, que filtra por analista). Sem gating de admin.
  const visible = data ?? EMPTY_LIST;

  // Filtros locais (tudo menos o período).
  const filtered = useMemo(() => {
    const q = normalizeText(filters.search);
    const terms = q ? q.split(/\s+/).filter(Boolean) : [];
    const prioSet = new Set<Prioridade>(filters.prioridades);

    return visible.filter((o) => {
      if (prioSet.size && !prioSet.has((o.prioridade ?? "MEDIA") as Prioridade)) return false;
      if (filters.hasReport) {
        const has = !!o.driveWebViewLink || !!o.rizerRegistered;
        if (filters.hasReport === "true" && !has) return false;
        if (filters.hasReport === "false" && has) return false;
      }
      if (indicator.kind === "status" && o.workflowStatus !== indicator.status) return false;
      if (
        indicator.kind === "priority" &&
        !indicator.priorities.includes((o.prioridade ?? "MEDIA") as Prioridade)
      )
        return false;
      if (terms.length) {
        const hay = normalizeText(
          [
            o.vehicleNumber,
            o.lineLabel ?? "",
            o.tripLineName ?? "",
            o.typeTitle ?? "",
            o.reportTitle ?? "",
            o.occurrenceName ?? "",
            o.place ?? "",
            o.baseCode ?? "",
            o.analisadoPor ?? "",
            o.id,
            ...(o.drivers ?? []).flatMap((d) => [d.registry, d.name, d.baseCode]),
          ].join(" "),
        );
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [visible, filters, indicator]);

  const byStatus = useMemo(() => {
    const map = new Map<string, OccurrenceDTO[]>();
    for (const s of BOARD_COLUMNS) map.set(s, []);
    for (const o of filtered) {
      const s = o.workflowStatus ?? "PENDENTE";
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(o);
    }
    return map;
  }, [filtered]);

  async function handleEditar(id: string) {
    try {
      const [full, signed] = await Promise.all([
        occurrencesApi.getOccurrenceById(id),
        occurrencesApi.getEvidenceSignedUrls(id).catch(() => []),
      ]);
      setSelectedId(null);
      setEditando(dtoToOcorrencia(full as any, signed));
    } catch {
      toast.error("Erro ao carregar ocorrência.");
    }
  }

  function afterSave() {
    setEditando(null);
    queryClient.invalidateQueries({ queryKey: occurrencesKeys.all });
    toast.success("Ocorrência salva.");
  }

  // id da última ocorrência movida — dispara a animação de entrada no card
  // quando ele remonta na coluna nova.
  const [movedId, setMovedId] = useState<string | null>(null);
  const movedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyMove = useCallback(
    (id: string, to: WorkflowStatus) => {
      setMovedId(id);
      if (movedTimer.current) clearTimeout(movedTimer.current);
      movedTimer.current = setTimeout(
        () => setMovedId((cur) => (cur === id ? null : cur)),
        450,
      );
      // toasts + rollback ficam no hook (atualização otimista)
      patchStatus.mutate({ id, status: to, actor });
    },
    [patchStatus, actor],
  );

  // Clicar num card pra ver detalhe: abre o painel e descarta qualquer
  // confirmação de mudança de status pendente (evita os dois na tela juntos).
  const handleCardClick = useCallback((o: OccurrenceDTO) => {
    setPendingMove(null);
    setSelectedId(o.id);
  }, []);

  const onCardDragStart = useCallback((o: OccurrenceDTO) => {
    // começar a arrastar não é "inspecionar" — fecha o painel de detalhe.
    pendingDropRef.current = null;
    setSelectedId(null);
    setDrag({ id: o.id, from: (o.workflowStatus ?? "PENDENTE") as WorkflowStatus });
  }, []);

  // `dragend` fecha o gesto — dispara exatamente uma vez por arrasto, já depois
  // do `drop`. É aqui (e não dentro do `drop`) que abrimos a confirmação /
  // aplicamos o move, pra não competir com a limpeza do arrasto e pra não
  // arriscar disparo duplo.
  const onCardDragEnd = useCallback(() => {
    setDrag(null);
    setOverStatus(null);
    const move = pendingDropRef.current;
    pendingDropRef.current = null;
    if (!move) return;
    if (STATUS_NEEDS_CONFIRM.includes(move.to)) setPendingMove(move);
    else applyMove(move.id, move.to);
  }, [applyMove]);

  const onHover = useCallback((s: WorkflowStatus | null) => {
    setOverStatus((prev) => (prev === s ? prev : s));
  }, []);

  const onDropHere = useCallback((to: WorkflowStatus) => {
    const item = dragRef.current;
    setOverStatus(null);
    if (!item || item.from === to) {
      pendingDropRef.current = null;
      return;
    }
    // só registra o destino — o `dragend` efetiva (uma vez, sem competir com a
    // limpeza da imagem-fantasma do arrasto).
    pendingDropRef.current = { id: item.id, to };
  }, []);

  const onCardAdvance = useCallback(
    (o: OccurrenceDTO) => {
      const to = nextBoardStatus(o.workflowStatus, layout.hiddenColumns);
      if (!to) return;
      if (STATUS_NEEDS_CONFIRM.includes(to)) setPendingMove({ id: o.id, to });
      else applyMove(o.id, to);
    },
    [applyMove, layout.hiddenColumns],
  );

  const handleQuickAdd = useCallback((s: WorkflowStatus) => {
    setQuickInitialStatus(s);
    setQuickOpen(true);
  }, []);

  if (editando) {
    return (
      <NovaOcorrencia
        edicao={editando}
        onVoltar={() => setEditando(null)}
        onSaved={afterSave}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Faixa de controles — baixa, integrada à página */}
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-gray-50/95 dark:border-gray-900 dark:bg-gray-950/95 backdrop-blur">
        <div className="mx-auto flex h-11 max-w-[1600px] items-center gap-1 px-3 sm:px-5">
          <button
            onClick={onVoltar}
            title="Voltar"
            aria-label="Voltar"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-800" />
          <PersonalizarLayoutPopover
            view={layout.view}
            density={layout.density}
            show={layout.show}
            hiddenColumns={layout.hiddenColumns}
            coverUrl={cover?.url ?? null}
            canEditCover={isAdmin}
            coverBusy={coverBusy}
            onView={setView}
            onDensity={setDensity}
            onToggleShow={toggleShow}
            onToggleColumn={toggleColumn}
            onPickCover={handlePickCover}
            onClearCover={handleClearCover}
          />
          {layout.hiddenColumns.length > 0 && layout.view !== "tabela" && (
            <button
              onClick={() => layout.hiddenColumns.forEach(toggleColumn)}
              title="Mostrar todas as colunas"
              className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-600 dark:hover:bg-white/[0.06]"
            >
              {layout.hiddenColumns.length} oculta{layout.hiddenColumns.length !== 1 ? "s" : ""}
            </button>
          )}

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => refetch()}
              title="Atualizar"
              aria-label="Atualizar"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-[13px] text-gray-500 transition-colors hover:bg-black/[0.04] hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Importar passagem
            </button>
            <button
              onClick={() => {
                setQuickInitialStatus(undefined);
                setQuickOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova ocorrência
            </button>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6">
        {/* Plano de fundo do cabeçalho — bem discreto, com véu que garante a
            legibilidade do título por cima. */}
        {cover?.url && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[168px] overflow-hidden"
          >
            <img
              src={cover.url}
              alt=""
              className="h-full w-full object-cover opacity-[0.16] dark:opacity-[0.12]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50/30 via-gray-50/70 to-gray-50 dark:from-gray-950/30 dark:via-gray-950/70 dark:to-gray-950" />
          </div>
        )}

        {/* Bloco de identidade — tratamento de título de página */}
        <div className="relative z-10 pb-3 pt-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-[18px] w-[18px] object-contain dark:hidden" />
            <img
              src="/favicon-dark.png"
              alt=""
              className="hidden h-[18px] w-[18px] object-contain dark:block"
            />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Quadro
            </span>
          </div>
          <h1 className="mt-1.5 text-[1.9rem] font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-50">
            Central de Ocorrências
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Central de acompanhamento e tratamento de ocorrências
          </p>
        </div>

        <div className="relative z-10">
          <BoardIndicators occurrences={visible} active={indicator} onPick={setIndicator} />
        </div>
        <div className="relative z-10 mt-3">
          <BoardFiltersBar
            value={filters}
            onChange={setFilters}
            onReset={() => {
              setFilters(emptyBoardFilters(filters.from, filters.to));
              setIndicator({ kind: "all" });
            }}
            resultCount={filtered.length}
          />
        </div>
        <div className="pb-4 pt-4">

        {isError ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Não foi possível carregar o quadro.
            </p>
            <button
              onClick={() => refetch()}
              className="cursor-pointer px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white text-sm font-medium transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando quadro…</p>
        ) : layout.view === "lista" ? (
          <BoardListView
            occurrences={filtered}
            layout={layout}
            actor={actor}
            onOpen={handleCardClick}
            onEdit={handleEditar}
          />
        ) : layout.view === "tabela" ? (
          <BoardTableView
            occurrences={filtered}
            layout={layout}
            actor={actor}
            onOpen={handleCardClick}
            onEdit={handleEditar}
          />
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-4">
            {BOARD_COLUMNS.filter((s) => !layout.hiddenColumns.includes(s)).map((s) => (
              <BoardColumn
                key={s}
                status={s}
                occurrences={byStatus.get(s) ?? []}
                layout={layout}
                actor={actor}
                onCardClick={handleCardClick}
                onCardEdit={handleEditar}
                onCardDragStart={onCardDragStart}
                onCardDragEnd={onCardDragEnd}
                onCardAdvance={onCardAdvance}
                onQuickAdd={handleQuickAdd}
                onHide={toggleColumn}
                onHover={onHover}
                onDropHere={onDropHere}
                dragFrom={drag?.from ?? null}
                draggingId={drag?.id ?? null}
                justMovedId={movedId}
                over={overStatus === s}
              />
            ))}
          </div>
        )}
        </div>
      </div>

      <QuickOccurrenceModal
        open={quickOpen}
        initialStatus={quickInitialStatus}
        onClose={() => setQuickOpen(false)}
        onCreated={(id, opts) => {
          queryClient.invalidateQueries({ queryKey: occurrencesKeys.all });
          if (opts?.openReport) handleEditar(id);
        }}
      />

      <ImportPassagemModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(eventDate) => {
          queryClient.invalidateQueries({ queryKey: occurrencesKeys.all });
          // pula o filtro pra data importada, senão os cards ficam fora da janela
          setFilters((f) => ({ ...f, from: eventDate, to: eventDate }));
          setIndicator({ kind: "all" });
        }}
      />

      <OccurrenceDetailPanel
        occurrence={selected}
        open={!!selected}
        onClose={() => setSelectedId(null)}
        onEdit={handleEditar}
        actor={actor}
      />

      {pendingMove && (
        <ConfirmActionModal
          title="Confirmar mudança de status"
          confirmLabel={`Mover para ${getWorkflowStatusConfig(pendingMove.to).label}`}
          confirmClassName="bg-emerald-600 hover:bg-emerald-700"
          onCancel={() => setPendingMove(null)}
          onConfirm={() => {
            applyMove(pendingMove.id, pendingMove.to);
            setPendingMove(null);
          }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {pendingMove.to === "TRATADA"
              ? "Tem certeza que deseja marcar esta ocorrência como tratada? A mudança fica registrada no histórico."
              : "Tem certeza que deseja mover esta ocorrência? A mudança fica registrada no histórico."}
          </p>
        </ConfirmActionModal>
      )}
    </div>
  );
}
