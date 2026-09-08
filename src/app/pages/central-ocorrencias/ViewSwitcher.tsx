import { ChevronDown, LayoutGrid, List, Table2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import type { CentralView } from "./useCentralLayout";

const OPTIONS: { value: CentralView; label: string; Icon: typeof LayoutGrid }[] = [
  { value: "kanban", label: "Quadro", Icon: LayoutGrid },
  { value: "lista", label: "Lista", Icon: List },
  { value: "tabela", label: "Tabela", Icon: Table2 },
];

type Props = {
  view: CentralView;
  onChange: (v: CentralView) => void;
};

/** Eyebrow do cabeçalho que também troca a visualização (Quadro/Lista/Tabela). */
export function ViewSwitcher({ view, onChange }: Props) {
  const current = OPTIONS.find((o) => o.value === view) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-600 data-[state=open]:bg-black/[0.04] data-[state=open]:text-gray-600 dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
        >
          <current.Icon className="h-3.5 w-3.5" />
          {current.label}
          <ChevronDown className="h-3 w-3 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => onChange(value)}
            className={value === view ? "text-blue-600 dark:text-blue-400" : ""}
          >
            <Icon className="h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
