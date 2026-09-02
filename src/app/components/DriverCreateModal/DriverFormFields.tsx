import { useId } from "react";
import { CircleAlert, IdCard, Phone, TriangleAlert, UserRound } from "lucide-react";
import { formatPhoneInputMask } from "../../../utils/whatsapp";
import { BaseSelect } from "./BaseSelect";
import {
  forceUpper,
  type DriverFormErrors,
  type DriverFormValues,
} from "./driverForm";

interface DriverFormFieldsProps {
  values: DriverFormValues;
  errors: DriverFormErrors;
  /** Só mostra mensagens de erro depois de uma tentativa de salvar / blur. */
  showErrors: boolean;
  onChange: (patch: Partial<DriverFormValues>) => void;
  onBlurField?: (field: keyof DriverFormValues) => void;
  disabled?: boolean;
  apiError?: string | null;
  autoFocusFirst?: boolean;
}

function fieldClass(invalid: boolean): string {
  return [
    "w-full h-11 rounded-xl border text-[15px] shadow-sm transition",
    "bg-white/70 dark:bg-white/5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400",
    "focus:outline-none",
    invalid
      ? "border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-500/25 focus:border-red-500"
      : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500",
    "disabled:opacity-60 disabled:cursor-not-allowed",
  ].join(" ");
}

function FieldError({ show, message }: { show: boolean; message?: string }) {
  if (!show || !message) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
      <CircleAlert className="w-3.5 h-3.5 shrink-0" />
      {message}
    </p>
  );
}

export function DriverFormFields({
  values,
  errors,
  showErrors,
  onChange,
  onBlurField,
  disabled,
  apiError,
  autoFocusFirst,
}: DriverFormFieldsProps) {
  const uid = useId();
  const codeId = `${uid}-code`;
  const baseId = `${uid}-base`;
  const nameId = `${uid}-name`;
  const phoneId = `${uid}-phone`;

  return (
    <div className="space-y-5">
      {/* Alerta de atenção — cadastro errado contamina relatórios, cobranças
          e o perfil disciplinar do motorista. */}
      <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-300">
          <TriangleAlert className="h-4 w-4" />
        </span>
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-semibold">Confira os dados com atenção.</p>
          <p className="mt-0.5 text-amber-700 dark:text-amber-300/90">
            A <span className="font-semibold">Base</span> define relatórios,
            cobranças de gestor e o perfil disciplinar. Selecione a base
            correta — dados errados são difíceis de rastrear depois.
          </p>
        </div>
      </div>

      {apiError ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{apiError}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
        {/* Matrícula */}
        <div className="space-y-1.5">
          <label
            htmlFor={codeId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Matrícula <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id={codeId}
              autoFocus={autoFocusFirst}
              value={values.code}
              onChange={(e) => onChange({ code: forceUpper(e.target.value) })}
              onBlur={() => onBlurField?.("code")}
              disabled={disabled}
              inputMode="numeric"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="Ex.: 4997"
              style={{ textTransform: "uppercase" }}
              className={`${fieldClass(showErrors && !!errors.code)} pl-9 pr-3`}
            />
          </div>
          <FieldError show={showErrors} message={errors.code} />
        </div>

        {/* Base */}
        <BaseSelect
          id={baseId}
          value={values.base}
          onChange={(base) => onChange({ base })}
          error={showErrors ? errors.base : undefined}
          disabled={disabled}
        />
      </div>

      {/* Nome */}
      <div className="space-y-1.5">
        <label
          htmlFor={nameId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Nome completo <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id={nameId}
            value={values.name}
            onChange={(e) => onChange({ name: forceUpper(e.target.value) })}
            onBlur={() => onBlurField?.("name")}
            disabled={disabled}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="Ex.: JEOVÁ BARBOSA"
            style={{ textTransform: "uppercase" }}
            className={`${fieldClass(showErrors && !!errors.name)} pl-9 pr-3`}
          />
        </div>
        <FieldError show={showErrors} message={errors.name} />
      </div>

      {/* Telefone */}
      <div className="space-y-1.5">
        <label
          htmlFor={phoneId}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Telefone / WhatsApp
          <span className="text-xs font-normal text-slate-400">(opcional)</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id={phoneId}
            value={values.phone}
            onChange={(e) =>
              onChange({ phone: formatPhoneInputMask(e.target.value) })
            }
            disabled={disabled}
            inputMode="tel"
            autoComplete="off"
            placeholder="(31) 99999-9999"
            className={`${fieldClass(false)} pl-9 pr-3`}
          />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Usado pelo botão “Notificar via WhatsApp” na preview da ocorrência.
        </p>
      </div>
    </div>
  );
}
