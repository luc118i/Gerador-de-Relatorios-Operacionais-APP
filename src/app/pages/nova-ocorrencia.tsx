import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Check,
  Plus,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { RichTextEditor } from "../components/RichTextEditor";
import {
  Viagem,
  Motorista,
  Evidencia,
  Ocorrencia,
  ViagemCatalog,
  EvidenceUploadInput,
} from "../types";
import { AutocompleteViagem } from "../components/autocomplete-viagem";
import { EvidenciasGrid } from "../components/evidencias-grid";

import { DriverPicker } from "../components/DriverPicker/DriverPicker";
import { DriverCreateModal } from "../components/DriverCreateModal/DriverCreateModal";
import type { Driver } from "../../domain/drivers";

import {
  useCreateOccurrence,
  useUpdateOccurrence,
} from "../../features/occurrences/queries/occurrences.queries";
import { buildOccurrencePayload } from "../../features/occurrences/buildOccurrencePayload";

import { getApiErrorMessage } from "../../api/http";
import { toast } from "sonner";

import { viagensCatalog } from "../../catalogs/viagens.catalog";

import { gerarTextoRelatorioIndividual } from "../utils/relatorio";

import { occurrencesApi } from "../../api/occurrences.api";
import { LocalPicker } from "../components/LocalPicker/LocalPicker";
import {
  OCCURRENCE_TYPES,
  getOccurrenceTypeConfig,
} from "../config/occurrenceTypes";

import type { Local } from "../../api/locais.api";

interface NovaOcorrenciaProps {
  onVoltar: () => void;
  onSaved: (args: { id: string; view: Ocorrencia }) => void;
  edicao?: Ocorrencia;
}

