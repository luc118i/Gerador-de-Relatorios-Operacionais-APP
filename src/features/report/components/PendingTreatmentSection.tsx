import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  ClipboardCheck,
  RefreshCw,
  ExternalLink,
  CircleCheck,
  CircleAlert,
  CircleHelp,
} from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import type { OccurrenceDTO } from "../../../domain/occurrences";
import { useReport } from "../ReportContext";
import { Panel } from "./primitives";
import { occDisplayName, primaryDriver, firstName } from "../occ-helpers";
import { syncRizerSolucionado } from "../../../api/rizerSolucionado.api";
import { useAgentStatus } from "../../../hooks/useAgentStatus";

// Origem do RIZER pro deep-link "abrir no RIZER". Valor fixo (o domínio da
// Viação Catedral é estável e a automação no backend já usa esse mesmo host
// via RIZER_DISCIPLINARY_URL). `VITE_RIZER_BASE_URL` é só um override opcional
// caso o domínio mude — não precisa ser configurado.
const RIZER_BASE_URL = (
  (import.meta.env.VITE_RIZER_BASE_URL as string | undefined) ||
  "https://viacaocatedralocorrencias.rizerapps.com"
).replace(/\/$/, "");

const TRATATIVA_LABEL: Record<string, string> = {
  SUSPEICAO: "Suspensão",
  ADVERTENCIA: "Advertência",
  VALE: "Vale",
  REGISTRO: "Registro",
};

function medidaLabel(o: OccurrenceDTO): string {
  if (o.tratativa) return TRATATIVA_LABEL[o.tratativa] ?? o.tratativa;
  if (o.suspensao) return "Suspensão";
  if (o.advertencia) return "Advertência";
  return "—";
}

function rizerEditUrl(rizerId: string): string {
  return `${RIZER_BASE_URL}/ocorrencias_disciplinares/${rizerId}/edit`;
}

function verificadoLabel(iso: string | null | undefined): string {
  if (!iso) return "nunca verificado";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `verificado ${formatDistanceToNow(d, { addSuffix: true, locale: ptBR })}`;
}

