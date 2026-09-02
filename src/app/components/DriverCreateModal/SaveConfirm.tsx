import { Building2, IdCard, Loader2, Phone, TriangleAlert, UserRound } from "lucide-react";
import type { BaseOption } from "../../../features/occurrences/queries/bases.queries";
import type { DriverFormValues } from "./driverForm";

/** Painel de conferência exibido no lugar do formulário ao clicar em "Salvar". */
export function SaveConfirmPanel({
  authorName,
  values,
  baseOptions,
  editing,
}: {
  authorName: string;
  values: DriverFormValues;
  baseOptions: BaseOption[];
  editing?: boolean;
}) {
  const who = authorName.trim() || "Você";

  const baseOpt = values.base
    ? baseOptions.find(
        (o) => o.value.toUpperCase() === values.base!.toUpperCase(),
      )
    : undefined;

  const rows: Array<{
    icon: typeof IdCard;
    label: string;
    value: string;
    strong?: boolean;
  }> = [
    { icon: IdCard, label: "Matrícula", value: values.code.trim() || "—" },
    { icon: UserRound, label: "Nome", value: values.name.trim() || "—" },
    {
      icon: Building2,
      label: "Base",
      value: baseOpt
        ? `[${baseOpt.sigla}] ${baseOpt.label}`
        : values.base?.trim() || "Sem base",
      strong: true,
    },
  ];
  if (values.phone.trim()) {
    rows.push({ icon: Phone, label: "Telefone", value: values.phone.trim() });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-300">
          <TriangleAlert className="h-4 w-4" />
        </span>
        <div>
          <p className="text-base font-semibold text-amber-800 dark:text-amber-200">
            {who}, está tudo correto?
          </p>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300/90">
            {editing
              ? "Confira as alterações antes de salvar — principalmente a "
              : "Confira os dados antes de salvar — principalmente a "}
            <span className="font-semibold">Base</span>. Dados errados são
            difíceis de rastrear depois.
          </p>
        </div>
      </div>

      <dl className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-white/10 divide-y divide-slate-200/70 dark:divide-white/10">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-3 bg-white/60 px-4 py-3 dark:bg-white/5"
          >
            <r.icon className="w-4 h-4 shrink-0 text-slate-400" />
            <dt className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {r.label}
            </dt>
            <dd
              className={[
                "flex-1 min-w-0 truncate text-sm",
                r.strong
                  ? "font-semibold text-slate-900 dark:text-slate-100"
                  : "text-slate-700 dark:text-slate-200",
              ].join(" ")}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const btnBase =
  "cursor-pointer inline-flex items-center gap-2 h-9 rounded-lg text-sm font-semibold focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

/** Botões do rodapé no modo de confirmação: "Revisar" + "Confirmar e salvar". */
export function SaveConfirmActions({
  busy,
  onBack,
  onConfirm,
}: {
  busy: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className={`${btnBase} px-3 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 focus:ring-2 focus:ring-slate-900/15`}
      >
        Revisar
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className={`${btnBase} px-5 bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 active:bg-blue-800 focus:ring-2 focus:ring-blue-500/40`}
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {busy ? "Salvando…" : "Confirmar e salvar"}
      </button>
    </div>
  );
}
