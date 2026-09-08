import { useRef } from "react";
import { ImagePlus, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Checkbox } from "../../components/ui/checkbox";
import { BOARD_COLUMNS, getWorkflowStatusConfig } from "../../config/occurrenceWorkflow";
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
  coverImage: string | null;
  onView: (v: CentralView) => void;
  onDensity: (d: CentralDensity) => void;
  onToggleShow: (k: CentralShowKey) => void;
  onToggleColumn: (status: string) => void;
  onSetCover: (dataUrl: string | null) => void;
};

/** Reduz a imagem escolhida (máx. 1600px de largura, JPEG ~0.72) para caber
 *  no localStorage sem estourar a cota. */
async function fileToCoverDataUrl(file: File): Promise<string> {
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
  return canvas.toDataURL("image/jpeg", 0.72);
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
  { key: "descricao", label: "Descrição" },
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
  coverImage,
  onView,
  onDensity,
  onToggleShow,
  onToggleColumn,
  onSetCover,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    try {
      const dataUrl = await fileToCoverDataUrl(file);
      if (dataUrl.length > 3_000_000) {
        toast.error("Imagem muito grande. Tente uma com menos detalhes.");
        return;
      }
      onSetCover(dataUrl);
      toast.success("Plano de fundo atualizado.");
    } catch {
      toast.error("Não foi possível carregar a imagem.");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-[13px] text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Personalizar layout
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[300px] rounded-lg border border-gray-200 p-3 shadow-sm dark:border-gray-800 animate-in fade-in-0 zoom-in-95 duration-150"
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
                onClick={() => fileRef.current?.click()}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2 py-1.5 text-[13px] text-gray-600 transition-colors hover:bg-black/[0.03] dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {coverImage ? "Trocar imagem" : "Adicionar imagem"}
              </button>
              {coverImage && (
                <button
                  type="button"
                  onClick={() => onSetCover(null)}
                  title="Remover imagem"
                  aria-label="Remover imagem"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-400 transition-colors hover:bg-black/[0.03] hover:text-gray-600 dark:border-gray-800 dark:hover:bg-white/[0.05]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] leading-snug text-gray-400 dark:text-gray-500">
              Fica bem discreta atrás do título, sem atrapalhar a leitura.
            </p>
          </section>
        </div>
      </PopoverContent>
    </Popover>
  );
}
