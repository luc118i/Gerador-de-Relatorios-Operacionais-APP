import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ClipboardList, HelpCircle, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type {
  BoardFilters,
  OccurrenceDTO,
  Prioridade,
  WorkflowStatus,
} from "../../../domain/occurrences";
import { normalizeText } from "../../../utils/occurrenceVisibility";
import { getLocalDateString } from "../../../utils/dateUtils";
import { useAuth } from "../../context/AuthContext";
import {
  useCentralCover,
  useClearCentralCover,
  useSetCentralCover,
  useUpdateCentralCoverSettings,
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
  prevBoardStatus,
} from "../../config/occurrenceWorkflow";
import { ConfirmActionModal } from "../home/ConfirmActionModal";
import { QuickOccurrenceModal } from "./QuickOccurrenceModal";
import { ImportPassagemModal } from "./ImportPassagemModal";
import { CentralTutorial, hasSeenCentralTutorial } from "./CentralTutorial";
import { OccurrenceDetailPanel } from "./OccurrenceDetailPanel";
import { BoardColumn } from "./BoardColumn";
import { BoardFilters as BoardFiltersBar, emptyBoardFilters, type BoardUiFilters } from "./BoardFilters";
import { BoardIndicators, type IndicatorFilter } from "./BoardIndicators";
import { PersonalizarLayoutPopover } from "./PersonalizarLayoutPopover";
import { ViewSwitcher } from "./ViewSwitcher";
import { coverWidthFraction } from "./coverGeom";
import { BoardListView } from "./BoardListView";
import { BoardTableView } from "./BoardTableView";
import { useCentralLayout } from "./useCentralLayout";

interface Props {
  onVoltar: () => void;
  /** Abre o formulário de edição da ocorrência (com os dados dela). */
  onEditar: (id: string) => void;
  /** "Gerar relatório": abre o formulário LIMPO (igual criar pela Home) e ao
   *  salvar promove essa ocorrência → preview → volta pra Central. */
  onGerarRelatorio: (id: string) => void;
  /** Abre a Ficha Técnica da ocorrência (tela cheia). */
  onAbrirFicha: (id: string) => void;
}

const EMPTY_LIST: OccurrenceDTO[] = [];

// Período (De/Até) persistido no navegador — o quadro reabre no mesmo intervalo.
const PERIODO_KEY = "central_periodo_v1";
const isDateStr = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
function readPeriodo(): { from: string; to: string } | null {
  try {
    const p = JSON.parse(localStorage.getItem(PERIODO_KEY) ?? "null");
    return isDateStr(p?.from) && isDateStr(p?.to)
      ? { from: p.from, to: p.to }
      : null;
  } catch {
    return null;
  }
}

