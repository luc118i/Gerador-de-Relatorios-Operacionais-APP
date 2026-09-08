import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Lock } from "lucide-react";

import { AppDialog } from "../../components/ui/app-dialog";
import { DriverPicker } from "../../components/DriverPicker/DriverPicker";
import { BaseSelect } from "../../components/DriverCreateModal/BaseSelect";
import { occurrencesApi } from "../../../api/occurrences.api";
import { getApiErrorMessage } from "../../../api/http";
import { getLocalDateString } from "../../../utils/dateUtils";
import { useAuth } from "../../context/AuthContext";
import { OCCURRENCE_TYPES } from "../../config/occurrenceTypes";
import { PRIORIDADES } from "../../config/occurrenceWorkflow";
import { PickSelect } from "./ui/PickSelect";
import type {
  CreateOccurrenceInput,
  Prioridade,
  WorkflowStatus,
} from "../../../domain/occurrences";

type Tratativa = "SUSPEICAO" | "ADVERTENCIA" | "VALE" | "REGISTRO";

const TRATATIVA_OPTS: { value: Tratativa; label: string }[] = [
  { value: "SUSPEICAO", label: "Suspensão (em investigação)" },
  { value: "ADVERTENCIA", label: "Advertência" },
  { value: "VALE", label: "Vale" },
  { value: "REGISTRO", label: "Só o registro" },
];

const START_STATUSES: { value: WorkflowStatus; label: string }[] = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "EM_TRATAMENTO", label: "Em tratamento" },
  { value: "AGUARDANDO_RETORNO", label: "Aguardando retorno" },
];

const TYPE_OTHER = "__OUTRO__";

const input =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const label = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Chamado após criar. `openReport` = seguir para o Gerador de Relatórios
   *  com a ocorrência recém-criada já carregada. */
  onCreated: (id: string, opts?: { openReport?: boolean }) => void;
};

/**
 * Cadastro rápido de ocorrência "para tratar" — enxuto, sem gerar relatório
 * (equivalente ao "New" do Notion). O relatório completo pode ser feito
 * depois pelo botão "Editar ocorrência" no painel de detalhe.
 */
