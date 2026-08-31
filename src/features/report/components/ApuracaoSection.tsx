import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Check, UserCheck, Lock, ClipboardCheck } from "lucide-react";
import type { OccurrenceDTO } from "../../../domain/occurrences";
import { useAuth } from "../../../app/context/AuthContext";
import { TratativaSelect, type TratativaKey } from "../../../app/components/TratativaSelect";
import { resolveAnalisadoPorUserId } from "../../../utils/analisadoPor";
import { occurrencesApi } from "../../../api/occurrences.api";

// Movido de app/pages/relatorio-diario.tsx sem alteração de comportamento —
// só realocado pro módulo do Centro de Relatórios.

function ApuracaoRow({
  occurrence: o,
  index,
  onSavingStart,
  onSavingEnd,
}: {
  occurrence: OccurrenceDTO;
  index: number;
  onSavingStart: () => void;
  onSavingEnd: () => void;
}) {
  const { profileName, profileNameAliases, user } = useAuth();
  const zebra = index % 2 === 1 ? "bg-gray-50 dark:bg-gray-950" : "bg-white dark:bg-gray-900";
  const [tratativa, setTratativa] = useState<TratativaKey | null>((o.tratativa as TratativaKey) ?? null);
  const [analista, setAnalista] = useState(o.analisadoPor ?? "");
  const [justificativa, setJustificativa] = useState(o.justificativaRegistro ?? "");
  const [showJustificativa, setShowJustificativa] = useState(
    () => (o.justificativaRegistro ?? "").trim().length > 0,
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [justificativaDirty, setJustificativaDirty] = useState(false);
  const autoFilledAnalistaRef = useRef<string | null>(null);

  const driver = o.drivers[0];
  const title = o.typeCode === "GENERICO" && o.reportTitle ? o.reportTitle : o.typeTitle;

  useEffect(() => {
    if (!analista && profileName) {
      setAnalista(profileName);
      autoFilledAnalistaRef.current = profileName;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileName]);

  async function save(t: TratativaKey | null, a: string, j: string) {
    onSavingStart();
    setSaveState("saving");
    try {
      const isUntouchedAutoFill =
        autoFilledAnalistaRef.current !== null && a.trim() === autoFilledAnalistaRef.current.trim();
      await occurrencesApi.patchTratativa(
        o.id,
        t,
        a.trim() || null,
        j.trim() || null,
        isUntouchedAutoFill
          ? user?.id ?? null
          : resolveAnalisadoPorUserId(a, profileNameAliases, user?.id, o.analisadoPorUserId),
      );
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    } catch {
      setSaveState("idle");
    } finally {
      onSavingEnd();
    }
  }

  function persist(t: TratativaKey | null, j: string) {
    const apurador = (analista || profileName).trim();
    setAnalista(apurador);
    void save(t, apurador, j);
  }

  function handleJustificativaBlur() {
    if (!justificativaDirty) return;
    setJustificativaDirty(false);
    persist(tratativa, justificativa);
  }

  return (
    <>
      <tr className={`border-b border-gray-50 ${zebra} hover:bg-blue-50/40 dark:hover:bg-blue-950/40 transition-colors`}>
        <td className="px-4 py-3 align-middle text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {o.vehicleNumber}
        </td>
        <td className="px-4 py-3 align-middle min-w-0">
          <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[220px]">{title}</div>
          {driver && (
            <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{driver.name}</div>
          )}
        </td>
        <td className="px-4 py-3 align-middle text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {o.baseCode ?? "—"}
        </td>
        <td className="px-4 py-3 align-middle">
          <div className="flex flex-col items-start gap-1">
            <TratativaSelect
              value={tratativa}
              onChange={(val) => {
                setTratativa(val);
                if (val === null) setShowJustificativa(false);
                persist(val, justificativa);
              }}
            />
            {tratativa !== null && (
              <button
                type="button"
                onClick={() => setShowJustificativa((v) => !v)}
                className={`flex items-center gap-0.5 text-[10px] transition-colors cursor-pointer ${
                  justificativa.trim()
                    ? "text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
                }`}
              >
                <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-150 ${showJustificativa ? "rotate-180" : ""}`} />
                Justificativa
              </button>
            )}
          </div>
        </td>
        <td className="px-4 py-3 align-middle">
          <div className="flex items-center gap-1.5">
            <div className="relative w-36" title="Preenchido automaticamente pelo seu perfil">
              <UserCheck className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 dark:text-gray-600 pointer-events-none" />
              <div className="text-xs pl-6 pr-6 py-1.5 border border-gray-100 dark:border-gray-800 rounded-lg w-full bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-400 truncate">
                {analista || <span className="text-gray-300 dark:text-gray-600">Quem apurou</span>}
              </div>
              <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-300 dark:text-gray-600 pointer-events-none" />
            </div>
            {saveState === "saving" && <Loader2 className="w-3 h-3 text-gray-300 dark:text-gray-600 animate-spin shrink-0" />}
            {saveState === "saved" && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
          </div>
        </td>
      </tr>

      {tratativa !== null && showJustificativa && (
        <tr className={`border-b border-gray-50 ${zebra}`}>
          <td />
          <td colSpan={4} className="px-4 pb-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">Justificativa:</span>
              <input
                type="text"
                value={justificativa}
                placeholder="Ex: falha do comercial, veículo quebrado..."
                onChange={(e) => {
                  setJustificativa(e.target.value);
                  setJustificativaDirty(true);
                }}
                onBlur={handleJustificativaBlur}
                className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-white dark:bg-gray-900"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ApuracaoSection({
  occurrences,
  onSavingChange,
}: {
  occurrences: OccurrenceDTO[];
  onSavingChange?: (saving: boolean) => void;
}) {
  const sorted = [...occurrences].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const [savingCount, setSavingCount] = useState(0);

  useEffect(() => {
    onSavingChange?.(savingCount > 0);
  }, [savingCount, onSavingChange]);

  if (sorted.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Apuração</h3>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {sorted.length} ocorrência{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">Prefixo</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Ocorrência</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">Base</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tratativa</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Quem apurou</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((o, i) => (
              <ApuracaoRow
                key={o.id}
                occurrence={o}
                index={i}
                onSavingStart={() => setSavingCount((c) => c + 1)}
                onSavingEnd={() => setSavingCount((c) => Math.max(0, c - 1))}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
