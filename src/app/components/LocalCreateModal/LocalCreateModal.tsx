import { useEffect, useMemo, useState } from "react";
import { AppDialog } from "../../../app/components/ui/app-dialog";
import { useCreateLocal } from "../../../features/occurrences/queries/locais/locais.queries";
import type { LocalCreateModalProps } from "./localCreateModal.types";

type FormState = {
  nome: string;
  sigla: string;
  tipo: string;
  lat: string;
  lng: string;
};

const emptyForm: FormState = { nome: "", sigla: "", tipo: "", lat: "", lng: "" };

export function LocalCreateModal({
  open,
  onOpenChange,
  onCreated,
  initialNome = "",
}: LocalCreateModalProps) {
  const createLocal = useCreateLocal();

  const [form, setForm] = useState<FormState>({ ...emptyForm, nome: initialNome });
  const [touched, setTouched] = useState<{ nome?: boolean }>({});

  // reset ao abrir/fechar
  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, nome: initialNome });
      setTouched({});
      createLocal.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Nome é obrigatório.";
    return e;
  }, [form.nome]);

  const canSubmit = Object.keys(errors).length === 0 && !createLocal.isPending;

  async function handleSubmit() {
    setTouched({ nome: true });
    if (!canSubmit) return;

    const lat = form.lat.trim() ? Number(form.lat.trim().replace(",", ".")) : null;
    const lng = form.lng.trim() ? Number(form.lng.trim().replace(",", ".")) : null;

    const created = await createLocal.mutateAsync({
      nome: form.nome.trim(),
      sigla: form.sigla.trim() ? form.sigla.trim() : null,
      tipo: form.tipo.trim() ? form.tipo.trim() : null,
      lat: Number.isFinite(lat as number) ? lat : null,
      lng: Number.isFinite(lng as number) ? lng : null,
    });

    onCreated(created);
    onOpenChange(false);
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(v) => {
        if (!createLocal.isPending) onOpenChange(v);
      }}
      title="Cadastrar local"
      subtitle="Cadastre em tempo real para selecionar no formulário."
      size="md"
      closeOnOutside={!createLocal.isPending}
      actions={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={[
            "cursor-pointer h-9 px-4 rounded-lg font-medium",
            "bg-slate-900 text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "hover:bg-slate-800",
            "focus:outline-none focus:ring-2 focus:ring-slate-900/20",
          ].join(" ")}
        >
          {createLocal.isPending ? "Salvando..." : "Salvar"}
        </button>
      }
    >
      <div className="space-y-4">
        {/* Erro de API */}
        {createLocal.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Falha ao cadastrar local. Verifique os dados e tente novamente.
          </div>
        ) : null}

        {/* Nome */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Nome <span className="text-red-600">*</span>
          </label>
          <input
            value={form.nome}
            onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, nome: true }))}
            placeholder="Ex: Rodoviária de Vitória da Conquista"
            className={[
              "w-full h-10 px-3 rounded-lg border bg-white/70",
              "border-white/40",
              "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
            ].join(" ")}
            autoFocus
          />
          {touched.nome && errors.nome ? (
            <p className="text-xs text-red-600">{errors.nome}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sigla */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Sigla
            </label>
            <input
              value={form.sigla}
              onChange={(e) => setForm((s) => ({ ...s, sigla: e.target.value }))}
              placeholder="Ex: VCA"
              className={[
                "w-full h-10 px-3 rounded-lg border bg-white/70",
                "border-white/40",
                "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
              ].join(" ")}
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Tipo
            </label>
            <input
              value={form.tipo}
              onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value }))}
              placeholder="Ex: RODOVIARIA, GARAGEM, PEDAGIO..."
              className={[
                "w-full h-10 px-3 rounded-lg border bg-white/70",
                "border-white/40",
                "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
              ].join(" ")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Latitude */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Latitude
            </label>
            <input
              value={form.lat}
              onChange={(e) => setForm((s) => ({ ...s, lat: e.target.value }))}
              placeholder="Ex: -14.8619"
              inputMode="decimal"
              className={[
                "w-full h-10 px-3 rounded-lg border bg-white/70",
                "border-white/40",
                "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
              ].join(" ")}
            />
          </div>

          {/* Longitude */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Longitude
            </label>
            <input
              value={form.lng}
              onChange={(e) => setForm((s) => ({ ...s, lng: e.target.value }))}
              placeholder="Ex: -40.8444"
              inputMode="decimal"
              className={[
                "w-full h-10 px-3 rounded-lg border bg-white/70",
                "border-white/40",
                "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
              ].join(" ")}
            />
          </div>
        </div>
      </div>
    </AppDialog>
  );
}
