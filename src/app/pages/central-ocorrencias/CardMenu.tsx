import { useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { ConfirmActionModal } from "../home/ConfirmActionModal";
import type { OccurrenceDTO, WorkflowStatus } from "../../../domain/occurrences";
import {
  STATUS_NEEDS_CONFIRM,
  WORKFLOW_STATUSES,
  getWorkflowStatusConfig,
} from "../../config/occurrenceWorkflow";
import {
  useDeleteOccurrence,
  useDuplicateOccurrence,
  usePatchStatus,
} from "../../../features/occurrences/queries/occurrences.queries";

type Actor = { actorUserId?: string | null; actorNome?: string | null };

type Props = {
  occurrence: OccurrenceDTO;
  actor: Actor;
  /** colunas ocultas — não aparecem em "Mover para…" */
  hiddenColumns?: string[];
  onOpen: (o: OccurrenceDTO) => void;
  onEdit: (id: string) => void;
  /** classe extra no trigger (ex.: posição no card) */
  triggerClassName?: string;
};

export function CardMenu({
  occurrence: o,
  actor,
  hiddenColumns = [],
  onOpen,
  onEdit,
  triggerClassName,
}: Props) {
  const patchStatus = usePatchStatus();
  const dup = useDuplicateOccurrence();
  const del = useDeleteOccurrence();

  const [confirm, setConfirm] = useState<
    { kind: "status"; to: WorkflowStatus } | { kind: "delete" } | null
  >(null);

  const applyStatus = (to: WorkflowStatus) => {
    patchStatus.mutate({ id: o.id, status: to, actor });
  };

  const moveTo = (to: WorkflowStatus) => {
    if (to === o.workflowStatus) return;
    if (STATUS_NEEDS_CONFIRM.includes(to)) setConfirm({ kind: "status", to });
    else applyStatus(to);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            title="Mais ações"
            aria-label="Mais ações"
            className={`flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-black/[0.05] hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/[0.08] dark:hover:text-gray-200 ${triggerClassName ?? ""}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem onSelect={() => onOpen(o)}>
            <ExternalLink className="h-4 w-4" />
            Abrir ocorrência
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(o.id)}>
            <Pencil className="h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Mover para…</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {WORKFLOW_STATUSES.filter(
                (s) => s.code !== o.workflowStatus && !hiddenColumns.includes(s.code),
              ).map((s) => (
                <DropdownMenuItem key={s.code} onSelect={() => moveTo(s.code)}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onSelect={() =>
              dup.mutate(o.id, {
                onSuccess: () => toast.success("Ocorrência duplicada."),
                onError: () => toast.error("Não foi possível duplicar."),
              })
            }
          >
            <Copy className="h-4 w-4" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => moveTo("ARQUIVADA")}>
            <Archive className="h-4 w-4" />
            Arquivar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm({ kind: "delete" })}>
            <Trash2 className="h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm?.kind === "status" && (
        <ConfirmActionModal
          title="Confirmar mudança de status"
          confirmLabel={`Mover para ${getWorkflowStatusConfig(confirm.to).label}`}
          confirmClassName="bg-emerald-600 hover:bg-emerald-700"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            applyStatus(confirm.to);
            setConfirm(null);
          }}
        >
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {confirm.to === "TRATADA"
              ? "Marcar esta ocorrência como tratada? A mudança fica registrada no histórico."
              : confirm.to === "ARQUIVADA"
                ? "Arquivar esta ocorrência? Ela some do quadro (o histórico é preservado)."
                : "Mover esta ocorrência? A mudança fica registrada no histórico."}
          </p>
        </ConfirmActionModal>
      )}

      {confirm?.kind === "delete" && (
        <ConfirmActionModal
          icon={<Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />}
          iconBg="bg-red-50 dark:bg-red-950/40"
          title="Excluir ocorrência"
          confirmLabel={del.isPending ? "Excluindo…" : "Excluir"}
          confirmClassName="bg-red-600 hover:bg-red-700"
          confirmDisabled={del.isPending}
          cancelDisabled={del.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            del.mutate(o.id, {
              onSuccess: () => {
                toast.success("Ocorrência excluída.");
                setConfirm(null);
              },
              onError: () => toast.error("Não foi possível excluir."),
            })
          }
        >
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Excluir a ocorrência do veículo <strong>{o.vehicleNumber}</strong>? Esta ação
            não pode ser desfeita.
          </p>
        </ConfirmActionModal>
      )}
    </>
  );
}
