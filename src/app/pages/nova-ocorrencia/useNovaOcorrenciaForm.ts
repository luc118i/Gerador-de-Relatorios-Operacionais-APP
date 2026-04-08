import { useState, useEffect } from "react";
import { toast } from "sonner";
import type {
  Viagem,
  Motorista,
  Evidencia,
  Ocorrencia,
  ViagemCatalog,
  EvidenceUploadInput,
} from "../../types";
import type { Driver } from "../../../domain/drivers";
import type { Local } from "../../../api/locais.api";
import {
  useCreateOccurrence,
  useUpdateOccurrence,
} from "../../../features/occurrences/queries/occurrences.queries";
import { buildOccurrencePayload } from "../../../features/occurrences/buildOccurrencePayload";
import { getApiErrorMessage } from "../../../api/http";
import { viagensCatalog } from "../../../catalogs/viagens.catalog";
import { occurrencesApi } from "../../../api/occurrences.api";
import { getOccurrenceTypeConfig } from "../../config/occurrenceTypes";

interface NovaOcorrenciaProps {
  onVoltar: () => void;
  onSaved: (args: { id: string; view: Ocorrencia }) => void;
  edicao?: Ocorrencia;
}

export function useNovaOcorrenciaForm({ onSaved, edicao }: NovaOcorrenciaProps) {
  const today = new Date().toISOString().split("T")[0];

  // ── Tipo ─────────────────────────────────────────────────────────────────
  const [typeCode, setTypeCode] = useState("DESCUMP_OP_PARADA_FORA");
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);

  // ── Campos GENERICO ──────────────────────────────────────────────────────
  const [reportTitle, setReportTitle] = useState("");
  const [ccoOperator, setCcoOperator] = useState("");
  const [vehicleKm, setVehicleKm] = useState<number | null>(null);
  const [passengerCount, setPassengerCount] = useState<number | null>(null);
  const [passengerConnection, setPassengerConnection] = useState("");
  const [relatoHtml, setRelatoHtml] = useState("");
  const [devolutivaHtml, setDevolutivaHtml] = useState("");
  const [devolutivaStatus, setDevolutivaStatus] = useState<string>("EM_ANDAMENTO");
  const [devolutivaBeforeEvidences, setDevolutivaBeforeEvidences] = useState(false);

  // ── Seções GENERICO ──────────────────────────────────────────────────────
  const [showSectionViagem, setShowSectionViagem] = useState(true);
  const [showSectionIdentificacao, setShowSectionIdentificacao] = useState(true);
  const [showSectionDados, setShowSectionDados] = useState(true);
  const [showSectionTripulacao, setShowSectionTripulacao] = useState(true);
  const [showSectionPassageiros, setShowSectionPassageiros] = useState(true);

  // ── Dados do evento ──────────────────────────────────────────────────────
  const [dataEvento, setDataEvento] = useState(today);
  const [dataViagem, setDataViagem] = useState(today);
  const [horarioInicial, setHorarioInicial] = useState("");
  const [horarioFinal, setHorarioFinal] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [localParada, setLocalParada] = useState<Local | null>(null);

  // ── Viagem e motoristas ──────────────────────────────────────────────────
  const [viagemSelecionada, setViagemSelecionada] = useState<ViagemCatalog | null>(null);
  const [motorista2Ativo, setMotorista2Ativo] = useState(false);
  const [driver1Id, setDriver1Id] = useState<string | null>(null);
  const [driver2Id, setDriver2Id] = useState<string | null>(null);
  const [driver1, setDriver1] = useState<Driver | null>(null);
  const [driver2, setDriver2] = useState<Driver | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [createTarget, setCreateTarget] = useState<1 | 2 | null>(null);

  // ── Evidências ───────────────────────────────────────────────────────────
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);

  // ── UI ───────────────────────────────────────────────────────────────────
  const [showPreview, setShowPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success">("idle");
  const [triedSave, setTriedSave] = useState(false);

  // ── Mutations ────────────────────────────────────────────────────────────
  const createOccurrence = useCreateOccurrence();
  const updateOccurrence = useUpdateOccurrence();

  // ── Helpers ──────────────────────────────────────────────────────────────
  function isHorarioValido(): boolean {
    if (!horarioInicial || !horarioFinal) return true;
    const [hI, mI] = horarioInicial.split(":").map(Number);
    const [hF, mF] = horarioFinal.split(":").map(Number);
    return hF * 60 + mF > hI * 60 + mI;
  }

  function isFormValido(): boolean {
    const typeConfig = getOccurrenceTypeConfig(typeCode);

    const sectionViagemAtiva = !typeConfig.isGeneric || showSectionViagem;
    const sectionIdAtiva     = !typeConfig.isGeneric || showSectionIdentificacao;
    const sectionDadosAtiva  = !typeConfig.isGeneric || showSectionDados;
    const sectionTripAtiva   = !typeConfig.isGeneric || showSectionTripulacao;

    // suppress unused warning
    void sectionIdAtiva;

    const driversOk = sectionTripAtiva
      ? !!driver1 && (!driver2Id || driver2Id !== driver1Id)
      : true;

    const localOk   = sectionDadosAtiva && typeConfig.showPlace ? !!localParada : true;
    const speedOk   = typeConfig.showSpeed ? speedKmh != null && speedKmh > 0 : true;
    const horarioOk = sectionDadosAtiva
      ? typeConfig.singleTime
        ? !!horarioInicial
        : !!horarioInicial && !!horarioFinal && isHorarioValido()
      : true;

    const genericOk = typeConfig.isGeneric
      ? !!reportTitle.trim() && !!relatoHtml.trim() && !!devolutivaHtml.trim()
      : true;

    const viagemOk = typeConfig.isGeneric
      ? !sectionViagemAtiva || !!viagemSelecionada
      : !!viagemSelecionada;

    const dataOk    = sectionDadosAtiva ? !!(dataEvento && dataViagem) : true;
    const prefixoOk = sectionDadosAtiva ? !!vehicleNumber.trim() : true;

    return viagemOk && dataOk && horarioOk && localOk && prefixoOk && driversOk && speedOk && genericOk;
  }

  function toViagemView(v: ViagemCatalog): Viagem {
    const parts = (v.nomeLinha ?? "").split(" - ").map((s) => s.trim());
    return {
      id: v.id,
      linha: `${v.codigoLinha} - ${v.nomeLinha}`,
      prefixo: vehicleNumber,
      horario: v.horaPartida,
      origem: parts[0] ?? "—",
      destino: parts[1] ?? "—",
    };
  }

  function toMotoristaView(d: Driver | null): Motorista | undefined {
    if (!d) return undefined;
    return { id: d.id, matricula: d.code, nome: d.name, base: d.base ?? "" };
  }

  // ── Efeito: carregar dados da edição ─────────────────────────────────────
  useEffect(() => {
    if (!edicao) return;

    const viagemSalva = edicao.viagem as Viagem;

    setDataEvento(edicao.dataEvento);
    setDataViagem(edicao.dataViagem || edicao.dataEvento);
    setHorarioInicial(edicao.horarioInicial);
    setHorarioFinal(edicao.horarioFinal);
    setLocalParada(edicao.localParada ? { id: 0, nome: edicao.localParada } : null);
    setVehicleNumber(viagemSalva.prefixo || "");
    if (edicao.typeCode) setTypeCode(edicao.typeCode);
    setSpeedKmh(edicao.speedKmh ?? null);

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

    const viagemNoCatalogo = viagensCatalog.rows.find((v) => v.id === viagemSalva.id);
    if (viagemNoCatalogo) {
      setViagemSelecionada(viagemNoCatalogo);
    } else {
      const [codigo, ...resto] = (viagemSalva.linha || "").split(" - ");
      setViagemSelecionada({
        id: viagemSalva.id,
        codigoLinha: codigo || "",
        nomeLinha: resto.join(" - ") || "",
        horaPartida: viagemSalva.horario,
        sentido: "",
      } as ViagemCatalog);
    }

    if (edicao.motorista1) {
      setDriver1Id(edicao.motorista1.id);
      setDriver1({ id: edicao.motorista1.id, code: edicao.motorista1.matricula, name: edicao.motorista1.nome, base: edicao.motorista1.base } as Driver);
    }

    if (edicao.motorista2) {
      setMotorista2Ativo(true);
      setDriver2Id(edicao.motorista2.id);
      setDriver2({ id: edicao.motorista2.id, code: edicao.motorista2.matricula, name: edicao.motorista2.nome, base: edicao.motorista2.base } as Driver);
    }

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
  }, [edicao]);

  // ── Efeito: paste de imagens ──────────────────────────────────────────────
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
          next.push({ id: crypto.randomUUID(), url: URL.createObjectURL(f), file: f, legenda: "" });
        }
        return next;
      });
      toast.success(`${images.length} print(s) colado(s) em Evidências`);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // ── Efeito: auto-fill motoristas da viagem ───────────────────────────────
  useEffect(() => {
    if (!viagemSelecionada || edicao) return;
    const v = viagemSelecionada as any;

    if (v.motorista1) {
      setDriver1Id(v.motorista1.id);
      setDriver1({ id: v.motorista1.id, code: v.motorista1.matricula || v.motorista1.code, name: v.motorista1.nome || v.motorista1.name, base: v.motorista1.base } as Driver);
    }

    if (v.motorista2) {
      setMotorista2Ativo(true);
      setDriver2Id(v.motorista2.id);
      setDriver2({ id: v.motorista2.id, code: v.motorista2.matricula || v.motorista2.code, name: v.motorista2.nome || v.motorista2.name, base: v.motorista2.base } as Driver);
    } else {
      setMotorista2Ativo(false);
      setDriver2Id(null);
      setDriver2(null);
    }
  }, [viagemSelecionada, edicao]);

  // ── Efeito: bloquear scroll durante save ─────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = saveStatus !== "idle" ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [saveStatus]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleTypeChange(code: string) {
    setTypeCode(code);
    setTriedSave(false);
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

  function handleViagemChange(v: ViagemCatalog | null) {
    setViagemSelecionada(v);
    setMotorista2Ativo(false);
    setDriver1Id(null);
    setDriver2Id(null);
    setDriver1(null);
    setDriver2(null);
    setShowPreview(false);
  }

  function handleDriver1Change(id: string | null, d: Driver | null) {
    setDriver1Id(id);
    setDriver1(d);
    if (id && driver2Id === id) {
      setDriver2Id(null);
      setDriver2(null);
    }
  }

  function handleDriver2Change(id: string | null, d: Driver | null) {
    setDriver2Id(id);
    setDriver2(d);
    if (id && driver1Id === id) {
      setDriver2Id(null);
      setDriver2(null);
    }
  }

  function handleDriverCreated(created: Driver) {
    if (createTarget === 1) {
      setDriver1Id(created.id);
      setDriver1(created);
      if (driver2Id === created.id) { setDriver2Id(null); setDriver2(null); }
    } else if (createTarget === 2) {
      setDriver2Id(created.id);
      setDriver2(created);
      if (driver1Id === created.id) { setDriver2Id(null); setDriver2(null); }
    }
  }

  async function handleSalvar() {
    setTriedSave(true);
    if (!isFormValido()) return;

    const typeConfig = getOccurrenceTypeConfig(typeCode);
    if (!typeConfig.isGeneric && !viagemSelecionada) return;

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
        eventDate: dataEvento || today,
        tripDate: dataViagem || dataEvento || today,
        startTime: horarioInicial || "00:00",
        endTime: horarioFinal || horarioInicial || "00:00",
        place: localParada?.nome ?? "",
        vehicleNumber: vehicleNumber || "0",
        tripId: viagemSelecionada?.id,
        tripTime: viagemSelecionada?.horaPartida ?? null,
        lineLabel,
        typeCode,
        speedKmh,
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
        .map((e) => ({ file: e.file!, caption: e.legenda ?? undefined, linkTexto: e.linkTexto ?? undefined, linkUrl: e.linkUrl ?? undefined }));

      if (evidencesToUpload.length) {
        await occurrencesApi.uploadEvidences(resultId, evidencesToUpload);
      }

      const existingEvidences = evidencias.filter((e) => !e.file && e.id);
      await Promise.all(
        existingEvidences.map((e) => occurrencesApi.updateEvidenceCaption(resultId, e.id, e.legenda ?? "")),
      );

      const novaOcorrenciaView: Ocorrencia = {
        id: resultId,
        typeCode,
        typeTitle: typeConfig.title,
        viagem: viagemSelecionada
          ? toViagemView(viagemSelecionada)
          : { id: "", linha: "", prefixo: vehicleNumber || "0", horario: "" },
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

      setSaveStatus("success");
      setTimeout(() => {
        onSaved({ id: resultId, view: novaOcorrenciaView });
      }, 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus("idle");
      toast.error(getApiErrorMessage(e));
    }
  }

  return {
    // tipo
    typeCode, handleTypeChange,
    // campos generico
    reportTitle, setReportTitle,
    ccoOperator, setCcoOperator,
    vehicleKm, setVehicleKm,
    passengerCount, setPassengerCount,
    passengerConnection, setPassengerConnection,
    relatoHtml, setRelatoHtml,
    devolutivaHtml, setDevolutivaHtml,
    devolutivaStatus, setDevolutivaStatus,
    devolutivaBeforeEvidences, setDevolutivaBeforeEvidences,
    // seções generico
    showSectionViagem, setShowSectionViagem,
    showSectionIdentificacao, setShowSectionIdentificacao,
    showSectionDados, setShowSectionDados,
    showSectionTripulacao, setShowSectionTripulacao,
    showSectionPassageiros, setShowSectionPassageiros,
    // dados evento
    dataEvento, setDataEvento,
    dataViagem, setDataViagem,
    horarioInicial, setHorarioInicial,
    horarioFinal, setHorarioFinal,
    vehicleNumber, setVehicleNumber,
    localParada, setLocalParada,
    speedKmh, setSpeedKmh,
    // viagem e motoristas
    viagemSelecionada, handleViagemChange,
    motorista2Ativo, setMotorista2Ativo,
    driver1Id, driver1, handleDriver1Change,
    driver2Id, driver2, handleDriver2Change,
    isDriverModalOpen, setIsDriverModalOpen,
    createTarget, setCreateTarget,
    handleDriverCreated,
    // evidências
    evidencias, setEvidencias,
    // ui
    showPreview, setShowPreview,
    saveStatus, triedSave,
    // funções de validação e save
    isHorarioValido, isFormValido, handleSalvar,
    // helpers de view (usados no preview modal)
    toViagemView, toMotoristaView,
  };
}
