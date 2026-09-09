import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Link as LinkIcon, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Switch } from "../../../components/ui/switch";
import { Checkbox } from "../../../components/ui/checkbox";
import { useAuth } from "../../../context/AuthContext";
import {
  useOccurrenceShare,
  usePatchShare,
  useRotateShare,
} from "../../../../features/occurrences/queries/shares.queries";
import type { ShareSections } from "../../../../api/occurrenceShares.api";
import { fmtDateTime } from "./fichaHelpers";

const SECTIONS: { key: keyof ShareSections; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "viagem", label: "Dados da viagem" },
  { key: "veiculo", label: "Veículo" },
  { key: "relato", label: "Relato" },
  { key: "tratativa", label: "Tratativa" },
  { key: "timeline", label: "Linha do tempo" },
  { key: "evidencias", label: "Evidências" },
];

type Props = {
  occurrenceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CompartilharDialog({ occurrenceId, open, onOpenChange }: Props) {
  const { profileName } = useAuth();
  const shareQ = useOccurrenceShare(occurrenceId);
  const rotate = useRotateShare(occurrenceId);
  const patch = usePatchShare(occurrenceId);
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const share = shareQ.data && shareQ.data.token ? shareQ.data : null;
  const url = share
    ? `${window.location.origin}/ocorrencia/visualizar/${share.token}`
    : "";
  const on = (k: keyof ShareSections) => (share?.sections?.[k] ?? true) !== false;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const gerar = () =>
    rotate.mutate(
      { createdBy: profileName || undefined },
      {
        onSuccess: () => toast.success("Link público gerado."),
        onError: () => toast.error("Não foi possível gerar o link."),
      },
    );

  const regenerar = () => {
    setConfirmRotate(false);
    rotate.mutate(
      { createdBy: profileName || undefined, sections: share?.sections },
      {
        onSuccess: () => toast.success("Novo link gerado — o anterior parou de funcionar."),
        onError: () => toast.error("Não foi possível regenerar."),
      },
    );
  };

  const toggleSection = (k: keyof ShareSections) => {
    if (!share) return;
    patch.mutate({
      token: share.token,
      patch: { sections: { ...share.sections, [k]: !on(k) } },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar ocorrência</DialogTitle>
          <DialogDescription>
            Link público, sem login. Mostra só as seções marcadas. Pode ser
            revogado a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        {shareQ.isLoading ? (
          <p className="py-6 text-center text-sm text-gray-400">Carregando…</p>
        ) : !share ? (
          <div className="py-2">
            <button
              type="button"
              disabled={rotate.isPending}
              onClick={gerar}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {rotate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="h-4 w-4" />
              )}
              Gerar link público
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className={`min-w-0 flex-1 rounded-md border px-2.5 py-1.5 text-xs ${
                  share.active
                    ? "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    : "border-gray-200 bg-gray-100 text-gray-400 line-through dark:border-gray-800 dark:bg-gray-900"
                }`}
              />
              <button
                type="button"
                onClick={copy}
                title="Copiar link"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <label className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200">
              <span>Link ativo</span>
              <Switch
                checked={share.active}
                onCheckedChange={(v) =>
                  patch.mutate({ token: share.token, patch: { active: v } })
                }
              />
            </label>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Seções visíveis
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {SECTIONS.map((s) => (
                  <label
                    key={s.key}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <Checkbox
                      checked={on(s.key)}
                      disabled={patch.isPending}
                      onCheckedChange={() => toggleSection(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            {confirmRotate ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
                Gerar um novo link faz o atual <strong>parar de funcionar</strong>. Continuar?
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmRotate(false)}
                    className="cursor-pointer rounded border border-amber-300 px-2 py-1 font-medium dark:border-amber-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={regenerar}
                    className="cursor-pointer rounded bg-amber-600 px-2 py-1 font-semibold text-white hover:bg-amber-700"
                  >
                    Gerar novo
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRotate(true)}
                disabled={rotate.isPending}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Gerar novo link
              </button>
            )}

            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Criado em {fmtDateTime(share.created_at)}
              {share.created_by ? ` por ${share.created_by}` : ""}.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
