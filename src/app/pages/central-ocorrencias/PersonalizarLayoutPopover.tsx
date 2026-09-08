import { SlidersHorizontal } from "lucide-react";
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
  onView: (v: CentralView) => void;
  onDensity: (d: CentralDensity) => void;
  onToggleShow: (k: CentralShowKey) => void;
  onToggleColumn: (status: string) => void;
};

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
  onView,
  onDensity,
  onToggleShow,
  onToggleColumn,
}: Props) {
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
