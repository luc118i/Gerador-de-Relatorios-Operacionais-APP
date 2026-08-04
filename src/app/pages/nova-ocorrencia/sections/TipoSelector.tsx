import { Check } from "lucide-react";
import { OCCURRENCE_TYPES } from "../../../config/occurrenceTypes";

interface TipoSelectorProps {
  value: string;
  onChange: (code: string) => void;
}

export function TipoSelector({ value, onChange }: TipoSelectorProps) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Tipo de Ocorrência
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Selecione o tipo antes de preencher os dados — o formulário se adapta automaticamente.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {OCCURRENCE_TYPES.map((t) => {
          const selected = value === t.code;
          return (
            <button
              key={t.code}
              type="button"
              onClick={() => onChange(t.code)}
              className={`cursor-pointer flex flex-col items-start gap-1 p-4 rounded-lg border-2 text-left w-full transition-all duration-200 ${
                selected
                  ? t.isGeneric
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 shadow-sm"
                    : t.code === "EXCESSO_VELOCIDADE"
                      ? "border-red-500 bg-red-50 dark:bg-red-950/40 shadow-sm"
                      : t.code === "EXCESSO_PERMANENCIA"
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow-sm"
                        : "border-blue-600 bg-blue-50 dark:bg-blue-950/40 shadow-sm"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <span
                className={`text-sm font-semibold leading-tight ${
                  selected
                    ? t.isGeneric
                      ? "text-orange-700 dark:text-orange-400"
                      : t.code === "EXCESSO_VELOCIDADE"
                        ? "text-red-700 dark:text-red-400"
                        : t.code === "EXCESSO_PERMANENCIA"
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-blue-700 dark:text-blue-400"
                    : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {t.title}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                {t.description}
              </span>
              {selected && (
                <span
                  className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${
                    t.isGeneric
                      ? "text-orange-600 dark:text-orange-400"
                      : t.code === "EXCESSO_VELOCIDADE"
                        ? "text-red-600 dark:text-red-400"
                        : t.code === "EXCESSO_PERMANENCIA"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  <Check className="w-3 h-3" />
                  Selecionado
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
