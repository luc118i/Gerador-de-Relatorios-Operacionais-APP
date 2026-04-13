import { useEffect, useMemo, useState } from "react";
import { AppDialog } from "../ui/app-dialog";
import { useCreateTrip } from "../../../features/trips/queries/trips.queries";
import type { Trip } from "../../../domain/trips";

interface TripCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (trip: Trip) => void;
}

type FormState = {
  lineCode: string;
  lineName: string;
  departureTime: string;
  direction: string;
};

export function TripCreateModal({
  open,
  onOpenChange,
  onCreated,
}: TripCreateModalProps) {
  const createTrip = useCreateTrip();

  const [form, setForm] = useState<FormState>({
    lineCode: "",
    lineName: "",
    departureTime: "",
    direction: "",
  });
  const [touched, setTouched] = useState<{
    lineCode?: boolean;
    lineName?: boolean;
    departureTime?: boolean;
  }>({});

  useEffect(() => {
    if (!open) {
      setForm({ lineCode: "", lineName: "", departureTime: "", direction: "" });
      setTouched({});
      createTrip.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.lineCode.trim()) e.lineCode = "Código da linha é obrigatório.";
    if (!form.lineName.trim()) e.lineName = "Nome da linha é obrigatório.";
    if (!form.departureTime.trim())
      e.departureTime = "Horário de partida é obrigatório.";
    return e;
  }, [form.lineCode, form.lineName, form.departureTime]);

  const canSubmit = Object.keys(errors).length === 0 && !createTrip.isPending;

  async function handleSubmit() {
    setTouched({ lineCode: true, lineName: true, departureTime: true });
    if (!canSubmit) return;

    const created = await createTrip.mutateAsync({
      lineCode: form.lineCode.trim(),
      lineName: form.lineName.trim(),
      departureTime: form.departureTime.trim(),
      direction: form.direction.trim() || undefined,
    });

    onCreated(created);
    onOpenChange(false);
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(v) => {
        if (!createTrip.isPending) onOpenChange(v);
      }}
      title="Cadastrar linha"
      subtitle="Cadastre uma nova linha para selecionar no formulário."
      size="md"
      closeOnOutside={!createTrip.isPending}
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
          {createTrip.isPending ? "Salvando..." : "Salvar"}
        </button>
      }
    >
      <div className="space-y-4">
        {createTrip.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Falha ao cadastrar linha. Verifique os dados e tente novamente.
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Código da linha */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Código da linha <span className="text-red-600">*</span>
            </label>
            <input
              value={form.lineCode}
              onChange={(e) =>
                setForm((s) => ({ ...s, lineCode: e.target.value }))
              }
              onBlur={() => setTouched((t) => ({ ...t, lineCode: true }))}
              placeholder="Ex: 330"
              className={[
                "w-full h-10 px-3 rounded-lg border bg-white/70",
                "border-white/40",
                "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
              ].join(" ")}
            />
            {touched.lineCode && errors.lineCode ? (
              <p className="text-xs text-red-600">{errors.lineCode}</p>
            ) : null}
          </div>

          {/* Horário de partida */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Horário de partida <span className="text-red-600">*</span>
            </label>
            <input
              value={form.departureTime}
              onChange={(e) =>
                setForm((s) => ({ ...s, departureTime: e.target.value }))
              }
              onBlur={() => setTouched((t) => ({ ...t, departureTime: true }))}
              placeholder="Ex: 06:30"
              className={[
                "w-full h-10 px-3 rounded-lg border bg-white/70",
                "border-white/40",
                "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
              ].join(" ")}
            />
            {touched.departureTime && errors.departureTime ? (
              <p className="text-xs text-red-600">{errors.departureTime}</p>
            ) : null}
          </div>
        </div>

        {/* Nome da linha */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Nome da linha <span className="text-red-600">*</span>
          </label>
          <input
            value={form.lineName}
            onChange={(e) =>
              setForm((s) => ({ ...s, lineName: e.target.value }))
            }
            onBlur={() => setTouched((t) => ({ ...t, lineName: true }))}
            placeholder="Ex: Montes Claros - Brasília"
            className={[
              "w-full h-10 px-3 rounded-lg border bg-white/70",
              "border-white/40",
              "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
            ].join(" ")}
          />
          {touched.lineName && errors.lineName ? (
            <p className="text-xs text-red-600">{errors.lineName}</p>
          ) : null}
        </div>

        {/* Sentido */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Sentido
          </label>
          <input
            value={form.direction}
            onChange={(e) =>
              setForm((s) => ({ ...s, direction: e.target.value }))
            }
            placeholder="Ex: IDA / VOLTA"
            className={[
              "w-full h-10 px-3 rounded-lg border bg-white/70",
              "border-white/40",
              "focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white/60",
            ].join(" ")}
          />
        </div>
      </div>
    </AppDialog>
  );
}
