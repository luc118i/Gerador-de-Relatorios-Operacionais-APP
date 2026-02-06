import { useEffect, useMemo, useState } from "react";
import { AppDialog } from "../../../app/components/ui/app-dialog";
import { useCreateDriver } from "../../../features/occurrences/queries/drivers.queries";
import type { DriverCreateModalProps } from "./driverCreateModal.types";

type FormState = {
  code: string;
  name: string;
  base: string;
};

export function DriverCreateModal({
  open,
  onOpenChange,
  onCreated,
}: DriverCreateModalProps) {
  const createDriver = useCreateDriver();

  const [form, setForm] = useState<FormState>({ code: "", name: "", base: "" });
  const [touched, setTouched] = useState<{ code?: boolean; name?: boolean }>(
    {},
  );

  // reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setForm({ code: "", name: "", base: "" });
      setTouched({});
      createDriver.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Matrícula é obrigatória.";
    if (!form.name.trim()) e.name = "Nome é obrigatório.";
    return e;
  }, [form.code, form.name]);

  const canSubmit = Object.keys(errors).length === 0 && !createDriver.isPending;

  async function handleSubmit() {
    setTouched({ code: true, name: true });
    if (!canSubmit) return;

    const created = await createDriver.mutateAsync({
      code: form.code.trim(),
      name: form.name.trim(),
      base: form.base.trim() ? form.base.trim() : null,
    });

    onCreated(created);
    onOpenChange(false);
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(v) => {
        if (!createDriver.isPending) onOpenChange(v);
      }}
      title="Cadastrar motorista"
      subtitle="Cadastre em tempo real para selecionar no formulário."
      size="md"
      closeOnOutside={!createDriver.isPending}
      actions={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={[
            "h-9 px-4 rounded-lg font-medium",
            "bg-slate-900 text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "hover:bg-slate-800",
            "focus:outline-none focus:ring-2 focus:ring-slate-900/20",
          ].join(" ")}
        >
          {createDriver.isPending ? "Salvando..." : "Salvar"}
        </button>
      }
    >
      <div className="space-y-4">
        {/* Erro de API */}
        {createDriver.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Falha ao cadastrar motorista. Verifique os dados e tente novamente.
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Matrícula */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Matrícula <span className="text-red-600">*</span>
            </label>
            <input
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, code: true }))}
              placeholder="Ex: 4997"
              className={[
                "w-full h-10 px-3 rounded-lg border bg-white/70",
                "border-white/40",
                "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
              ].join(" ")}
            />
            {touched.code && errors.code ? (
              <p className="text-xs text-red-600">{errors.code}</p>
            ) : null}
          </div>

          {/* Base */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Base
            </label>
            <input
              value={form.base}
              onChange={(e) => setForm((s) => ({ ...s, base: e.target.value }))}
              placeholder="Ex: Montes Claros"
              className={[
                "w-full h-10 px-3 rounded-lg border bg-white/70",
                "border-white/40",
                "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
              ].join(" ")}
            />
          </div>
        </div>

        {/* Nome */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Nome <span className="text-red-600">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="Ex: Jeová Barbosa"
            className={[
              "w-full h-10 px-3 rounded-lg border bg-white/70",
              "border-white/40",
              "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
            ].join(" ")}
          />
          {touched.name && errors.name ? (
            <p className="text-xs text-red-600">{errors.name}</p>
          ) : null}
        </div>

        {/* Footer actions (opcional) */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={createDriver.isPending}
            className={[
              "h-9 px-4 rounded-lg font-medium",
              "bg-white/60 text-slate-800",
              "border border-white/30",
              "hover:bg-white/70",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={[
              "h-9 px-4 rounded-lg font-medium",
              "bg-slate-900 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "hover:bg-slate-800",
            ].join(" ")}
          >
            {createDriver.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </AppDialog>
  );
}
