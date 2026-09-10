import { useRef } from "react";
import { ImagePlus, Loader2, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Checkbox } from "../../components/ui/checkbox";
import { BOARD_COLUMNS, getWorkflowStatusConfig } from "../../config/occurrenceWorkflow";
import { CoverAdjuster } from "./CoverAdjuster";
import type {
  CentralDensity,
  CentralShowKey,
  CentralView,
} from "./useCentralLayout";

type Props = {
  view: CentralView;
  density: CentralDensity;
  show: Record<CentralShowKey, boolean>;
  hiddenColumns: string[];
  /** URL da imagem de fundo compartilhada (ou null) */
  coverUrl: string | null;
  /** enquadramento vertical atual (%) */
  coverPosY: number;
  /** opacidade atual (0–1) */
  coverOpacity: number;
  /** zoom atual (0–1) */
  coverZoom: number;
  /** proporção (larg/alt) da faixa real da capa */
  coverBandAspect: number;
  /** só admin pode trocar/remover o plano de fundo */
  canEditCover: boolean;
  /** upload/remoção/ajuste em andamento */
  coverBusy: boolean;
  /** no header recolhido o gatilho vira só ícone, igual aos outros da nav */
  compact?: boolean;
  onView: (v: CentralView) => void;
  onDensity: (d: CentralDensity) => void;
  onToggleShow: (k: CentralShowKey) => void;
  onToggleColumn: (status: string) => void;
  onPickCover: (file: Blob) => void;
  onClearCover: () => void;
  onSaveCoverSettings: (patch: {
    posY: number;
    opacity: number;
    zoom: number;
  }) => void;
};

/** Reduz a imagem escolhida (máx. 1600px de largura, JPEG ~0.72) antes de
 *  subir pro servidor. */
async function fileToCoverBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxW = 1600;
  const scale = Math.min(1, maxW / bitmap.width);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob"))),
      "image/jpeg",
      0.72,
    );
  });
}

const VIEWS: { value: CentralView; label: string }[] = [
  { value: "kanban", label: "Kanban" },
  { value: "lista", label: "Lista" },
  { value: "tabela", label: "Tabela" },
];
const DENSITIES: { value: CentralDensity; label: string }[] = [
  { value: "compacta", label: "Compacta" },
  { value: "confortavel", label: "Confortável" },
  { value: "espacosa", label: "Espaçosa" },
];
const SHOW: { key: CentralShowKey; label: string }[] = [
  { key: "contagem", label: "Contagem" },
  { key: "datas", label: "Datas" },
  { key: "prioridade", label: "Prioridade" },
];

const label = "text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500";
const row = "flex items-center gap-2 py-1 text-sm text-gray-700 dark:text-gray-200";

export function PersonalizarLayoutPopover({
  view,
  density,
  show,
  hiddenColumns,
  coverUrl,
  coverPosY,
  coverOpacity,
  coverZoom,
  coverBandAspect,
  canEditCover,
  coverBusy,
  onView,
  onDensity,
  onToggleShow,
  onToggleColumn,
  onPickCover,
  onClearCover,
  onSaveCoverSettings,
  compact = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    try {
      onPickCover(await fileToCoverBlob(file));
    } catch {
      toast.error("Não foi possível processar a imagem.");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Um só botão: no modo recolhido o rótulo colapsa (max-width) e ele
            fica quadrado, igual aos outros ícones da nav — sem troca brusca. */}
        <button
          type="button"
          title="Personalizar layout"
          aria-label="Personalizar layout"
          className={`inline-flex cursor-pointer items-center rounded text-gray-400 transition-[background-color,color,gap,width,padding] duration-[320ms] ease-[cubic-bezier(0.33,1,0.68,1)] hover:bg-black/[0.04] hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300 ${
            compact ? "h-7 w-7 justify-center gap-0 px-0" : "gap-1.5 px-1 py-0.5"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" />
          <span
            className={`overflow-hidden whitespace-nowrap text-[13px] transition-[max-width,opacity] duration-[320ms] ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
              compact ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
            }`}
          >
            Personalizar layout
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="max-h-[75vh] w-[300px] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 p-3 shadow-sm dark:border-gray-800 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        <div className="space-y-4">
          <section className="space-y-1.5">
            <p className={label}>Visualização</p>
            <RadioGroup value={view} onValueChange={(v) => onView(v as CentralView)}>
              {VIEWS.map((v) => (
                <label key={v.value} className={`${row} cursor-pointer`}>
                  <RadioGroupItem value={v.value} />
                  {v.label}
                </label>
              ))}
            </RadioGroup>
          </section>

          <section className="space-y-1.5">
            <p className={label}>Densidade</p>
            <RadioGroup value={density} onValueChange={(v) => onDensity(v as CentralDensity)}>
              {DENSITIES.map((d) => (
                <label key={d.value} className={`${row} cursor-pointer`}>
                  <RadioGroupItem value={d.value} />
                  {d.label}
                </label>
              ))}
            </RadioGroup>
          </section>

          <section className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
            <p className={label}>Mostrar</p>
            {SHOW.map((s) => (
              <label key={s.key} className={`${row} cursor-pointer`}>
                <Checkbox checked={show[s.key]} onCheckedChange={() => onToggleShow(s.key)} />
                {s.label}
              </label>
            ))}
          </section>

          <section className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
            <p className={label}>Colunas</p>
            {BOARD_COLUMNS.map((code) => {
              const cfg = getWorkflowStatusConfig(code);
              return (
                <label key={code} className={`${row} cursor-pointer`}>
                  <Checkbox
                    checked={!hiddenColumns.includes(code)}
                    onCheckedChange={() => onToggleColumn(code)}
                  />
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </label>
              );
            })}
          </section>

          {canEditCover && (
            <section className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <p className={label}>Plano de fundo</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={coverBusy}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2 py-1.5 text-[13px] text-gray-600 transition-colors hover:bg-black/[0.03] disabled:cursor-default disabled:opacity-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                >
                  {coverBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  {coverUrl ? "Trocar imagem" : "Adicionar imagem"}
                </button>
                {coverUrl && (
                  <button
                    type="button"
                    disabled={coverBusy}
                    onClick={onClearCover}
                    title="Remover imagem"
                    aria-label="Remover imagem"
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-400 transition-colors hover:bg-black/[0.03] hover:text-gray-600 disabled:cursor-default disabled:opacity-50 dark:border-gray-800 dark:hover:bg-white/[0.05]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] leading-snug text-gray-400 dark:text-gray-500">
                Vale pra todos. Fica bem discreta atrás do título, sem atrapalhar
                a leitura.
              </p>
              {coverUrl && (
                <CoverAdjuster
                  url={coverUrl}
                  posY={coverPosY}
                  opacity={coverOpacity}
                  zoom={coverZoom}
                  bandAspect={coverBandAspect}
                  busy={coverBusy}
                  onSave={onSaveCoverSettings}
                />
              )}
            </section>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
