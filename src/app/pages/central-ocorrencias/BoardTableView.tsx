import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FileCheck2 } from "lucide-react";
import type { OccurrenceDTO, WorkflowStatus } from "../../../domain/occurrences";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { WORKFLOW_STATUSES, getPrioridadeConfig } from "../../config/occurrenceWorkflow";
import { getOccurrenceTypeConfig } from "../../config/occurrenceTypes";
import { usePatchStatus } from "../../../features/occurrences/queries/occurrences.queries";
import { avatarColor, initialsOf } from "../../../utils/avatar";
import { PickSelect } from "./ui/PickSelect";
import { CardMenu } from "./CardMenu";
import type { CentralLayout } from "./useCentralLayout";

function subject(o: OccurrenceDTO): string {
  if (o.typeCode === "GENERICO") return o.reportTitle || o.typeTitle || "Ocorrência";
  return o.occurrenceName || getOccurrenceTypeConfig(o.typeCode).title || o.typeTitle || "Ocorrência";
}
function fmtDate(d?: string) {
  if (!d) return "—";
  const [y, m, day] = (d ?? "").split("-");
  return y && m && day ? `${day}/${m}/${y}` : "—";
}

type SortKey = "vehicleNumber" | "subject" | "status" | "prioridade" | "responsavel" | "eventDate";

type Props = {
  occurrences: OccurrenceDTO[];
  layout: CentralLayout;
  actor: { actorUserId?: string | null; actorNome?: string | null };
  onOpen: (o: OccurrenceDTO) => void;
  onEdit: (id: string) => void;
};

const PRIO_RANK: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };
const STATUS_RANK = Object.fromEntries(WORKFLOW_STATUSES.map((s, i) => [s.code, i]));

export function BoardTableView({ occurrences, layout, actor, onOpen, onEdit }: Props) {
  const patchStatus = usePatchStatus();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "eventDate",
    dir: "desc",
  });

  const rows = useMemo(() => {
    const val = (o: OccurrenceDTO): string | number => {
      switch (sort.key) {
        case "vehicleNumber":
          return o.vehicleNumber ?? "";
        case "subject":
          return subject(o).toLowerCase();
        case "status":
          return STATUS_RANK[o.workflowStatus ?? "PENDENTE"] ?? 99;
        case "prioridade":
          return PRIO_RANK[o.prioridade ?? "MEDIA"] ?? 9;
        case "responsavel":
          return (o.analisadoPor ?? "").toLowerCase();
        case "eventDate":
          return o.eventDate ?? "";
      }
    };
    const arr = [...occurrences].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [occurrences, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        {children}
        {sort.key === k &&
          (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  if (occurrences.length === 0) {
    return <p className="py-16 text-center text-sm text-gray-400">Nenhuma ocorrência.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200/70 dark:border-gray-800">
      <Table>
        <TableHeader>
          <TableRow>
            <Th k="vehicleNumber" className="w-20">Prefixo</Th>
            <Th k="subject">Assunto</Th>
            <Th k="status" className="w-44">Status</Th>
            {layout.show.prioridade && <Th k="prioridade" className="w-24">Prioridade</Th>}
            <Th k="responsavel" className="w-40">Responsável</Th>
            {layout.show.datas && <Th k="eventDate" className="w-28">Data</Th>}
            <TableHead className="w-16 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Rel.
            </TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o) => {
            const prio = getPrioridadeConfig(o.prioridade);
            const hasReport = !!o.driveWebViewLink || !!o.rizerRegistered;
            return (
              <TableRow
                key={o.id}
                onClick={() => onOpen(o)}
                className="cursor-pointer"
              >
                <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                  {o.vehicleNumber}
                </TableCell>
                <TableCell className="max-w-[280px] truncate text-gray-700 dark:text-gray-300">
                  {subject(o)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <PickSelect
                    size="sm"
                    ariaLabel="Status"
                    value={o.workflowStatus ?? "PENDENTE"}
                    onChange={(v) => patchStatus.mutate({ id: o.id, status: v as WorkflowStatus, actor })}
                    options={WORKFLOW_STATUSES.map((s) => ({ value: s.code, label: s.label, dot: s.dot }))}
                  />
                </TableCell>
                {layout.show.prioridade && (
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${prio.dot}`} />
                      {prio.label}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  {o.analisadoPor ? (
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${avatarColor(o.analisadoPor)}`}
                      >
                        {initialsOf(o.analisadoPor)}
                      </span>
                      <span className="truncate text-xs text-gray-600 dark:text-gray-300">
                        {o.analisadoPor}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                  )}
                </TableCell>
                {layout.show.datas && (
                  <TableCell className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {fmtDate(o.eventDate)}
                  </TableCell>
                )}
                <TableCell>
                  {hasReport && <FileCheck2 className="h-3.5 w-3.5 text-emerald-500" />}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <CardMenu
                    occurrence={o}
                    actor={actor}
                    onOpen={onOpen}
                    onEdit={onEdit}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
