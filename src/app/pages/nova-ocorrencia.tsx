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
import { useEffect, useLayoutEffect, useRef, useState } from "react";

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

  const headerRef = useRef<HTMLElement>(null);
  const [topBase, setTopBase] = useState(73);
  const [activeId, setActiveId] = useState<string | null>(null);

  useLayoutEffect(() => {
    function measure() {
      if (headerRef.current) setTopBase(headerRef.current.offsetHeight);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

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

  const sections = [
    { id: "section-viagem", title: "Dados da Viagem", show: !typeConfig.isGeneric || form.showSectionViagem },
    { id: "section-tripulacao", title: "Tripulação", show: showTripulacao },
    { id: "section-evento", title: "Dados do Evento", show: !typeConfig.isGeneric || form.showSectionDados },
    { id: "section-generico", title: "Detalhes do Relatório", show: typeConfig.isGeneric },
    { id: "section-evidencias", title: "Evidências", show: true },
    { id: "section-tratativa", title: "Análise e Tratativa", show: true },
  ];
  const visibleSections = sections.filter((s) => s.show);
  const visibleKey = visibleSections.map((s) => s.id).join("|");
  const sectionIndex = (id: string) => visibleSections.findIndex((s) => s.id === id);

  useEffect(() => {
    const ids = visibleSections.map((s) => s.id);
    function onScroll() {
      let current = ids[0] ?? null;
      const threshold = topBase + 16;
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.getBoundingClientRect().top <= threshold) current = id;
      });
      setActiveId(current);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topBase, visibleKey]);

  // Cada seção é um card único: cabeçalho (topo fixo) + corpo, com a borda
  // animada de luzes percorrendo o card inteiro quando está ativo.
  const sectionScrollMt = topBase + 8;

  function cardClass(id: string) {
    const active = activeId === id;
    return [
      "relative rounded-xl mb-5 transition-colors duration-300 border-[1.5px]",
      active
        ? "z-20 bg-blue-50 border-transparent section-glow"
        : "bg-white border-gray-200",
    ].join(" ");
  }

  function cardHeader(id: string) {
    const i = sectionIndex(id);
    if (i < 0) return null;
    const active = activeId === id;
    return (
      <button
        type="button"
        onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
        style={{ top: topBase - 1 }}
        className={[
          "sticky z-10 w-full h-11 flex items-center gap-3 px-4 rounded-t-[10px] text-left cursor-pointer transition-colors duration-300",
          active ? "bg-blue-50 text-blue-900" : "bg-white text-gray-700 hover:bg-gray-50",
        ].join(" ")}
      >
        <span
          className={[
            "flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0 transition-all duration-300",
            active ? "bg-blue-600 text-white scale-110" : "bg-gray-200 text-gray-500",
          ].join(" ")}
        >
          {i + 1}
        </span>
        <span className="text-sm font-semibold">{visibleSections[i].title}</span>
      </button>
    );
  }

  const validationErrors = form.getValidationErrors();

  function errorSectionId(id: string) {
    if (id.startsWith("section-")) return id;
    if (id === "field-report-title" || id === "field-relato") return "section-generico";
    return "section-evento";
  }

  function renderSectionGuide() {
    const pendingTotal = validationErrors.length;
    return (
      <div className="rounded-xl border border-gray-200 bg-white/90 backdrop-blur p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Seções
          </span>
          {pendingTotal > 0 ? (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingTotal} pendente{pendingTotal > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completo
            </span>
          )}
        </div>
        <nav className="space-y-0.5">
          {visibleSections.map((s, i) => {
            const errs = validationErrors.filter((e) => errorSectionId(e.id) === s.id);
            const active = activeId === s.id;
            const hasError = errs.length > 0;
            return (
              <div key={s.id}>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" })
                  }
                  className={[
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer",
                    active ? "bg-blue-50 text-blue-900" : "text-gray-600 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0",
                      active
                        ? "bg-blue-600 text-white"
                        : hasError
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-200 text-gray-500",
                    ].join(" ")}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium truncate flex-1">{s.title}</span>
                  {hasError ? (
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                      {errs.length}
                    </span>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  )}
                </button>
                {hasError && (
                  <ul className="mt-0.5 mb-1 ml-8 space-y-0.5">
                    {errs.map((err) => (
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
                )}
              </div>
            );
          })}
        </nav>
      </div>
    );
  }

  function scrollToField(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    // Posiciona o campo logo abaixo da navbar + cabeçalho fixo da seção (44px),
    // em vez de centralizar na tela.
    const offset = topBase + 44 + 16;
    const top = Math.max(0, window.scrollY + el.getBoundingClientRect().top - offset);
    window.scrollTo({ top, behavior: "smooth" });
    const focusable = el.querySelector<HTMLElement>("input, select, textarea, [role='combobox']");
    focusable?.focus({ preventScroll: true });
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
      <header ref={headerRef} className="bg-white border-b border-gray-200 sticky top-0 z-30">
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
                        : form.typeCode === "EXCESSO_PERMANENCIA"
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-6 lg:items-start">
        <div className="bg-white border border-gray-200 rounded-lg">
          <div id="nova-ocorrencia-form" className="p-6" onKeyDown={handleFormKeyDown}>

            <div className="space-y-8 mb-6">
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
            </div>

            {/* 1 — Dados da Viagem */}
            {(!typeConfig.isGeneric || form.showSectionViagem) && (
              <div
                id="section-viagem"
                className={cardClass("section-viagem")}
                style={{ scrollMarginTop: sectionScrollMt }}
              >
                {cardHeader("section-viagem")}
                <div className="px-5 pb-5 pt-2">
                  <SecaoDadosViagem
                    viagemSelecionada={form.viagemSelecionada}
                    onViagemChange={form.handleViagemChange}
                    isGeneric={typeConfig.isGeneric}
                  />

                  {/* 1b — Status do esquema (só DESCUMP_OP_PARADA_FORA) */}
                  {form.typeCode === "DESCUMP_OP_PARADA_FORA" && form.schemaStatus !== "idle" && (
                    <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
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
                </div>
              </div>
            )}

            {/* 2 — Tripulação */}
            {showTripulacao && (
              <div
                id="section-tripulacao"
                className={cardClass("section-tripulacao")}
                style={{ scrollMarginTop: sectionScrollMt }}
              >
                {cardHeader("section-tripulacao")}
                <div className="px-5 pb-5 pt-2">
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
              </div>
            )}

            {/* 3 — Dados do Evento */}
            {(!typeConfig.isGeneric || form.showSectionDados) && (
              <div
                id="section-evento"
                className={cardClass("section-evento")}
                style={{ scrollMarginTop: sectionScrollMt }}
              >
                {cardHeader("section-evento")}
                <div className="px-5 pb-5 pt-2">
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
                </div>
              </div>
            )}

            {/* 4 — Campos GENERICO */}
            {typeConfig.isGeneric && (
              <div
                id="section-generico"
                className={cardClass("section-generico")}
                style={{ scrollMarginTop: sectionScrollMt }}
              >
                {cardHeader("section-generico")}
                <div className="px-5 pb-5 pt-2">
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
                </div>
              </div>
            )}

            {/* 5 — Evidências */}
            <div
              id="section-evidencias"
              className={cardClass("section-evidencias")}
              style={{ scrollMarginTop: sectionScrollMt }}
            >
              {cardHeader("section-evidencias")}
              <div className="px-5 pb-5 pt-2">
                <EvidenciasGrid evidencias={form.evidencias} onChange={form.setEvidencias} />
              </div>
            </div>

            {/* 5.5 — Análise e Tratativa */}
            <div
              id="section-tratativa"
              className={cardClass("section-tratativa")}
              style={{ scrollMarginTop: sectionScrollMt }}
            >
              {cardHeader("section-tratativa")}
              <div className="px-5 pb-5 pt-2">
                <SecaoTratativa
                  tratativa={form.tratativa}
                  onTratativaChange={form.setTratativa}
                  analisadoPor={form.analisadoPor}
                  onAnalisadoPorChange={form.setAnalisadoPor}
                />
              </div>
            </div>

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
                  <div className="flex flex-col gap-1.5 lg:hidden">
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

          <aside
            className="hidden lg:block sticky self-start"
            style={{ top: topBase + 16 }}
          >
            {renderSectionGuide()}
          </aside>
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
