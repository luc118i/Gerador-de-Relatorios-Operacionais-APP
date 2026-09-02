import type { Driver } from "../../../domain/drivers";
import type { BaseOption } from "../../../features/occurrences/queries/bases.queries";
import { isRegisteredBase } from "../../../features/occurrences/queries/bases.queries";

export type DriverFormValues = {
  code: string;
  name: string;
  base: string | null;
  phone: string;
};

export type DriverFormField = keyof DriverFormValues;
export type DriverFormErrors = Partial<
  Record<"code" | "name" | "base", string>
>;

export function emptyDriverForm(): DriverFormValues {
  return { code: "", name: "", base: null, phone: "" };
}

export function driverToForm(d: Driver): DriverFormValues {
  return {
    code: d.code ?? "",
    name: d.name ?? "",
    base: d.base ?? null,
    phone: d.phone ?? "",
  };
}

/** Campos cadastrais que seguem o padrão de caixa-alta do sistema. */
export function forceUpper(value: string): string {
  return value.toUpperCase();
}

/**
 * Validação única compartilhada por criação e edição. A regra da base não é só
 * visual: um motorista nunca pode ser salvo com uma base fora do cadastro
 * oficial (base-responsaveis). Base vazia continua sendo permitida.
 */
export function validateDriverForm(
  values: DriverFormValues,
  baseOptions: BaseOption[],
): DriverFormErrors {
  const errors: DriverFormErrors = {};

  if (!values.code.trim()) errors.code = "Informe a matrícula.";
  if (!values.name.trim()) errors.name = "Informe o nome do motorista.";

  if (values.base && !isRegisteredBase(values.base, baseOptions)) {
    errors.base = "Selecione uma base cadastrada no sistema.";
  }

  return errors;
}

export function hasErrors(errors: DriverFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Normaliza o formulário para o payload da API (trim + null nos opcionais). */
export function driverFormToPayload(values: DriverFormValues): {
  code: string;
  name: string;
  base: string | null;
  phone: string | null;
} {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    base: values.base && values.base.trim() ? values.base.trim() : null,
    phone: values.phone.trim() ? values.phone.trim() : null,
  };
}

/** Diff parcial para o PATCH de edição — só envia os campos que mudaram. */
export function driverFormDiff(
  values: DriverFormValues,
  original: Driver,
): { code?: string; name?: string; base?: string | null; phone?: string | null } {
  const next = driverFormToPayload(values);
  const patch: {
    code?: string;
    name?: string;
    base?: string | null;
    phone?: string | null;
  } = {};

  if (next.code !== original.code) patch.code = next.code;
  if (next.name !== original.name) patch.name = next.name;
  if (next.base !== (original.base ?? null)) patch.base = next.base;
  if (next.phone !== (original.phone ?? null)) patch.phone = next.phone;

  return patch;
}