export function QuickOccurrenceModal({ open, onClose, onCreated }: Props) {
  const { profileName, user } = useAuth();
  const today = getLocalDateString(new Date());

  const [saving, setSaving] = useState<null | "save" | "report">(null);
  const [prefixo, setPrefixo] = useState("");
  const [tipoSel, setTipoSel] = useState<string>(TYPE_OTHER);
  const [assunto, setAssunto] = useState("");
  const [data, setData] = useState(today);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [base, setBase] = useState<string | null>(null);
  const [prioridade, setPrioridade] = useState<Prioridade>("MEDIA");
  const [status, setStatus] = useState<WorkflowStatus>("PENDENTE");
  const [tratativa, setTratativa] = useState<Tratativa | "">("");
  const [detalhes, setDetalhes] = useState("");

  const responsavel = (profileName ?? "").trim();
  const isGeneric = tipoSel === TYPE_OTHER || tipoSel === "GENERICO";
  const canSave = prefixo.trim().length > 0 && (!isGeneric || assunto.trim().length > 0) && !!data;

  function reset() {
    setPrefixo("");
    setTipoSel(TYPE_OTHER);
    setAssunto("");
    setData(today);
    setDriverId(null);
    setBase(null);
    setPrioridade("MEDIA");
    setStatus("PENDENTE");
    setTratativa("");
    setDetalhes("");
  }

  async function handleSave(openReport: boolean) {
    if (!canSave || saving) return;
    setSaving(openReport ? "report" : "save");
    try {
      const typeCode = isGeneric ? "GENERICO" : tipoSel;
      const payload: CreateOccurrenceInput = {
        typeCode,
        // "Gerar relatório" transforma numa ocorrência de relatório (aparece na
        // Home); "Registrar ocorrência" fica só na Central.
        origin: openReport ? "REPORT" : "CENTRAL",
        eventDate: data,
        tripDate: data,
        startTime: "00:00",
        endTime: "00:00",
        vehicleNumber: prefixo.trim(),
        baseCode: base?.trim() || undefined,
        drivers: driverId ? [{ position: 1, driverId }] : [],
        showSectionTripulacao: !!driverId,
        showSectionViagem: false,
        showSectionPassageiros: false,
        reportTitle: isGeneric ? assunto.trim() : null,
        occurrenceName: !isGeneric && assunto.trim() ? assunto.trim() : null,
        relatoHtml: detalhes.trim() ? `<p>${escapeHtml(detalhes.trim())}</p>` : null,
        prioridade,
        workflowStatus: status,
        tratativa: tratativa || null,
        analisadoPor: responsavel || null,
        analisadoPorUserId: responsavel ? user?.id ?? null : null,
      };

      const res = await occurrencesApi.createOccurrence(payload);
      toast.success(openReport ? "Ocorrência criada. Abrindo relatório…" : "Ocorrência registrada.");
      reset();
      onClose();
      onCreated(res.id, { openReport });
    } catch (err) {
      toast.error(`Não foi possível registrar: ${getApiErrorMessage(err)}`);
    } finally {
      setSaving(null);
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(v) => !v && !saving && onClose()}
      title="Nova ocorrência"
      subtitle="Registro rápido para tratamento — o relatório pode ser gerado depois."
      size="lg"
      closeOnOutside={!saving}
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Informações principais
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Prefixo *</label>
              <input
                className={input}
                value={prefixo}
                onChange={(e) => setPrefixo(e.target.value)}
                placeholder="Ex.: 24707"
                autoFocus
              />
            </div>
            <div>
              <label className={label}>Data da ocorrência *</label>
              <input type="date" className={input} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Tipo</label>
              <PickSelect
                size="md"
                ariaLabel="Tipo"
                value={tipoSel}
                onChange={setTipoSel}
                options={[
                  { value: TYPE_OTHER, label: "Outro assunto" },
                  ...OCCURRENCE_TYPES.map((t) => ({ value: t.code, label: t.title })),
                ]}
              />
            </div>
            <div>
              <label className={label}>{isGeneric ? "Assunto *" : "Nome da ocorrência"}</label>
              <input
                className={input}
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder={isGeneric ? "Ex.: Pneu, Reclamação SAC…" : "opcional"}
              />
            </div>
          </div>

          <div>
            <DriverPicker
              label="Motorista"
              value={driverId}
              onChange={(id, drv) => {
                setDriverId(id);
                if (drv?.base && !base) setBase(drv.base);
              }}
            />
          </div>

          <BaseSelect value={base} onChange={setBase} />
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Tratamento
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Prioridade</label>
              <PickSelect
                size="md"
                ariaLabel="Prioridade"
                value={prioridade}
                onChange={(v) => setPrioridade(v as Prioridade)}
                options={PRIORIDADES.map((p) => ({ value: p.code, label: p.label, dot: p.dot }))}
              />
            </div>
            <div>
              <label className={label}>Status inicial</label>
              <PickSelect
                size="md"
                ariaLabel="Status inicial"
                value={status}
                onChange={(v) => setStatus(v as WorkflowStatus)}
                options={START_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Responsável</label>
              <div className={`${input} flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 cursor-not-allowed`}>
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{responsavel || "—"}</span>
              </div>
            </div>
            <div>
              <label className={label}>Apuração / tratativa</label>
              <PickSelect
                size="md"
                ariaLabel="Apuração / tratativa"
                value={tratativa || "__none__"}
                onChange={(v) => setTratativa(v === "__none__" ? "" : (v as Tratativa))}
                options={[
                  { value: "__none__", label: "Sem tratativa definida" },
                  ...TRATATIVA_OPTS.map((t) => ({ value: t.value, label: t.label })),
                ]}
              />
            </div>
          </div>

          <div>
            <label className={label}>Detalhes / observações</label>
            <textarea
              className={`${input} min-h-[80px] resize-y`}
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              placeholder="O que aconteceu, o que precisa ser feito…"
            />
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={!!saving}
            className="cursor-pointer px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={!canSave || !!saving}
            className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm rounded-lg border border-blue-600 text-blue-700 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving === "report" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Gerar relatório
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={!canSave || !!saving}
            className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving === "save" && <Loader2 className="w-4 h-4 animate-spin" />}
            Registrar ocorrência
          </button>
        </div>
      </div>
    </AppDialog>
  );
}