export function PendingTreatmentSection() {
  const { all, period, periodLabel } = useReport();
  const queryClient = useQueryClient();
  const agentAvailable = useAgentStatus();
  const [lastRun, setLastRun] = useState<string | null>(null);

  // A auditoria olha o período inteiro, independente do filtro global do
  // painel — "somente o período selecionado", como pedido.
  const { registradas, pendentes, solucionadas, foraDoRizer, semId } = useMemo(() => {
    const registradas = all.filter((o) => o.rizerRegistered);
    const pendentes = registradas
      .filter((o) => !o.solucionado)
      .sort((a, b) => (a.eventDate + (a.startTime ?? "")).localeCompare(b.eventDate + (b.startTime ?? "")));
    return {
      registradas,
      pendentes,
      solucionadas: registradas.filter((o) => o.solucionado),
      foraDoRizer: all.filter((o) => !o.rizerRegistered),
      semId: pendentes.filter((o) => !o.rizerId),
    };
  }, [all]);

  const sync = useMutation({
    mutationFn: () =>
      syncRizerSolucionado(period.start, period.end, { useAgent: agentAvailable }),
    onSuccess: (r) => {
      setLastRun(r.verificadoEm);
      // Os dias do período usam a queryKey ["report","day",iso] — invalida
      // todas pra o novo `solucionado` fluir de volta pra tela.
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "report" && q.queryKey[1] === "day",
      });
      const partes = [
        `${r.verificadas} verificada${r.verificadas !== 1 ? "s" : ""}`,
        `${r.solucionadas} solucionada${r.solucionadas !== 1 ? "s" : ""}`,
        `${r.pendentes} pendente${r.pendentes !== 1 ? "s" : ""}`,
      ];
      if (r.naoVerificaveis > 0) partes.push(`${r.naoVerificaveis} não verificável(is)`);
      if (r.restantes > 0) {
        toast.warning(
          `RIZER: ${partes.join(" · ")} — faltam ${r.restantes}, clique em "Verificar" de novo`,
        );
      } else {
        toast.success(`RIZER: ${partes.join(" · ")}`);
      }
    },
    onError: (e) => {
      toast.error(`Falha ao verificar no RIZER: ${(e as Error)?.message ?? "erro desconhecido"}`);
    },
  });

  const canSync = agentAvailable && !sync.isPending && registradas.length > 0;

  if (all.length === 0) return null;

  return (
    <Panel as="section" className="overflow-hidden scroll-mt-24">
      <div id="pendentes-tratamento" />
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
          <ClipboardCheck className="w-3.5 h-3.5 text-gray-400" />
          Ocorrências pendentes de tratamento
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">{periodLabel}</span>

        <div className="ml-auto flex items-center gap-2">
          {!agentAvailable && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 hidden sm:inline">
              RIZER Agent offline
            </span>
          )}
          {agentAvailable && lastRun && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:inline">
              {verificadoLabel(lastRun)}
            </span>
          )}
          <button
            onClick={() => sync.mutate()}
            disabled={!canSync}
            className={cn(
              "cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors",
              !canSync
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-orange-500 text-white hover:bg-orange-600",
            )}
            title={
              !agentAvailable
                ? "Abra o RIZER Agent para verificar o Status das ocorrências"
                : "Abre o RIZER e lê o Status de cada ocorrência registrada no período"
            }
          >
            <RefreshCw className={cn("w-3.5 h-3.5", sync.isPending && "animate-spin")} />
            {sync.isPending ? "Verificando…" : "Verificar no RIZER"}
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-800">
        <SummaryTile
          icon={<ClipboardCheck className="w-4 h-4" />}
          label="Registradas no RIZER"
          value={registradas.length}
          tone="neutral"
        />
        <SummaryTile
          icon={<CircleCheck className="w-4 h-4" />}
          label="Solucionadas"
          value={solucionadas.length}
          tone="emerald"
        />
        <SummaryTile
          icon={<CircleAlert className="w-4 h-4" />}
          label="Pendentes de tratamento"
          value={pendentes.length}
          tone="amber"
        />
        <SummaryTile
          icon={<CircleHelp className="w-4 h-4" />}
          label="Fora do RIZER"
          value={foraDoRizer.length}
          tone="neutral"
        />
      </div>

      {semId.length > 0 && (
        <div className="px-5 py-2 text-[11px] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-amber-50/50 dark:bg-amber-950/20">
          {semId.length} pendente{semId.length !== 1 ? "s" : ""} sem ID do RIZER salvo — a verificação tenta
          localizar por matrícula + tipo; até lá, não há link direto para o registro.
        </div>
      )}

      {registradas.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhuma ocorrência registrada no RIZER neste período.
        </div>
      ) : pendentes.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-emerald-600 dark:text-emerald-400">
          Todas as {registradas.length} ocorrências registradas no RIZER estão solucionadas.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed min-w-[860px]">
            <colgroup>
              <col className="w-[84px]" />
              <col className="w-[64px]" />
              <col className="w-[128px]" />
              <col className="w-[72px]" />
              <col className="w-[132px]" />
              <col className="w-[140px]" />
              <col className="w-[104px]" />
              <col className="w-[120px]" />
              <col className="w-[92px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500">
                <Th>Data/Hora</Th>
                <Th>Prefixo</Th>
                <Th>Motorista</Th>
                <Th>Matrícula</Th>
                <Th>Tipo</Th>
                <Th>Local</Th>
                <Th>Medida</Th>
                <Th>Autor</Th>
                <Th>RIZER</Th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((o) => {
                const d = primaryDriver(o);
                return (
                  <tr
                    key={o.id}
                    className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-2.5 py-2.5 align-middle whitespace-nowrap font-mono text-gray-600 dark:text-gray-400">
                      <div className="font-semibold text-gray-700 dark:text-gray-300">{o.startTime || "--:--"}</div>
                      <div className="text-[10px] text-gray-400">
                        {o.eventDate.slice(8)}/{o.eventDate.slice(5, 7)}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 align-middle font-mono text-gray-700 dark:text-gray-300 truncate">
                      {o.vehicleNumber || "—"}
                    </td>
                    <td className="px-2.5 py-2.5 align-middle text-gray-700 dark:text-gray-300">
                      <span className="truncate block" title={d?.name ?? ""}>
                        {d?.name ? firstName(d.name) : "—"}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 align-middle font-mono text-gray-600 dark:text-gray-400 truncate">
                      {d?.registry || "—"}
                    </td>
                    <td className="px-2.5 py-2.5 align-middle">
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate block" title={occDisplayName(o)}>
                        {occDisplayName(o)}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 align-middle text-gray-500 dark:text-gray-500">
                      <span className="truncate block" title={o.place}>
                        {o.place || "—"}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 align-middle text-gray-600 dark:text-gray-400 truncate">
                      {medidaLabel(o)}
                    </td>
                    <td className="px-2.5 py-2.5 align-middle text-gray-600 dark:text-gray-400">
                      <span className="truncate block" title={o.analisadoPor ?? ""}>
                        {o.analisadoPor ? firstName(o.analisadoPor) : "—"}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 align-middle">
                      {o.rizerId ? (
                        <a
                          href={rizerEditUrl(o.rizerId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                          title="Abrir o registro no RIZER para tratar"
                        >
                          Abrir
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600" title="Sem ID do RIZER salvo">
                          sem ID
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2.5 py-2 text-left font-semibold uppercase tracking-wide whitespace-nowrap">{children}</th>
  );
}

const TILE_TONE: Record<string, string> = {
  neutral: "text-gray-600 dark:text-gray-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
};

function SummaryTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "neutral" | "emerald" | "amber";
}) {
  return (
    <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3">
      <span className={cn("shrink-0", TILE_TONE[tone])}>{icon}</span>
      <div className="min-w-0">
        <div className={cn("text-xl font-bold leading-none tabular-nums", TILE_TONE[tone])}>{value}</div>
        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}
