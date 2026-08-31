import { useMemo, useState } from "react";
import { Users, Car, MapPin, Route } from "lucide-react";
import { cn } from "../../../app/components/ui/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../../app/components/ui/sheet";
import { useReport } from "../ReportContext";
import { Panel, SectionTitle, MiniBar } from "./primitives";
import { entityDetail } from "../aggregations";
import type { RankRow } from "../aggregations";
import { baseOf, lineOf, primaryDriver } from "../occ-helpers";

type Kind = "driver" | "vehicle" | "base" | "line";

const META: Record<Kind, { title: string; icon: React.ReactNode; anchor: string; filterField: "driverIds" | "vehicles" | "bases" | "lines"; tone: "violet" | "blue" | "teal" | "indigo" }> = {
  driver: { title: "Motoristas com mais ocorrências", icon: <Users className="w-3.5 h-3.5 text-violet-400" />, anchor: "ranking-motoristas", filterField: "driverIds", tone: "violet" },
  vehicle: { title: "Veículos com mais ocorrências", icon: <Car className="w-3.5 h-3.5 text-blue-400" />, anchor: "ranking-veiculos", filterField: "vehicles", tone: "blue" },
  base: { title: "Bases com maior concentração", icon: <MapPin className="w-3.5 h-3.5 text-teal-400" />, anchor: "ranking-bases", filterField: "bases", tone: "teal" },
  line: { title: "Linhas / viagens com mais ocorrências", icon: <Route className="w-3.5 h-3.5 text-indigo-400" />, anchor: "ranking-linhas", filterField: "lines", tone: "indigo" },
};

const BAR_TONE = { violet: "violet", blue: "blue", teal: "emerald", indigo: "blue" } as const;

export function RankingsGrid() {
  const { derived } = useReport();
  const [detail, setDetail] = useState<{ kind: Kind; key: string; label: string } | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingCard kind="driver" rows={derived.drivers} onOpen={(r) => setDetail({ kind: "driver", key: r.key, label: r.label })} />
        <RankingCard kind="vehicle" rows={derived.vehicles} onOpen={(r) => setDetail({ kind: "vehicle", key: r.key, label: r.label })} />
        <RankingCard kind="base" rows={derived.bases} onOpen={(r) => setDetail({ kind: "base", key: r.key, label: r.label })} />
        <RankingCard kind="line" rows={derived.lines} onOpen={(r) => setDetail({ kind: "line", key: r.key, label: r.label })} />
      </div>

      <EntityDetailDrawer detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function RankingCard({
  kind,
  rows,
  onOpen,
}: {
  kind: Kind;
  rows: RankRow[];
  onOpen: (r: RankRow) => void;
}) {
  const { filters, dispatch } = useReport();
  const meta = META[kind];
  const max = rows[0]?.count ?? 1;
  const top = rows.slice(0, 8);

  return (
    <Panel className="p-5 scroll-mt-24" as="section">
      <div id={meta.anchor} />
      <SectionTitle icon={meta.icon}>{meta.title}</SectionTitle>
      {top.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Sem registros no recorte atual.</p>
      ) : (
        <div className="space-y-3">
          {top.map((r, i) => {
            const active = (filters[meta.filterField] as string[]).includes(r.key);
            return (
              <div key={r.key} className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    i === 0
                      ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                  )}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <button
                      onClick={() => onOpen(r)}
                      className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left"
                      title="Ver detalhes"
                    >
                      {r.label}
                      {r.sublabel && <span className="text-gray-400 dark:text-gray-500 font-normal ml-1.5">{r.sublabel}</span>}
                    </button>
                    <span className="text-xs font-bold tabular-nums shrink-0 text-gray-600 dark:text-gray-300">
                      {r.count}
                      <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">{Math.round(r.pct)}%</span>
                    </span>
                  </div>
                  <MiniBar pct={(r.count / max) * 100} tone={i === 0 ? "red" : BAR_TONE[meta.tone]} />
                </div>
                <button
                  onClick={() => dispatch({ type: "toggle", field: meta.filterField, value: r.key })}
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 transition-colors",
                    active
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-blue-300 hover:text-blue-500",
                  )}
                  title={active ? "Remover filtro" : "Filtrar por este item"}
                >
                  {active ? "filtrando" : "filtrar"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ── Drill-down ─────────────────────────────────────────────────────────────

function EntityDetailDrawer({
  detail,
  onClose,
}: {
  detail: { kind: Kind; key: string; label: string } | null;
  onClose: () => void;
}) {
  const { filtered, dispatch } = useReport();

  const data = useMemo(() => {
    if (!detail) return null;
    const subset = filtered.filter((o) => {
      switch (detail.kind) {
        case "driver":
          return o.drivers.some((d) => d.driverId === detail.key);
        case "vehicle":
          return o.vehicleNumber === detail.key;
        case "base":
          return baseOf(o) === detail.key;
        case "line":
          return lineOf(o) === detail.key;
      }
    });
    const sub =
      detail.kind === "driver" && subset[0] ? primaryDriver(subset[0])?.baseCode : undefined;
    return entityDetail(subset, detail.label, sub ?? undefined);
  }, [detail, filtered]);

  const meta = detail ? META[detail.kind] : null;

  return (
    <Sheet open={!!detail} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        {detail && data && meta && (
          <>
            <SheetHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <SheetTitle className="text-sm flex items-center gap-2">
                {meta.icon}
                {data.title}
              </SheetTitle>
              {data.subtitle && <p className="text-xs text-gray-400 dark:text-gray-500">{data.subtitle}</p>}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
              <div>
                <span className="text-3xl font-black tabular-nums text-gray-800 dark:text-gray-100">{data.count}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                  ocorrência{data.count !== 1 ? "s" : ""} no recorte atual
                </span>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Por tipo</p>
                <div className="space-y-2">
                  {data.byTypeRows.map((t) => (
                    <div key={t.key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 truncate">{t.label}</span>
                      <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-300">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {data.lastAt && (
                <Field label="Última ocorrência" value={data.lastAt} />
              )}
              {data.vehicles.length > 0 && detail.kind !== "vehicle" && (
                <Field label={`Veículos (${data.vehicles.length})`} value={data.vehicles.join(", ")} />
              )}
              {data.drivers.length > 0 && detail.kind !== "driver" && (
                <Field label={`Motoristas (${data.drivers.length})`} value={data.drivers.join(", ")} />
              )}
              {data.bases.length > 0 && detail.kind !== "base" && (
                <Field label={`Bases (${data.bases.length})`} value={data.bases.join(", ")} />
              )}
              {data.lines.length > 0 && detail.kind !== "line" && (
                <Field label={`Linhas (${data.lines.length})`} value={data.lines.join(", ")} />
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  dispatch({ type: "toggle", field: meta.filterField, value: detail.key });
                  onClose();
                }}
                className="w-full text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Filtrar dashboard por “{data.title}”
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xs text-gray-700 dark:text-gray-300 break-words">{value}</p>
    </div>
  );
}
