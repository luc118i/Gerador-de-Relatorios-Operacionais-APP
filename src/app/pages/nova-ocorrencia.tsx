import { ArrowLeft, AlertCircle, Save, Loader2, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { EvidenciasGrid } from "../components/evidencias-grid";
import { gerarTextoRelatorioIndividual } from "../utils/relatorio";
import { getOccurrenceTypeConfig } from "../config/occurrenceTypes";
import type { Ocorrencia } from "../types";
import { useNovaOcorrenciaForm } from "./nova-ocorrencia/useNovaOcorrenciaForm";
import { TipoSelector } from "./nova-ocorrencia/sections/TipoSelector";
import { ComposicaoRelatorio } from "./nova-ocorrencia/sections/ComposicaoRelatorio";
import { SecaoDadosViagem } from "./nova-ocorrencia/sections/SecaoDadosViagem";
import { SecaoTripulacao } from "./nova-ocorrencia/sections/SecaoTripulacao";
import { SecaoDadosEvento } from "./nova-ocorrencia/sections/SecaoDadosEvento";
import { SecaoGenerico } from "./nova-ocorrencia/sections/SecaoGenerico";
import { SecaoTratativa } from "./nova-ocorrencia/sections/SecaoTratativa";
import { SaveStatusOverlay } from "./nova-ocorrencia/sections/SaveStatusOverlay";
import { occurrencesApi } from "../../api/occurrences.api";
import { presetsApi } from "../../api/presets.api";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";

interface NovaOcorrenciaProps {
  onVoltar: () => void;
  onSaved: (args: { id: string; view: Ocorrencia }) => void;
  edicao?: Ocorrencia;
}

export function NovaOcorrencia({ onVoltar, onSaved, edicao }: NovaOcorrenciaProps) {
  const form = useNovaOcorrenciaForm({ onVoltar, onSaved, edicao });
  const typeConfig = getOccurrenceTypeConfig(form.typeCode);
  const { isAdmin } = useAdminAuth();
  const { profileName } = useAuth();

  // Em registro novo, pré-preenche o analista responsável com o usuário logado.
  useEffect(() => {
    if (!edicao && !form.analisadoPor && profileName) {
      form.setAnalisadoPor(profileName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileName]);

  const { data: reportTitleSuggestions = [] } = useQuery({
    queryKey: ["occurrences", "report-titles"],
    queryFn: () => occurrencesApi.getReportTitles(),
    staleTime: 5 * 60_000,
    enabled: typeConfig.isGeneric && isAdmin,
  });

  const { data: reportTitlePresets = [] } = useQuery({
    queryKey: ["occurrence-presets"],
    queryFn: async () => {
      const presets = await presetsApi.getPresets();
      return presets.map((p) => p.name);
    },
    staleTime: 5 * 60_000,
  });

  const showTripulacao = typeConfig.isGeneric
    ? form.showSectionTripulacao
    : !!form.viagemSelecionada;

  const validationErrors = form.getValidationErrors();

  function scrollToField(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = el.querySelector<HTMLElement>("input, select, textarea, [role='combobox']");
    focusable?.focus();
  }

  function focusNextFormField(current: HTMLElement) {
    const container = document.getElementById("nova-ocorrencia-form");
    if (!container) return;
    const selector =
      "input[data-form-nav]:not([disabled]), input[readonly]:not([disabled]), select[data-form-nav]:not([disabled])";
    const fields = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => el.offsetParent !== null,
    );
    const idx = fields.indexOf(current);
    if (idx < 0 || idx >= fields.length - 1) return;
    const next = fields[idx + 1];
    next.scrollIntoView({ behavior: "smooth", block: "center" });
    next.focus({ preventScroll: true });
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLInputElement;
    if (target.tagName !== "INPUT" && target.tagName !== "SELECT") return;
    if (!target.readOnly && !target.hasAttribute("data-form-nav")) return;
    e.preventDefault();
    focusNextFormField(target);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onVoltar}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                {edicao ? "Editar Ocorrência" : "Nova Ocorrência"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">Modo ativo:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    typeConfig.isGeneric
                      ? "bg-orange-100 text-orange-700 border border-orange-200"
                      : form.typeCode === "EXCESSO_VELOCIDADE"
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {typeConfig.title}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg">
          <div id="nova-ocorrencia-form" className="p-6 space-y-8" onKeyDown={handleFormKeyDown}>

            {/* 0 — Tipo */}
            <TipoSelector value={form.typeCode} onChange={form.handleTypeChange} />

            {/* 0b — Composição do relatório (só GENERICO) */}
            {typeConfig.isGeneric && (
              <ComposicaoRelatorio
                showSectionViagem={form.showSectionViagem}
                onChangeViagem={form.setShowSectionViagem}
                showSectionIdentificacao={form.showSectionIdentificacao}
                onChangeIdentificacao={form.setShowSectionIdentificacao}
                showSectionDados={form.showSectionDados}
                onChangeDados={form.setShowSectionDados}
                showSectionTripulacao={form.showSectionTripulacao}
                onChangeTripulacao={form.setShowSectionTripulacao}
                showSectionPassageiros={form.showSectionPassageiros}
                onChangePassageiros={form.setShowSectionPassageiros}
              />
            )}

            {/* 1 — Dados da Viagem */}
            {(!typeConfig.isGeneric || form.showSectionViagem) && (
              <div id="section-viagem">
                <SecaoDadosViagem
                  viagemSelecionada={form.viagemSelecionada}
                  onViagemChange={form.handleViagemChange}
                  isGeneric={typeConfig.isGeneric}
                />
              </div>
            )}

            {/* 1b — Status do esquema (só DESCUMP_OP_PARADA_FORA) */}
            {form.typeCode === "DESCUMP_OP_PARADA_FORA" && form.schemaStatus !== "idle" && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                form.schemaStatus === "loading"   ? "bg-gray-50 text-gray-500 border border-gray-200" :
                form.schemaStatus === "found"     ? "bg-green-50 text-green-700 border border-green-200" :
                                                    "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {form.schemaStatus === "loading" && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
                {form.schemaStatus === "found"   && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                {form.schemaStatus === "not_found" && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                <span>
                  {form.schemaStatus === "loading"   && "Buscando esquema da viagem..."}
                  {form.schemaStatus === "found"     && "Esquema da viagem encontrado — será incluído no PDF após as evidências."}
                  {form.schemaStatus === "not_found" && "Esquema não encontrado para esta viagem. O PDF será gerado sem o esquema de pontos."}
                </span>
              </div>
            )}

            {/* 2 — Tripulação */}
            {showTripulacao && (
              <div id="section-tripulacao">
              <SecaoTripulacao
                driver1Id={form.driver1Id}
                driver1={form.driver1}
                driver2Id={form.driver2Id}
                driver2={form.driver2}
                motorista2Ativo={form.motorista2Ativo}
                isDriverModalOpen={form.isDriverModalOpen}
                createTarget={form.createTarget}
                isGeneric={typeConfig.isGeneric}
                onDriver1Change={form.handleDriver1Change}
                onDriver2Change={form.handleDriver2Change}
                onToggleMotorista2={(active) => {
                  form.setMotorista2Ativo(active);
                  if (!active) { form.handleDriver2Change(null, null); }
                }}
                onDriverModalOpenChange={form.setIsDriverModalOpen}
                onCreateTargetChange={form.setCreateTarget}
                onDriverCreated={form.handleDriverCreated}
              />
              </div>
            )}

            {/* 3 — Dados do Evento */}
            {(!typeConfig.isGeneric || form.showSectionDados) && (
              <SecaoDadosEvento
                typeConfig={typeConfig}
                dataEvento={form.dataEvento}
                onDataEventoChange={form.setDataEvento}
                dataViagem={form.dataViagem}
                onDataViagemChange={form.setDataViagem}
                horarioInicial={form.horarioInicial}
                onHorarioInicialChange={form.setHorarioInicial}
                horarioFinal={form.horarioFinal}
                onHorarioFinalChange={form.setHorarioFinal}
                localParada={form.localParada}
                onLocalParadaChange={form.setLocalParada}
                speedKmh={form.speedKmh}
                onSpeedKmhChange={form.setSpeedKmh}
                vehicleNumber={form.vehicleNumber}
                onVehicleNumberChange={form.setVehicleNumber}
                isHorarioValido={form.isHorarioValido()}
              />
            )}

            {/* 4 — Campos GENERICO */}
            {typeConfig.isGeneric && (
              <SecaoGenerico
                reportTitle={form.reportTitle}
                onReportTitleChange={(v) => {
                  form.setReportTitle(v)
                  form.setOccurrenceName(v || null)
                }}
                reportTitleSuggestions={reportTitleSuggestions}
                reportTitlePresets={reportTitlePresets}
                isAdmin={isAdmin}
                ccoOperator={form.ccoOperator}
                onCcoOperatorChange={form.setCcoOperator}
                vehicleKm={form.vehicleKm}
                onVehicleKmChange={form.setVehicleKm}
                passengerCount={form.passengerCount}
                onPassengerCountChange={form.setPassengerCount}
                passengerConnection={form.passengerConnection}
                onPassengerConnectionChange={form.setPassengerConnection}
                relatoHtml={form.relatoHtml}
                onRelatoHtmlChange={form.setRelatoHtml}
                devolutivaHtml={form.devolutivaHtml}
                onDevolutivaHtmlChange={form.setDevolutivaHtml}
                devolutivaStatus={form.devolutivaStatus}
                onDevolutivaStatusChange={form.setDevolutivaStatus}
                devolutivaBeforeEvidences={form.devolutivaBeforeEvidences}
                onDevolutivaBeforeEvidencesChange={form.setDevolutivaBeforeEvidences}
                showSectionIdentificacao={form.showSectionIdentificacao}
                showSectionPassageiros={form.showSectionPassageiros}
                triedSave={form.triedSave}
              />
            )}

            {/* 5 — Evidências */}
            <section id="section-evidencias">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Evidências
              </h2>
              <EvidenciasGrid evidencias={form.evidencias} onChange={form.setEvidencias} />
            </section>

            {/* 5.5 — Análise e Tratativa */}
            <SecaoTratativa
              tratativa={form.tratativa}
              onTratativaChange={form.setTratativa}
              analisadoPor={form.analisadoPor}
              onAnalisadoPorChange={form.setAnalisadoPor}
            />

            {/* 6 — Ações */}
            <section className="pt-4 border-t border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <button
                  onClick={form.handleSalvar}
                  disabled={validationErrors.length > 0 || form.saveStatus !== "idle"}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    validationErrors.length === 0 && form.saveStatus === "idle"
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {form.saveStatus === "saving" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {edicao ? "Salvar Alterações" : "Salvar Ocorrência"}
                    </>
                  )}
                </button>
                {validationErrors.length > 0 && form.saveStatus === "idle" && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                      Campos obrigatórios pendentes:
                    </p>
                    <ul className="space-y-0.5">
                      {validationErrors.map((err) => (
                        <li key={`${err.id}-${err.label}`}>
                          <button
                            type="button"
                            onClick={() => scrollToField(err.id)}
                            className="cursor-pointer text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 text-left"
                          >
                            <span aria-hidden>•</span>
                            {err.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {form.showPreview && form.viagemSelecionada && form.driver1 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Relatório Individual</h3>
              <button
                onClick={() => form.setShowPreview(false)}
                className="cursor-pointer p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
                {gerarTextoRelatorioIndividual({
                  id: "temp",
                  viagem: form.toViagemView(form.viagemSelecionada),
                  motorista1: form.toMotoristaView(form.driver1)!,
                  motorista2: form.motorista2Ativo ? form.toMotoristaView(form.driver2) : undefined,
                  dataEvento: form.dataEvento,
                  dataViagem: form.dataViagem,
                  horarioInicial: form.horarioInicial,
                  horarioFinal: form.horarioFinal,
                  localParada: form.localParada?.nome ?? "",
                  evidencias: form.evidencias,
                  createdAt: new Date().toISOString(),
                })}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-green-600 font-medium">
                ✓ Texto copiado para a área de transferência
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de status */}
      <SaveStatusOverlay status={form.saveStatus} />
    </div>
  );
}
