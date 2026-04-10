import { AlertCircle } from "lucide-react";
import { ExpandableRichTextEditor } from "../../../components/ExpandableRichTextEditor";

interface SecaoGenericoProps {
  reportTitle: string;
  onReportTitleChange: (v: string) => void;
  ccoOperator: string;
  onCcoOperatorChange: (v: string) => void;
  vehicleKm: number | null;
  onVehicleKmChange: (v: number | null) => void;
  passengerCount: number | null;
  onPassengerCountChange: (v: number | null) => void;
  passengerConnection: string;
  onPassengerConnectionChange: (v: string) => void;
  relatoHtml: string;
  onRelatoHtmlChange: (v: string) => void;
  devolutivaHtml: string;
  onDevolutivaHtmlChange: (v: string) => void;
  devolutivaStatus: string;
  onDevolutivaStatusChange: (v: string) => void;
  devolutivaBeforeEvidences: boolean;
  onDevolutivaBeforeEvidencesChange: (v: boolean) => void;
  showSectionIdentificacao: boolean;
  showSectionPassageiros: boolean;
  triedSave: boolean;
}

export function SecaoGenerico({
  reportTitle, onReportTitleChange,
  ccoOperator, onCcoOperatorChange,
  vehicleKm, onVehicleKmChange,
  passengerCount, onPassengerCountChange,
  passengerConnection, onPassengerConnectionChange,
  relatoHtml, onRelatoHtmlChange,
  devolutivaHtml, onDevolutivaHtmlChange,
  devolutivaStatus, onDevolutivaStatusChange,
  devolutivaBeforeEvidences, onDevolutivaBeforeEvidencesChange,
  showSectionIdentificacao,
  showSectionPassageiros,
  triedSave,
}: SecaoGenericoProps) {
  const inputBase = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">

      {/* Nome do Relatório */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Nome do Relatório
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Relatório *</label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => onReportTitleChange(e.target.value)}
            placeholder="Ex: Atendimento Especial, Acidente, Pane Mecânica..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              triedSave && !reportTitle.trim()
                ? "border-red-400 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {triedSave && !reportTitle.trim() && (
            <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Campo obrigatório
            </div>
          )}
        </div>
      </section>

      {/* Identificação */}
      {showSectionIdentificacao && (
        <section className="animate-in fade-in slide-in-from-top-2 duration-300">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Identificação do Relatório
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operador CCO</label>
              <input type="text" value={ccoOperator} onChange={(e) => onCcoOperatorChange(e.target.value)} placeholder="Ex: Paulo Cesar" className={inputBase} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KM do Veículo</label>
              <input type="number" min={0} value={vehicleKm ?? ""} onChange={(e) => onVehicleKmChange(e.target.value ? Number(e.target.value) : null)} placeholder="Ex: 526178" className={inputBase} />
            </div>
          </div>
        </section>
      )}

      {/* Passageiros */}
      {showSectionPassageiros && (
        <section className="animate-in fade-in slide-in-from-top-2 duration-300">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Passageiros
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qtd. Passageiros</label>
              <input type="number" min={0} value={passengerCount ?? ""} onChange={(e) => onPassengerCountChange(e.target.value ? Number(e.target.value) : null)} placeholder="Ex: 15" className={inputBase} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passageiros Conexão</label>
              <input type="text" value={passengerConnection} onChange={(e) => onPassengerConnectionChange(e.target.value)} placeholder="Ex: 3 ou —" className={inputBase} />
            </div>
          </div>
        </section>
      )}

      {/* Relato */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Relato da Ocorrência <span className="text-red-500">*</span>
        </h2>
        <ExpandableRichTextEditor
          label="Relato da Ocorrência"
          value={relatoHtml}
          onChange={onRelatoHtmlChange}
          placeholder="Descreva o que ocorreu..."
          minHeight="150px"
        />
        {triedSave && !relatoHtml.trim() && (
          <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Campo obrigatório
          </div>
        )}
      </section>

      {/* Devolutiva */}
      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Devolutiva / Solução Adotada <span className="text-red-500">*</span>
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 select-none">
            <span className={devolutivaBeforeEvidences ? "text-gray-400" : "font-medium text-gray-700"}>Após evidências</span>
            <button
              type="button"
              role="switch"
              aria-checked={devolutivaBeforeEvidences}
              onClick={() => onDevolutivaBeforeEvidencesChange(!devolutivaBeforeEvidences)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${devolutivaBeforeEvidences ? "bg-blue-500" : "bg-gray-300"}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${devolutivaBeforeEvidences ? "translate-x-4" : "translate-x-0"}`} />
            </button>
            <span className={devolutivaBeforeEvidences ? "font-medium text-gray-700" : "text-gray-400"}>Antes das evidências</span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={devolutivaStatus} onChange={(e) => onDevolutivaStatusChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="EM_ANDAMENTO">⚠️ Em Andamento</option>
              <option value="RESOLVIDO">✅ Resolvido</option>
            </select>
          </div>
          <ExpandableRichTextEditor
            label="Devolutiva / Solução Adotada"
            value={devolutivaHtml}
            onChange={onDevolutivaHtmlChange}
            placeholder="Descreva a solução adotada..."
            minHeight="100px"
          />
          {triedSave && !devolutivaHtml.trim() && (
            <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Campo obrigatório
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
