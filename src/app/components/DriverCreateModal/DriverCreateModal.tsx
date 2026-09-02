import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppDialog } from "../../../app/components/ui/app-dialog";
import { useAuth } from "../../../app/context/AuthContext";
import { useCreateDriver } from "../../../features/occurrences/queries/drivers.queries";
import { useBasesRegistry } from "../../../features/occurrences/queries/bases.queries";
import { DriverFormFields } from "./DriverFormFields";
import {
  driverFormToPayload,
  emptyDriverForm,
  hasErrors,
  validateDriverForm,
  type DriverFormValues,
} from "./driverForm";
import type { DriverCreateModalProps } from "./driverCreateModal.types";

export function DriverCreateModal({
  open,
  onOpenChange,
  onCreated,
}: DriverCreateModalProps) {
  const createDriver = useCreateDriver();
  const { options: baseOptions } = useBasesRegistry();
  const { profileName, user } = useAuth();

  const [form, setForm] = useState<DriverFormValues>(emptyDriverForm);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyDriverForm());
      setShowErrors(false);
      createDriver.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const errors = useMemo(
    () => validateDriverForm(form, baseOptions),
    [form, baseOptions],
  );
  const isValid = !hasErrors(errors);
  const busy = createDriver.isPending;

  function patch(next: Partial<DriverFormValues>) {
    setForm((s) => ({ ...s, ...next }));
  }

  async function handleSubmit() {
    setShowErrors(true);
    if (!isValid || busy) return;

    const created = await createDriver.mutateAsync({
      ...driverFormToPayload(form),
      criadoPor: profileName.trim() || null,
      criadoPorId: user?.id ?? null,
    });
    onCreated(created);
    onOpenChange(false);
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v);
      }}
      title="Cadastrar motorista"
      subtitle="Os dados ficam disponíveis na hora para seleção no formulário."
      size="md"
      closeOnOutside={false}
      showClose={!busy}
      actions={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || (showErrors && !isValid)}
          className={[
            "cursor-pointer inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-semibold",
            "bg-blue-600 text-white shadow-sm shadow-blue-600/20",
            "hover:bg-blue-700 active:bg-blue-800",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
          ].join(" ")}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? "Salvando…" : "Salvar"}
        </button>
      }
    >
      <DriverFormFields
        values={form}
        errors={errors}
        showErrors={showErrors}
        onChange={patch}
        disabled={busy}
        autoFocusFirst
        apiError={
          createDriver.isError
            ? createDriver.error instanceof Error && createDriver.error.message
              ? createDriver.error.message
              : "Falha ao cadastrar o motorista. Verifique os dados e tente novamente."
            : null
        }
      />
    </AppDialog>
  );
}
