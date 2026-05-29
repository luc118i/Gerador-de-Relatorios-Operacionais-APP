import { UserCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

export type TratativaValue = "SUSPEICAO" | "ADVERTENCIA" | "VALE" | "REGISTRO";

const TRATATIVA_OPTIONS: {
  value: TratativaValue;
  label: string;
  description: string;
  dot: string;
  badge: string;
}[] = [
  {
    value: "SUSPEICAO",
    label: "Suspeição",
    description: "Em investigação — aguardando confirmação",
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  {
    value: "ADVERTENCIA",
    label: "Advertência",
    description: "Medida disciplinar registrada formalmente",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  {
    value: "VALE",
    label: "Vale",
    description: "Desconto aplicado na folha",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border border-red-200",
  },
  {
    value: "REGISTRO",
    label: "Só o Registro",
    description: "Documentado, sem medida disciplinar",
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
  },
];

interface SecaoTratativaProps {
  tratativa: TratativaValue | null;
  onTratativaChange: (v: TratativaValue | null) => void;
  analisadoPor: string;
  onAnalisadoPorChange: (v: string) => void;
}

export function SecaoTratativa({
  tratativa,
  onTratativaChange,
  analisadoPor,
  onAnalisadoPorChange,
}: SecaoTratativaProps) {
  const selected = TRATATIVA_OPTIONS.find((o) => o.value === tratativa) ?? null;
  const inputBase =
    "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <section className="animate-in fade-in slide-in-from-top-2 duration-300">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        Análise e Tratativa
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Dropdown de tratativa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tratativa
          </label>
          <Select
            value={tratativa ?? "__none__"}
            onValueChange={(v) =>
              onTratativaChange(v === "__none__" ? null : (v as TratativaValue))
            }
          >
            <SelectTrigger className="w-full">
              {selected ? (
                <span className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${selected.dot}`} />
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selected.badge}`}
                  >
                    {selected.label}
                  </span>
                </span>
              ) : (
                <SelectValue placeholder="Sem tratativa definida" />
              )}
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="__none__">
                <span className="flex items-center gap-2 text-gray-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
                  Sem tratativa definida
                </span>
              </SelectItem>

              {TRATATIVA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2.5 py-0.5">
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                    <span className="flex flex-col">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${opt.badge}`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-gray-400 mt-0.5 pl-0.5">
                        {opt.description}
                      </span>
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input de analista */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Analista responsável
          </label>
          <div className="relative">
            <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={analisadoPor}
              onChange={(e) => onAnalisadoPorChange(e.target.value)}
              placeholder="Nome de quem fez a análise"
              className={`${inputBase} pl-9`}
              data-form-nav
            />
          </div>
        </div>
      </div>
    </section>
  );
}
