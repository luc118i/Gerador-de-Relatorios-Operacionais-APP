import { useCallback, useState } from "react";

export type CentralView = "kanban" | "lista" | "tabela";
export type CentralDensity = "compacta" | "confortavel" | "espacosa";
export type CentralShowKey = "contagem" | "descricao" | "datas" | "prioridade";

export type CentralLayout = {
  view: CentralView;
  density: CentralDensity;
  show: Record<CentralShowKey, boolean>;
  /** códigos de status (colunas) ocultos no quadro / na lista */
  hiddenColumns: string[];
};

const STORAGE_KEY = "central_layout_v1";

const DEFAULT_LAYOUT: CentralLayout = {
  view: "kanban",
  density: "confortavel",
  show: { contagem: true, descricao: true, datas: true, prioridade: true },
  hiddenColumns: [],
};

function read(): CentralLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const p = JSON.parse(raw) as Partial<CentralLayout>;
    return {
      view: p.view ?? DEFAULT_LAYOUT.view,
      density: p.density ?? DEFAULT_LAYOUT.density,
      show: { ...DEFAULT_LAYOUT.show, ...(p.show ?? {}) },
      hiddenColumns: Array.isArray(p.hiddenColumns) ? p.hiddenColumns : [],
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function write(l: CentralLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(l));
  } catch {
    /* storage indisponível — segue sem persistir */
  }
}

/** Preferências de layout do quadro (visão, densidade, campos), persistidas
 *  por navegador. */
export function useCentralLayout() {
  const [layout, setLayout] = useState<CentralLayout>(read);

  const update = useCallback((patch: (l: CentralLayout) => CentralLayout) => {
    setLayout((prev) => {
      const next = patch(prev);
      write(next);
      return next;
    });
  }, []);

  const setView = useCallback(
    (view: CentralView) => update((l) => ({ ...l, view })),
    [update],
  );
  const setDensity = useCallback(
    (density: CentralDensity) => update((l) => ({ ...l, density })),
    [update],
  );
  const toggleShow = useCallback(
    (key: CentralShowKey) =>
      update((l) => ({ ...l, show: { ...l.show, [key]: !l.show[key] } })),
    [update],
  );
  const toggleColumn = useCallback(
    (status: string) =>
      update((l) => ({
        ...l,
        hiddenColumns: l.hiddenColumns.includes(status)
          ? l.hiddenColumns.filter((s) => s !== status)
          : [...l.hiddenColumns, status],
      })),
    [update],
  );
  return { layout, setView, setDensity, toggleShow, toggleColumn };
}

// ── Mapas de densidade (classes Tailwind) ────────────────────────────────

export const DENSITY_CARD_PADDING: Record<CentralDensity, string> = {
  compacta: "p-2.5",
  confortavel: "p-3",
  espacosa: "p-3.5",
};

export const DENSITY_CARD_GAP: Record<CentralDensity, string> = {
  compacta: "space-y-1.5",
  confortavel: "space-y-2",
  espacosa: "space-y-3",
};

export const DENSITY_ROW_PADDING: Record<CentralDensity, string> = {
  compacta: "py-1.5",
  confortavel: "py-2.5",
  espacosa: "py-3.5",
};