export function CentralOcorrenciasPage({
  onVoltar,
  onEditar,
  onGerarRelatorio,
  onAbrirFicha,
}: Props) {
  const queryClient = useQueryClient();
  const { profileName, user } = useAuth();
  const { layout, setView, setDensity, toggleShow, toggleColumn } = useCentralLayout();

  // A navegação vem de outra tela (Home) que pode estar rolada. Ao montar,
  // reseta a rolagem pro topo — o título "Central de Ocorrências" começa
  // sempre totalmente visível.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Header que condensa no scroll (uma vez, definitivo): ao passar do limiar
  // recolhe título + subtítulo + progresso + tiles, deixando só nav + filtros,
  // e fica assim até um novo carregamento. No kanban a rolagem do quadro
  // (painel próprio) também dispara — senão a página quase não rola.
  const headerRef = useRef<HTMLElement>(null);
  // Callback ref: o nó do quadro só existe depois que os dados carregam, então
  // guardamos no state pra reanexar o listener de scroll quando ele aparece.
  const [boardScrollEl, setBoardScrollEl] = useState<HTMLDivElement | null>(null);
  // Recolhe UMA vez, sem volta: passou o limiar, o header fica compacto até um
  // novo carregamento (F5). Rolar de volta ao topo não reexpande.
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    if (condensed) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const y = Math.max(window.scrollY, boardScrollEl?.scrollTop ?? 0);
      if (y > 120) setCondensed(true);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    boardScrollEl?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      boardScrollEl?.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [boardScrollEl, condensed]);

  // Altura real do header → CSS var, pra ancorar o quadro (e o cabeçalho das
  // colunas) exatamente abaixo dele, condensado ou não.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const root = document.documentElement;
    const set = () =>
      root.style.setProperty("--central-header-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--central-header-h");
    };
  }, []);

  // A transição de condensar/expandir (grid-rows) não dispara o ResizeObserver
  // em todos os frames — segue a altura por ~320ms pra a CSS var terminar
  // exatamente no valor final.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const root = document.documentElement;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      root.style.setProperty("--central-header-h", `${el.offsetHeight}px`);
      if (t - t0 < 320) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [condensed]);

  const { data: cover } = useCentralCover();
  const setCover = useSetCentralCover();
  const clearCover = useClearCentralCover();
  const updateCoverSettings = useUpdateCentralCoverSettings();
  const coverBusy =
    setCover.isPending || clearCover.isPending || updateCoverSettings.isPending;
  const coverPosY = cover?.posY ?? 50;
  const coverOpacity = cover?.opacity ?? 0.16;
  const coverZoom = cover?.zoom ?? 1;

  // Proporção real da faixa da capa — o mini editor usa isso pra mostrar uma
  // "janela" do tamanho exato do que aparece no cabeçalho.
  const coverBandRef = useRef<HTMLDivElement>(null);
  const [coverBandAspect, setCoverBandAspect] = useState(8);
  useEffect(() => {
    const el = coverBandRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setCoverBandAspect(r.width / r.height);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cover?.url]);

  // Proporção natural da imagem de fundo — pra calcular o "zoom" (quanto ela
  // preenche a faixa) sem depender só de object-fit.
  const [coverImgAspect, setCoverImgAspect] = useState<number | null>(null);
  useEffect(() => {
    if (!cover?.url) {
      setCoverImgAspect(null);
      return;
    }
    const im = new Image();
    im.onload = () =>
      setCoverImgAspect(
        im.naturalWidth && im.naturalHeight
          ? im.naturalWidth / im.naturalHeight
          : null,
      );
    im.src = cover.url;
  }, [cover?.url]);

  const coverBgSize = coverImgAspect
    ? `${coverWidthFraction(coverImgAspect / coverBandAspect, coverZoom) * 100}% auto`
    : "cover";

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

  const handleSaveCoverSettings = useCallback(
    (patch: { posY: number; opacity: number; zoom: number }) => {
      updateCoverSettings.mutate(
        { patch, actorNome: profileName || undefined },
        {
          onSuccess: () => toast.success("Capa ajustada."),
          onError: (e) =>
            toast.error(
              e instanceof Error && e.message
                ? `Não foi possível salvar o ajuste: ${e.message}`
                : "Não foi possível salvar o ajuste.",
            ),
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateCoverSettings.mutate, profileName],
  );

  // Tela diária: abre no período salvo no navegador (ou só hoje, na 1ª vez).
  // O intervalo De/Até é ajustável nos filtros e fica guardado a cada mudança.
  const [filters, setFilters] = useState<BoardUiFilters>(() => {
    const today = getLocalDateString(new Date());
    const saved = readPeriodo();
    return emptyBoardFilters(saved?.from ?? today, saved?.to ?? today);
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        PERIODO_KEY,
        JSON.stringify({ from: filters.from, to: filters.to }),
      );
    } catch {
      /* storage indisponível — segue sem persistir */
    }
  }, [filters.from, filters.to]);
  const [indicator, setIndicator] = useState<IndicatorFilter>({ kind: "all" });
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickInitialStatus, setQuickInitialStatus] = useState<WorkflowStatus | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
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

  // Ocorrência sem relatório ainda (stub da Central) abre o painel lateral;
  // com relatório abre a Ficha Técnica em tela cheia.
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Progresso do período (tratadas / total) — versão enxuta pro navbar recolhido.
  const progress = useMemo(() => {
    const total = visible.length;
    const done = visible.filter((o) => o.workflowStatus === "TRATADA").length;
    return {
      total,
      done,
      pct: total ? Math.round((done / total) * 100) : 0,
      allDone: total > 0 && done === total,
    };
  }, [visible]);

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

  const handleEditar = useCallback(
    (id: string) => {
      setSelectedId(null);
      onEditar(id);
    },
    [onEditar],
  );
  const handleGerarRelatorio = useCallback(
    (id: string) => {
      setSelectedId(null);
      onGerarRelatorio(id);
    },
    [onGerarRelatorio],
  );

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

  // Clicar num card: com relatório criado → Ficha Técnica (tela cheia);
  // stub da Central (ainda sem relatório) → painel lateral.
  const handleCardClick = useCallback(
    (o: OccurrenceDTO) => {
      setPendingMove(null);
      const temRelatorio =
        o.origin !== "CENTRAL" || !!o.driveWebViewLink || !!o.rizerRegistered;
      if (temRelatorio) onAbrirFicha(o.id);
      else setSelectedId(o.id);
    },
    [onAbrirFicha],
  );

  const onCardDragStart = useCallback((o: OccurrenceDTO) => {
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

  // Voltar 1 status no fluxo (nenhum dos anteriores pede confirmação).
  const onCardRegress = useCallback(
    (o: OccurrenceDTO) => {
      const to = prevBoardStatus(o.workflowStatus, layout.hiddenColumns);
      if (!to) return;
      applyMove(o.id, to);
    },
    [applyMove, layout.hiddenColumns],
  );

  const handleQuickAdd = useCallback((s: WorkflowStatus) => {
    setQuickInitialStatus(s);
    setQuickOpen(true);
  }, []);

  // Mini tutorial na primeira visita à Central.
  useEffect(() => {
    if (!hasSeenCentralTutorial()) setTutorialOpen(true);
  }, []);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header fixo único que condensa no scroll: nav + título + progresso +
          indicadores + filtros. Só o quadro/lista rola por baixo. */}
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b-[3px] border-blue-500 bg-gray-50 backdrop-blur dark:border-blue-500 dark:bg-gray-950"
      >
        <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6">
          {/* Plano de fundo do cabeçalho — bem discreto, com véu que garante
              a legibilidade do título por cima. Começa abaixo da linha de nav. */}
          {cover?.url && (
            <div
              ref={coverBandRef}
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 top-11 z-0 h-[168px] overflow-hidden transition-opacity duration-200 ${
                condensed ? "opacity-0" : "opacity-100"
              }`}
            >
              <div className="absolute inset-0" style={{ opacity: coverOpacity }}>
                <div
                  className="absolute inset-0 scale-[1.2]"
                  style={{
                    backgroundImage: `url("${cover.url}")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: `50% ${coverPosY}%`,
                    backgroundSize: "cover",
                    filter: "blur(24px)",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url("${cover.url}")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: `50% ${coverPosY}%`,
                    backgroundSize: coverBgSize,
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-gray-50/30 via-gray-50/70 to-gray-50 dark:from-gray-950/30 dark:via-gray-950/70 dark:to-gray-950" />
            </div>
          )}

          <div className="relative z-10">
          <div className="flex h-11 items-center gap-1">
          <button
            onClick={onVoltar}
            title="Voltar para o início"
            aria-label="Voltar para o início"
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-gray-200 pl-1.5 pr-2.5 text-[13px] font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
          <span className="mx-1.5 h-4 w-px bg-gray-200 dark:bg-gray-800" />
          <PersonalizarLayoutPopover
            view={layout.view}
            density={layout.density}
            show={layout.show}
            hiddenColumns={layout.hiddenColumns}
            coverUrl={cover?.url ?? null}
            coverPosY={coverPosY}
            coverOpacity={coverOpacity}
            coverZoom={coverZoom}
            coverBandAspect={coverBandAspect}
            canEditCover
            coverBusy={coverBusy}
            onView={setView}
            onDensity={setDensity}
            onToggleShow={toggleShow}
            onToggleColumn={toggleColumn}
            onPickCover={handlePickCover}
            onClearCover={handleClearCover}
            onSaveCoverSettings={handleSaveCoverSettings}
            compact={condensed}
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

          {/* Título compacto — aparece só quando o header condensa. */}
          <span
            className={`overflow-hidden whitespace-nowrap text-sm font-semibold text-gray-900 transition-all duration-200 dark:text-gray-100 ${
              condensed ? "ml-1 max-w-[280px] opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            Central de Ocorrências
          </span>

          {/* Progresso enxuto — só no header recolhido, bem discreto. */}
          {condensed && progress.total > 0 && (
            <span
              className="ml-2 flex shrink-0 items-center gap-1.5 animate-in fade-in duration-200"
              title={`${progress.done} de ${progress.total} tratadas`}
            >
              <span className="h-1 w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <span
                  className={`block h-full rounded-full ${
                    progress.allDone ? "bg-emerald-500" : "bg-emerald-500/70"
                  }`}
                  style={{ width: `${progress.pct}%` }}
                />
              </span>
              <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                {progress.allDone ? "tudo tratado" : `${progress.done}/${progress.total}`}
              </span>
            </span>
          )}

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setTutorialOpen(true)}
              title="Como usar a Central"
              aria-label="Como usar a Central"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
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

          {/* Bloco colapsável: identidade (título + progresso) + tiles.
              Recolhe com transição de altura quando o header condensa. */}
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
              condensed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <div className={`min-h-0 overflow-hidden ${condensed ? "pointer-events-none" : ""}`}>
              {/* Identidade da página — título + progresso. */}
              <div className="pt-3">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="" className="h-[18px] w-[18px] object-contain dark:hidden" />
                  <img
                    src="/favicon-dark.png"
                    alt=""
                    className="hidden h-[18px] w-[18px] object-contain dark:block"
                  />
                  <ViewSwitcher view={layout.view} onChange={setView} />
                </div>
                <h1 className="mt-1.5 text-[1.9rem] font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-50">
                  Central de Ocorrências
                </h1>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Central de acompanhamento e tratamento de ocorrências
                </p>
                <div className="mt-3 max-w-md">
                  <BoardIndicators
                    variant="progress"
                    occurrences={visible}
                    active={indicator}
                    onPick={setIndicator}
                  />
                </div>
              </div>

              {/* Tiles de indicadores. */}
              <div className="pt-3">
                <BoardIndicators
                  variant="tiles"
                  occurrences={visible}
                  active={indicator}
                  onPick={setIndicator}
                />
              </div>
            </div>
          </div>

          {/* Filtros — sempre visíveis, mesmo com o header condensado. */}
          <div className="pb-3 pt-3">
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
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <div className="pb-4 pt-3">

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
          /* Quadro = painel preso à viewport, logo abaixo do header. Ele
             (não a página) rola, então o cabeçalho das colunas fica sempre
             visível e o header condensa conforme o quadro é percorrido. */
          <div
            className="fixed inset-x-0 z-10"
            style={{ top: "var(--central-header-h, 0px)", bottom: 0 }}
          >
            <div
              ref={setBoardScrollEl}
              className="board-col-scroll h-full overflow-auto overscroll-contain"
            >
            <div className="mx-auto flex min-h-full max-w-[1600px] gap-5 px-4 pb-4 sm:px-6">
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
                onCardRegress={onCardRegress}
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
            </div>
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
          if (opts?.openReport) handleGerarRelatorio(id);
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

      <CentralTutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      <OccurrenceDetailPanel
        occurrence={selected}
        open={!!selected}
        onClose={() => setSelectedId(null)}
        onEdit={handleEditar}
        onGerarRelatorio={handleGerarRelatorio}
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