export function NovaOcorrencia({
  onVoltar,
  onSaved,
  edicao,
}: NovaOcorrenciaProps) {
  const [typeCode, setTypeCode] = useState("DESCUMP_OP_PARADA_FORA");
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);

  // Campos do tipo GENERICO (CCO)
  const [reportTitle, setReportTitle] = useState("");
  const [ccoOperator, setCcoOperator] = useState("");
  const [vehicleKm, setVehicleKm] = useState<number | null>(null);
  const [passengerCount, setPassengerCount] = useState<number | null>(null);
  const [passengerConnection, setPassengerConnection] = useState("");
  const [relatoHtml, setRelatoHtml] = useState("");
  const [devolutivaHtml, setDevolutivaHtml] = useState("");
  const [devolutivaStatus, setDevolutivaStatus] = useState<string>("EM_ANDAMENTO");
  const [devolutivaBeforeEvidences, setDevolutivaBeforeEvidences] = useState(false);
  const [showSectionViagem, setShowSectionViagem] = useState(true);
  const [showSectionIdentificacao, setShowSectionIdentificacao] = useState(true);
  const [showSectionDados, setShowSectionDados] = useState(true);
  const [showSectionTripulacao, setShowSectionTripulacao] = useState(true);
  const [showSectionPassageiros, setShowSectionPassageiros] = useState(true);
  const [motorista2Ativo, setMotorista2Ativo] = useState(false);
  const [dataEvento, setDataEvento] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [horarioInicial, setHorarioInicial] = useState("");
  const [horarioFinal, setHorarioFinal] = useState("");
  const [localParada, setLocalParada] = useState<Local | null>(null);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [driver1Id, setDriver1Id] = useState<string | null>(null);
  const [driver2Id, setDriver2Id] = useState<string | null>(null);

  // guardar o objeto selecionado para exibir/gerar texto sem depender do cache
  const [driver1, setDriver1] = useState<Driver | null>(null);
  const [driver2, setDriver2] = useState<Driver | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [createTarget, setCreateTarget] = useState<1 | 2 | null>(null);

  const [dataViagem, setDataViagem] = useState(
    new Date().toISOString().split("T")[0],
  );

  const isHorarioValido = () => {
    if (!horarioInicial || !horarioFinal) return true;
    const [hI, mI] = horarioInicial.split(":").map(Number);
    const [hF, mF] = horarioFinal.split(":").map(Number);
    const totalInicial = hI * 60 + mI;
    const totalFinal = hF * 60 + mF;
    return totalFinal > totalInicial;
  };
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success">(
    "idle",
  );
  const [viagemSelecionada, setViagemSelecionada] =
    useState<ViagemCatalog | null>(null);

  const isFormValido = () => {
    const typeConfig = getOccurrenceTypeConfig(typeCode);

    // Para GENERICO, seções ocultas dispensam seus campos da validação
    const sectionViagemAtiva  = !typeConfig.isGeneric || showSectionViagem;
    const sectionIdAtiva      = !typeConfig.isGeneric || showSectionIdentificacao;
    const sectionDadosAtiva   = !typeConfig.isGeneric || showSectionDados;
    const sectionTripAtiva    = !typeConfig.isGeneric || showSectionTripulacao;

    const driversOk = sectionTripAtiva
      ? !!driver1 && (!driver2Id || driver2Id !== driver1Id)
      : true;

    const localOk = sectionDadosAtiva && typeConfig.showPlace ? !!localParada : true;
    const speedOk = typeConfig.showSpeed ? speedKmh != null && speedKmh > 0 : true;
    const horarioOk = sectionDadosAtiva
      ? typeConfig.singleTime
        ? !!horarioInicial
        : !!horarioInicial && !!horarioFinal && isHorarioValido()
      : true;

    // reportTitle sempre obrigatório para GENERICO (campo independente de qualquer seção)
    const genericOk = typeConfig.isGeneric
      ? !!reportTitle.trim() && !!relatoHtml.trim()
      : true;

    const viagemOk = typeConfig.isGeneric
      ? !sectionViagemAtiva || !!viagemSelecionada
      : !!viagemSelecionada;

    const dataOk = sectionDadosAtiva ? !!(dataEvento && dataViagem) : true;
    const prefixoOk = sectionDadosAtiva ? !!vehicleNumber.trim() : true;

    return (
      viagemOk &&
      dataOk &&
      horarioOk &&
      localOk &&
      prefixoOk &&
      driversOk &&
      speedOk &&
      genericOk
    );
  };

  const [vehicleNumber, setVehicleNumber] = useState("");

  useEffect(() => {
    if (edicao) {
      // Casting da viagem para o tipo Viagem (o formato salvo na ocorrência)
      // Isso libera o acesso a .prefixo, .linha e .horario
      const viagemSalva = edicao.viagem as Viagem;

      // 1. Campos Simples
      setDataEvento(edicao.dataEvento);
      setDataViagem(edicao.dataViagem || edicao.dataEvento);
      setHorarioInicial(edicao.horarioInicial);
      setHorarioFinal(edicao.horarioFinal);
      setLocalParada(
        edicao.localParada ? { id: 0, nome: edicao.localParada } : null,
      );
      setVehicleNumber(viagemSalva.prefixo || "");
      if (edicao.typeCode) setTypeCode(edicao.typeCode);
      setSpeedKmh(edicao.speedKmh ?? null);

      // Campos GENERICO
      setReportTitle(edicao.reportTitle ?? "");
      setCcoOperator(edicao.ccoOperator ?? "");
      setVehicleKm(edicao.vehicleKm ?? null);
      setPassengerCount(edicao.passengerCount ?? null);
      setPassengerConnection(edicao.passengerConnection ?? "");
      setRelatoHtml(edicao.relatoHtml ?? "");
      setDevolutivaHtml(edicao.devolutivaHtml ?? "");
      setDevolutivaStatus(edicao.devolutivaStatus ?? "EM_ANDAMENTO");
      setDevolutivaBeforeEvidences(edicao.devolutivaBeforeEvidences ?? false);
      setShowSectionViagem(edicao.showSectionViagem ?? true);
      setShowSectionIdentificacao(edicao.showSectionIdentificacao ?? true);
      setShowSectionDados(edicao.showSectionDados ?? true);
      setShowSectionTripulacao(edicao.showSectionTripulacao ?? true);
      setShowSectionPassageiros(edicao.showSectionPassageiros ?? true);

      // 2. Viagem (Recuperando do Catálogo para o Autocomplete)
      const viagemNoCatalogo = viagensCatalog.rows.find(
        (v) => v.id === viagemSalva.id,
      );
      console.log("viagemSalva.id:", JSON.stringify(viagemSalva.id));
      console.log(
        "primeiro id do catálogo:",
        JSON.stringify(viagensCatalog.rows[0]?.id),
      );
      console.log("encontrou:", !!viagemNoCatalogo);

      if (viagemNoCatalogo) {
        setViagemSelecionada(viagemNoCatalogo);
      } else {
        // Reconstrói o objeto ViagemCatalog a partir da string salva
        // Garante que o split não falhe se a linha for uma string vazia
        const [codigo, ...resto] = (viagemSalva.linha || "").split(" - ");

        setViagemSelecionada({
          id: viagemSalva.id,
          codigoLinha: codigo || "",
          nomeLinha: resto.join(" - ") || "",
          horaPartida: viagemSalva.horario,
          sentido: "",
        } as ViagemCatalog);
      }

      // 3. Motoristas
      if (edicao.motorista1) {
        setDriver1Id(edicao.motorista1.id);
        setDriver1({
          id: edicao.motorista1.id,
          code: edicao.motorista1.matricula,
          name: edicao.motorista1.nome,
          base: edicao.motorista1.base,
        } as any);
      }

      if (edicao.motorista2) {
        setMotorista2Ativo(true);
        setDriver2Id(edicao.motorista2.id);
        setDriver2({
          id: edicao.motorista2.id,
          code: edicao.motorista2.matricula,
          name: edicao.motorista2.nome,
          base: edicao.motorista2.base,
        } as any);
      }

      // 4. Evidências
      if (edicao.evidencias?.length > 0) {
        setEvidencias(
          edicao.evidencias.map((ev) => ({
            id: ev.id,
            url: ev.url,
            legenda: ev.legenda || "",
            linkTexto: ev.linkTexto || "",
            linkUrl: ev.linkUrl || "",
          })),
        );
      }
    }
  }, [edicao]);

  useEffect(() => {
    const onPaste = (ev: ClipboardEvent) => {
      const items = ev.clipboardData?.items;
      if (!items) return;

      const images: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) images.push(file);
        }
      }

      if (!images.length) return;

      ev.preventDefault();

      setEvidencias((prev) => {
        const next = [...prev];
        for (const f of images) {
          next.push({
            id: crypto.randomUUID(),
            url: URL.createObjectURL(f),
            file: f,
            legenda: "",
          });
        }
        return next;
      });

      toast.success(`${images.length} print(s) colado(s) em Evidências`);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Dentro da função NovaOcorrencia, adicione este efeito:

  useEffect(() => {
    // Se não houver viagem ou se estivermos em modo de EDIÇÃO (onde os dados vêm do banco), não auto-preenchemos
    if (!viagemSelecionada || edicao) return;

    // 1. Verificar se a viagem no catálogo possui motoristas
    // Assumindo que seu objeto ViagemCatalog tenha algo como motorista1 e motorista2
    const v = viagemSelecionada as any; // Usando any temporário para checar propriedades extras

    if (v.motorista1) {
      setDriver1Id(v.motorista1.id);
      setDriver1({
        id: v.motorista1.id,
        code: v.motorista1.matricula || v.motorista1.code,
        name: v.motorista1.nome || v.motorista1.name,
        base: v.motorista1.base,
      } as Driver);
    }

    if (v.motorista2) {
      setMotorista2Ativo(true);
      setDriver2Id(v.motorista2.id);
      setDriver2({
        id: v.motorista2.id,
        code: v.motorista2.matricula || v.motorista2.code,
        name: v.motorista2.nome || v.motorista2.name,
        base: v.motorista2.base,
      } as Driver);
    } else {
      setMotorista2Ativo(false);
      setDriver2Id(null);
      setDriver2(null);
    }
  }, [viagemSelecionada, edicao]);

  useEffect(() => {
    if (saveStatus !== "idle") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [saveStatus]);

  const handleSalvar = async () => {
    if (!isFormValido()) return;

    const typeConfig = getOccurrenceTypeConfig(typeCode);

    // Para GENERICO sem seção de viagem, viagem não é obrigatória
    if (!typeConfig.isGeneric && !viagemSelecionada) return;

    // FORÇA O STATUS DE SAVING NO INÍCIO
    setSaveStatus("saving");

    await new Promise((resolve) => setTimeout(resolve, 500));

    const lineLabel = viagemSelecionada
      ? `${viagemSelecionada.codigoLinha} - ${viagemSelecionada.nomeLinha}`
      : "";

    try {
      const payload = buildOccurrencePayload({
        driver1Id,
        driver2Id,
        motorista2Ativo,
        eventDate: dataEvento || new Date().toISOString().split("T")[0],
        tripDate: dataViagem || dataEvento || new Date().toISOString().split("T")[0],
        startTime: horarioInicial || "00:00",
        endTime: horarioFinal || horarioInicial || "00:00",
        place: localParada?.nome ?? "",
        vehicleNumber: vehicleNumber || "0",
        tripId: viagemSelecionada?.id,
        tripTime: viagemSelecionada?.horaPartida ?? null,
        lineLabel,
        typeCode,
        speedKmh,
        // GENERICO
        reportTitle: typeConfig.isGeneric ? reportTitle : null,
        ccoOperator: typeConfig.isGeneric ? ccoOperator : null,
        vehicleKm: typeConfig.isGeneric ? vehicleKm : null,
        passengerCount: typeConfig.isGeneric ? passengerCount : null,
        passengerConnection: typeConfig.isGeneric ? passengerConnection : null,
        relatoHtml: typeConfig.isGeneric ? relatoHtml : null,
        devolutivaHtml: typeConfig.isGeneric ? devolutivaHtml || null : null,
        devolutivaStatus: typeConfig.isGeneric ? devolutivaStatus : null,
        showSectionViagem: typeConfig.isGeneric ? showSectionViagem : true,
        showSectionIdentificacao: typeConfig.isGeneric ? showSectionIdentificacao : true,
        showSectionDados: typeConfig.isGeneric ? showSectionDados : true,
        showSectionTripulacao: typeConfig.isGeneric ? showSectionTripulacao : true,
        showSectionPassageiros: typeConfig.isGeneric ? showSectionPassageiros : true,
        devolutivaBeforeEvidences: typeConfig.isGeneric ? devolutivaBeforeEvidences : false,
      });

      let resultId: string;

      if (edicao?.id) {
        await updateOccurrence.mutateAsync({ id: edicao.id, input: payload });
        resultId = edicao.id;
      } else {
        const created = await createOccurrence.mutateAsync(payload);
        resultId = created.id;
      }

      const evidencesToUpload: EvidenceUploadInput[] = evidencias
        .filter((e) => e.file)
        .map((e) => ({
          file: e.file!,
          caption: e.legenda ?? undefined,
          linkTexto: e.linkTexto ?? undefined,
          linkUrl: e.linkUrl ?? undefined,
        }));

      if (evidencesToUpload.length) {
        await occurrencesApi.uploadEvidences(resultId, evidencesToUpload);
      }

      const existingEvidences = evidencias.filter((e) => !e.file && e.id);
      await Promise.all(
        existingEvidences.map((e) =>
          occurrencesApi.updateEvidenceCaption(
            resultId,
            e.id,
            e.legenda ?? "",
          ),
        ),
      );

      const novaOcorrenciaView: Ocorrencia = {
        id: resultId,
        typeCode,
        typeTitle: typeConfig.title,
        viagem: viagemSelecionada ? toViagemView(viagemSelecionada) : { id: "", linha: "", prefixo: vehicleNumber || "0", horario: "" },
        motorista1: toMotoristaView(driver1)!,
        motorista2: motorista2Ativo ? toMotoristaView(driver2) : undefined,
        dataEvento,
        dataViagem,
        horarioInicial,
        horarioFinal,
        localParada: localParada?.nome ?? "",
        speedKmh: typeConfig.showSpeed ? speedKmh : null,
        evidencias,
        createdAt: edicao?.createdAt || new Date().toISOString(),
        // GENERICO
        reportTitle: typeConfig.isGeneric ? reportTitle : null,
        ccoOperator: typeConfig.isGeneric ? ccoOperator : null,
        vehicleKm: typeConfig.isGeneric ? vehicleKm : null,
        passengerCount: typeConfig.isGeneric ? passengerCount : null,
        passengerConnection: typeConfig.isGeneric ? passengerConnection || null : null,
        relatoHtml: typeConfig.isGeneric ? relatoHtml : null,
        devolutivaHtml: typeConfig.isGeneric ? devolutivaHtml || null : null,
        devolutivaStatus: typeConfig.isGeneric ? devolutivaStatus : null,
        showSectionViagem: typeConfig.isGeneric ? showSectionViagem : true,
        showSectionIdentificacao: typeConfig.isGeneric ? showSectionIdentificacao : true,
        showSectionDados: typeConfig.isGeneric ? showSectionDados : true,
        showSectionTripulacao: typeConfig.isGeneric ? showSectionTripulacao : true,
        showSectionPassageiros: typeConfig.isGeneric ? showSectionPassageiros : true,
        devolutivaBeforeEvidences: typeConfig.isGeneric ? devolutivaBeforeEvidences : false,
      };

      // TRANSIÇÃO PARA SUCESSO
      setSaveStatus("success");

      // Delay para o usuário ver o "visto" verde antes de fechar a tela
      setTimeout(() => {
        onSaved({ id: resultId, view: novaOcorrenciaView });
      }, 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus("idle"); // Se der erro, volta ao normal para o usuário corrigir
      toast.error(getApiErrorMessage(e));
    }
  };

  const createOccurrence = useCreateOccurrence();
  const updateOccurrence = useUpdateOccurrence();

  function handleTypeChange(code: string) {
    setTypeCode(code);
    setSpeedKmh(null);
    setLocalParada(null);
    setReportTitle("");
    setCcoOperator("");
    setVehicleKm(null);
    setPassengerCount(null);
    setPassengerConnection("");
    setRelatoHtml("");
    setDevolutivaHtml("");
    setDevolutivaStatus("EM_ANDAMENTO");
    setDevolutivaBeforeEvidences(false);
    setShowSectionViagem(true);
    setShowSectionIdentificacao(true);
    setShowSectionDados(true);
    setShowSectionTripulacao(true);
    setShowSectionPassageiros(true);
  }

  function toViagemView(v: ViagemCatalog): Viagem {
    const parts = (v.nomeLinha ?? "").split(" - ").map((s) => s.trim());
    const origem = parts[0] ?? "—";
    const destino = parts[1] ?? "—";

    return {
      id: v.id,
      linha: `${v.codigoLinha} - ${v.nomeLinha}`,
      prefixo: vehicleNumber,
      horario: v.horaPartida,
      origem,
      destino,
    };
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
                    getOccurrenceTypeConfig(typeCode).isGeneric
                      ? "bg-orange-100 text-orange-700 border border-orange-200"
                      : typeCode === "EXCESSO_VELOCIDADE"
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {getOccurrenceTypeConfig(typeCode).title}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg">

          <div className="p-6 space-y-8">

          {/* ── Bloco 0 — Tipo de Ocorrência ── */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Tipo de Ocorrência
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Selecione o tipo antes de preencher os dados — o formulário se adapta automaticamente.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {OCCURRENCE_TYPES.map((t) => {
                const selected = typeCode === t.code;
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => handleTypeChange(t.code)}
                    className={`cursor-pointer flex flex-col items-start gap-1 p-4 rounded-lg border-2 text-left w-full transition-all duration-200 ${
                      selected
                        ? t.isGeneric
                          ? "border-orange-500 bg-orange-50 shadow-sm"
                          : t.code === "EXCESSO_VELOCIDADE"
                            ? "border-red-500 bg-red-50 shadow-sm"
                            : "border-blue-600 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold leading-tight ${
                        selected
                          ? t.isGeneric
                            ? "text-orange-700"
                            : t.code === "EXCESSO_VELOCIDADE"
                              ? "text-red-700"
                              : "text-blue-700"
                          : "text-gray-800"
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="text-xs text-gray-500 leading-snug">
                      {t.description}
                    </span>
                    {selected && (
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${
                          t.isGeneric
                            ? "text-orange-600"
                            : t.code === "EXCESSO_VELOCIDADE"
                              ? "text-red-600"
                              : "text-blue-600"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        Selecionado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Bloco 0b — Composição do Relatório (só GENERICO, animado) ── */}
          {getOccurrenceTypeConfig(typeCode).isGeneric && (
            <section
              className="animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Composição do Relatório
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Defina quais blocos aparecerão no PDF gerado
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-medium tabular-nums">
                  {[showSectionViagem, showSectionIdentificacao, showSectionDados, showSectionTripulacao, showSectionPassageiros].filter(Boolean).length}
                  {" / 5 seções ativas"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    label: "Dados da Viagem",
                    sub: "Linha, itinerário e horário da viagem",
                    value: showSectionViagem,
                    setter: setShowSectionViagem,
                  },
                  {
                    label: "Identificação do Relatório",
                    sub: "Nome do relatório, operador CCO e KM",
                    value: showSectionIdentificacao,
                    setter: setShowSectionIdentificacao,
                  },
                  {
                    label: "Dados da Ocorrência",
                    sub: "Data, horário, local e prefixo",
                    value: showSectionDados,
                    setter: setShowSectionDados,
                  },
                  {
                    label: "Tripulação",
                    sub: "Motoristas vinculados à ocorrência",
                    value: showSectionTripulacao,
                    setter: setShowSectionTripulacao,
                  },
                  {
                    label: "Passageiros",
                    sub: "Quantidade e passageiros em conexão",
                    value: showSectionPassageiros,
                    setter: setShowSectionPassageiros,
                  },
                ].map(({ label, sub, value, setter }) => (
                  <label
                    key={label}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      value
                        ? "border-orange-200 bg-orange-50/50"
                        : "border-gray-200 bg-gray-50 opacity-60"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500">{sub}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setter(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer ml-4 flex-shrink-0"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Bloco 1 - Dados da Viagem
               • Para GENERICO: visível apenas se showSectionViagem
               • Para outros tipos: sempre visível
          */}
          {(!getOccurrenceTypeConfig(typeCode).isGeneric || showSectionViagem) && (
          <section className={getOccurrenceTypeConfig(typeCode).isGeneric ? "animate-in fade-in slide-in-from-top-2 duration-300" : ""}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Dados da Viagem
            </h2>
            <div className="space-y-4">
              <AutocompleteViagem
                viagens={viagensCatalog.rows}
                value={viagemSelecionada}
                onChange={(v) => {
                  setViagemSelecionada(v);
                  setMotorista2Ativo(false);

                  setDriver1Id(null);
                  setDriver2Id(null);
                  setDriver1(null);
                  setDriver2(null);
                  setShowPreview(false);
                }}
              />

              {viagemSelecionada && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="text-xs text-gray-600">Linha</label>
                    <p className="font-medium text-gray-900">
                      {viagemSelecionada.codigoLinha} -{" "}
                      {viagemSelecionada.nomeLinha}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600">
                      Horário da Viagem
                    </label>
                    <p className="font-medium text-gray-900">
                      {viagemSelecionada.horaPartida}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">Sentido</label>
                    <p className="font-medium text-gray-900">
                      {viagemSelecionada.sentido}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
          )}{/* /showSectionViagem condicional */}

          {/* Bloco 2 - Motoristas
               • Tipos normais: aparece apenas após viagem selecionada
               • GENERICO: aparece sempre (independe de viagem), controlado por showSectionTripulacao
          */}
          {(getOccurrenceTypeConfig(typeCode).isGeneric
            ? showSectionTripulacao
            : !!viagemSelecionada
          ) && (
            <section className={getOccurrenceTypeConfig(typeCode).isGeneric ? "animate-in fade-in slide-in-from-top-2 duration-300" : ""}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Tripulação
              </h2>

              <div className="space-y-4">
                <DriverPicker
                  label="Motorista 01"
                  required
                  value={driver1Id}
                  initialDriver={
                    driver1
                      ? {
                          id: driver1.id,
                          code: driver1.code,
                          name: driver1.name,
                          base: driver1.base ?? "",
                        }
                      : undefined
                  }
                  excludedIds={driver2Id ? [driver2Id] : []}
                  onChange={(id, d) => {
                    setDriver1Id(id);
                    setDriver1(d ?? null);
                    if (id && driver2Id === id) {
                      setDriver2Id(null);
                      setDriver2(null);
                    }
                  }}
                  onCreateRequested={() => {
                    setCreateTarget(1);
                    setIsDriverModalOpen(true);
                  }}
                />

                {motorista2Ativo ? (
                  <div className="relative">
                    <DriverPicker
                      label="Motorista 02"
                      value={driver2Id}
                      initialDriver={
                        driver2
                          ? {
                              id: driver2.id,
                              code: driver2.code,
                              name: driver2.name,
                              base: driver2.base ?? "",
                            }
                          : undefined
                      }
                      excludedIds={driver1Id ? [driver1Id] : []}
                      onChange={(id, d) => {
                        setDriver2Id(id);
                        setDriver2(d ?? null);
                        if (id && driver1Id === id) {
                          setDriver2Id(null);
                          setDriver2(null);
                        }
                      }}
                      onCreateRequested={() => {
                        setCreateTarget(2);
                        setIsDriverModalOpen(true);
                      }}
                    />

                    <button
                      onClick={() => {
                        setMotorista2Ativo(false);
                        setDriver2Id(null);
                        setDriver2(null);
                      }}
                      className="cursor-pointer absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remover Motorista 02"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setMotorista2Ativo(true)}
                    className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Motorista 02
                  </button>
                )}

                {/* Mensagem de duplicidade (UX) */}
                {driver1Id && driver2Id && driver1Id === driver2Id ? (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    Motorista 01 e 02 não podem ser o mesmo.
                  </div>
                ) : null}
              </div>

              {/* Modal de cadastro */}
              <DriverCreateModal
                open={isDriverModalOpen}
                onOpenChange={(open) => {
                  setIsDriverModalOpen(open);
                  if (!open) setCreateTarget(null);
                }}
                onCreated={(created) => {
                  if (createTarget === 1) {
                    setDriver1Id(created.id);
                    setDriver1(created);
                    // se por algum motivo colidir, limpa o 02
                    if (driver2Id === created.id) {
                      setDriver2Id(null);
                      setDriver2(null);
                    }
                  } else if (createTarget === 2) {
                    setDriver2Id(created.id);
                    setDriver2(created);
                    if (driver1Id === created.id) {
                      setDriver2Id(null);
                      setDriver2(null);
                    }
                  }
                }}
              />
            </section>
          )}

          {/* Bloco 3 - Dados do Evento
               • Para GENERICO: visível apenas se showSectionDados estiver ativo
               • Para outros tipos: sempre visível
          */}
          {(!getOccurrenceTypeConfig(typeCode).isGeneric || showSectionDados) && (
          <section className={getOccurrenceTypeConfig(typeCode).isGeneric ? "animate-in fade-in slide-in-from-top-2 duration-300" : ""}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Dados do Evento
            </h2>
            <div className="space-y-4">
              {getOccurrenceTypeConfig(typeCode).singleTime ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data do Evento *
                    </label>
                    <input
                      type="date"
                      value={dataEvento}
                      onChange={(e) => setDataEvento(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data da Viagem *
                    </label>
                    <input
                      type="date"
                      value={dataViagem}
                      onChange={(e) => setDataViagem(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horário do Evento *
                    </label>
                    <input
                      type="time"
                      value={horarioInicial}
                      onChange={(e) => {
                        setHorarioInicial(e.target.value);
                        setHorarioFinal(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data do Evento *
                      </label>
                      <input
                        type="date"
                        value={dataEvento}
                        onChange={(e) => setDataEvento(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data da Viagem *
                      </label>
                      <input
                        type="date"
                        value={dataViagem}
                        onChange={(e) => setDataViagem(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horário Inicial *
                      </label>
                      <input
                        type="time"
                        value={horarioInicial}
                        onChange={(e) => setHorarioInicial(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horário Final *
                      </label>
                      <input
                        type="time"
                        value={horarioFinal}
                        onChange={(e) => setHorarioFinal(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                          !isHorarioValido()
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                      />
                    </div>
                  </div>

                  {!isHorarioValido() && horarioInicial && horarioFinal && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                      <AlertCircle className="w-4 h-4" />
                      Horário final deve ser posterior ao horário inicial
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prefixo do Veículo *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="Ex: 24615"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {getOccurrenceTypeConfig(typeCode).showPlace && (
                <div>
                  {getOccurrenceTypeConfig(typeCode).isGeneric ? (
                    // GENERICO: campo de texto livre para o local da ocorrência
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Local da Ocorrência
                      </label>
                      <input
                        type="text"
                        value={localParada?.nome ?? ""}
                        onChange={(e) =>
                          setLocalParada(
                            e.target.value
                              ? { id: 0, nome: e.target.value }
                              : null,
                          )
                        }
                        placeholder="Ex: Campinas – SP, Rodoviária de Curitiba..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </>
                  ) : (
                    // Demais tipos: seletor de local cadastrado
                    <LocalPicker
                      value={localParada}
                      onChange={setLocalParada}
                      required
                    />
                  )}
                </div>
              )}

              {getOccurrenceTypeConfig(typeCode).showSpeed && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Velocidade Atingida (km/h) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={speedKmh ?? ""}
                    onChange={(e) =>
                      setSpeedKmh(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="Ex: 92"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </section>
          )}{/* /showSectionDados condicional */}

          {/* Bloco 4 - Campos GENERICO */}
          {getOccurrenceTypeConfig(typeCode).isGeneric && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">

              {/* Nome do Relatório — SEMPRE visível, independente de qualquer seção */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Nome do Relatório
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Relatório *
                  </label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Ex: Atendimento Especial, Acidente, Pane Mecânica..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </section>

              {/* Identificação do Relatório — visível apenas se showSectionIdentificacao */}
              {showSectionIdentificacao && (
              <section className="animate-in fade-in slide-in-from-top-2 duration-300">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Identificação do Relatório
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operador CCO
                    </label>
                    <input
                      type="text"
                      value={ccoOperator}
                      onChange={(e) => setCcoOperator(e.target.value)}
                      placeholder="Ex: Paulo Cesar"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      KM do Veículo
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={vehicleKm ?? ""}
                      onChange={(e) =>
                        setVehicleKm(e.target.value ? Number(e.target.value) : null)
                      }
                      placeholder="Ex: 526178"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>
              )}{/* /showSectionIdentificacao */}

              {/* Passageiros — visível apenas se showSectionPassageiros */}
              {showSectionPassageiros && (
              <section className="animate-in fade-in slide-in-from-top-2 duration-300">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Passageiros
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Qtd. Passageiros
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={passengerCount ?? ""}
                      onChange={(e) =>
                        setPassengerCount(
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      placeholder="Ex: 15"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passageiros Conexão
                    </label>
                    <input
                      type="text"
                      value={passengerConnection}
                      onChange={(e) => setPassengerConnection(e.target.value)}
                      placeholder="Ex: 3 ou —"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>
              )}{/* /showSectionPassageiros */}

              {/* Relato da Ocorrência */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Relato da Ocorrência
                  <span className="text-red-500 ml-1">*</span>
                </h2>
                <RichTextEditor
                  value={relatoHtml}
                  onChange={setRelatoHtml}
                  placeholder="Descreva o que ocorreu..."
                  minHeight="150px"
                />
              </section>

              {/* Devolutiva / Solução Adotada */}
              <section>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Devolutiva / Solução Adotada
                    <span className="text-sm font-normal text-gray-400 ml-2">
                      (opcional)
                    </span>
                  </h2>
                  {/* Toggle posição no PDF */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 select-none">
                    <span className={devolutivaBeforeEvidences ? "text-gray-400" : "font-medium text-gray-700"}>
                      Após evidências
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={devolutivaBeforeEvidences}
                      onClick={() => setDevolutivaBeforeEvidences((v) => !v)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        devolutivaBeforeEvidences ? "bg-blue-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                          devolutivaBeforeEvidences ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className={devolutivaBeforeEvidences ? "font-medium text-gray-700" : "text-gray-400"}>
                      Antes das evidências
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={devolutivaStatus}
                      onChange={(e) => setDevolutivaStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="EM_ANDAMENTO">⚠️ Em Andamento</option>
                      <option value="RESOLVIDO">✅ Resolvido</option>
                    </select>
                  </div>
                  <RichTextEditor
                    value={devolutivaHtml}
                    onChange={setDevolutivaHtml}
                    placeholder="Descreva a solução adotada..."
                    minHeight="100px"
                  />
                </div>
              </section>
            </div>
          )}

          {/* Bloco 5 - Evidências */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Evidências
            </h2>
            <EvidenciasGrid evidencias={evidencias} onChange={setEvidencias} />
          </section>

          {/* Bloco 5 - Ações */}
          <section className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleSalvar}
                disabled={!isFormValido() || saveStatus !== "idle"}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isFormValido() && saveStatus === "idle"
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {saveStatus === "saving" ? (
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

              {/* Feedback de validação inline */}
              {!isFormValido() && saveStatus === "idle" && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Preencha os campos obrigatórios para continuar
                </p>
              )}
            </div>
          </section>

          </div>{/* /p-6 space-y-8 */}
        </div>{/* /bg-white rounded-lg */}
      </main>

      {/* Preview Modal */}
      {showPreview && viagemSelecionada && driver1 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Relatório Individual
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="cursor-pointerp-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
                {gerarTextoRelatorioIndividual({
                  id: "temp",
                  viagem: viagemSelecionada ? toViagemView(viagemSelecionada) : { id: "", linha: "", prefixo: vehicleNumber || "0", horario: "" },

                  motorista1: toMotoristaView(driver1)!,
                  motorista2: motorista2Ativo
                    ? toMotoristaView(driver2)
                    : undefined,

                  dataEvento,
                  dataViagem,
                  horarioInicial,
                  horarioFinal,
                  localParada: localParada?.nome ?? "",
                  evidencias,
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

      {/* Overlay de Status (Aguarde / Sucesso) */}
      {saveStatus !== "idle" && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center 
                  bg-black/50 backdrop-blur-md 
                  transition-opacity duration-300"
        >
          <div
            className="bg-white px-10 py-12 rounded-2xl shadow-2xl 
                    flex flex-col items-center text-center
                    animate-in fade-in zoom-in-95 duration-200"
          >
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-6" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Aguarde
                </h3>
                <p className="text-gray-500">Salvando a ocorrência...</p>
              </>
            ) : (
              <>
                <div
                  className="w-20 h-20 bg-green-100 rounded-full 
                          flex items-center justify-center mb-6"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Pronto!
                </h3>
                <p className="text-gray-500">Ocorrência salva com sucesso.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function toMotoristaView(d: Driver | null): Motorista | undefined {
  if (!d) return undefined;
  return {
    id: d.id,
    matricula: d.code,
    nome: d.name,
    base: d.base ?? "",
  };
}
