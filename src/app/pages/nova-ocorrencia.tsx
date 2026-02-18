import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  FileText,
  MessageCircle,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import {
  Viagem,
  Motorista,
  Evidencia,
  Ocorrencia,
  ViagemCatalog,
} from "../types";
import { AutocompleteViagem } from "../components/autocomplete-viagem";
import { EvidenciasGrid } from "../components/evidencias-grid";
import { BaseChip } from "../components/base-chip";

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

import {
  gerarTextoRelatorioIndividual,
  gerarTextoWhatsApp,
} from "../utils/relatorio";

import { occurrencesApi } from "../../api/occurrences.api";

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
  const [motorista2Ativo, setMotorista2Ativo] = useState(false);
  const [dataEvento, setDataEvento] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [horarioInicial, setHorarioInicial] = useState("");
  const [horarioFinal, setHorarioFinal] = useState("");
  const [localParada, setLocalParada] = useState("");
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

  const [viagemSelecionada, setViagemSelecionada] =
    useState<ViagemCatalog | null>(null);

  const isFormValido = () => {
    const driversOk = !!driver1 && (!driver2Id || driver2Id !== driver1Id);

    return (
      viagemSelecionada &&
      dataEvento &&
      dataViagem &&
      horarioInicial &&
      horarioFinal &&
      localParada.trim() &&
      vehicleNumber.trim() &&
      isHorarioValido() &&
      driversOk
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
      setLocalParada(edicao.localParada);
      setVehicleNumber(viagemSalva.prefixo || "");

      // 2. Viagem (Recuperando do Catálogo para o Autocomplete)
      const viagemNoCatalogo = viagensCatalog.rows.find(
        (v) => v.id === viagemSalva.id,
      );

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

  const handleSalvar = async () => {
    if (!isFormValido() || !viagemSelecionada) return;

    const lineLabel = `${viagemSelecionada.codigoLinha} - ${viagemSelecionada.nomeLinha}`;

    try {
      const payload = buildOccurrencePayload({
        driver1Id,
        driver2Id,
        motorista2Ativo,
        eventDate: dataEvento,
        tripDate: dataViagem,
        startTime: horarioInicial,
        endTime: horarioFinal,
        place: localParada,
        vehicleNumber,
        tripId: viagemSelecionada.id,
        lineLabel,
        typeCode: "DESCUMP_OP_PARADA_FORA",
      });

      let resultId: string;

      // 1. Define se vai para o Create ou Update
      if (edicao?.id) {
        await updateOccurrence.mutateAsync({ id: edicao.id, input: payload });
        resultId = edicao.id;
      } else {
        const created = await createOccurrence.mutateAsync(payload);
        resultId = created.id;
      }

      // 2. Upload de evidências (apenas novos arquivos selecionados)
      const files = evidencias.map((e) => e.file).filter(Boolean) as File[];
      if (files.length) {
        await occurrencesApi.uploadEvidences(resultId, files);
      }

      // 3. Monta o objeto de visualização para retornar à lista
      const novaOcorrenciaView: Ocorrencia = {
        id: resultId,
        viagem: toViagemView(viagemSelecionada),
        motorista1: toMotoristaView(driver1)!,
        motorista2: motorista2Ativo ? toMotoristaView(driver2) : undefined,
        dataEvento,
        dataViagem,
        horarioInicial,
        horarioFinal,
        localParada,
        evidencias, // Aqui você pode querer buscar as fotos recém-subidas ou manter as locais
        createdAt: edicao?.createdAt || new Date().toISOString(),
      };

      toast.success(edicao ? "Atualizado com sucesso!" : "Criado com sucesso!");
      onSaved({ id: resultId, view: novaOcorrenciaView });
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const handleGerarRelatorio = () => {
    if (!isFormValido() || !viagemSelecionada || !driver1) return;

    const m1 = toMotoristaView(driver1) as Motorista;
    const m2 =
      motorista2Ativo && driver2 ? toMotoristaView(driver2) : undefined;

    const ocorrenciaTemp: Ocorrencia = {
      id: "temp",
      viagem: toViagemView(viagemSelecionada),

      motorista1: m1,
      motorista2: m2,
      dataEvento,
      dataViagem,
      horarioInicial,
      horarioFinal,
      localParada,
      evidencias,
      createdAt: new Date().toISOString(),
    };

    const texto = gerarTextoRelatorioIndividual(ocorrenciaTemp);
    navigator.clipboard.writeText(texto);
    setShowPreview(true);
  };

  const handleCopiarWhatsApp = () => {
    if (!isFormValido() || !viagemSelecionada || !driver1) return;

    const m1 = toMotoristaView(driver1) as Motorista;
    const m2 =
      motorista2Ativo && driver2 ? toMotoristaView(driver2) : undefined;

    const ocorrenciaTemp: Ocorrencia = {
      id: "temp",
      viagem: toViagemView(viagemSelecionada),

      motorista1: m1,
      motorista2: m2,
      dataEvento,
      dataViagem,
      horarioInicial,
      horarioFinal,
      localParada,
      evidencias,
      createdAt: new Date().toISOString(),
    };

    const texto = gerarTextoWhatsApp(ocorrenciaTemp);
    navigator.clipboard.writeText(texto);
    toast.success("Texto copiado para o WhatsApp!");
  };

  const createOccurrence = useCreateOccurrence();
  const updateOccurrence = useUpdateOccurrence();

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
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {edicao ? "Editar Ocorrência" : "Nova Ocorrência"}
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Descumprimento Operacional / Parada Fora do Programado
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-8">
          {/* Bloco 1 - Dados da Viagem */}
          <section>
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

          {/* Bloco 2 - Motoristas */}
          {viagemSelecionada && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Motoristas
              </h2>

              <div className="space-y-4">
                <DriverPicker
                  label="Motorista 01"
                  required
                  value={driver1Id}
                  excludedIds={driver2Id ? [driver2Id] : []}
                  onChange={(id, d) => {
                    setDriver1Id(id);
                    setDriver1(d ?? null);

                    // se o usuário escolheu algo que conflita com o 02, limpamos o 02
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
                      excludedIds={driver1Id ? [driver1Id] : []}
                      onChange={(id, d) => {
                        setDriver2Id(id);
                        setDriver2(d ?? null);

                        if (id && driver1Id === id) {
                          // proteção extra (em teoria excludedIds já impede)
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

          {/* Bloco 3 - Dados da Ocorrência */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Dados da Ocorrência
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo (não editável)
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-gray-700">
                  DESCUMPRIMENTO OPERACIONAL / PARADA FORA DO PROGRAMADO
                </div>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Local da Parada *
                </label>
                <input
                  type="text"
                  value={localParada}
                  onChange={(e) => setLocalParada(e.target.value)}
                  placeholder="Ex: KM 45 BR-324, Posto Graal - Rodovia Ayrton Senna"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Bloco 4 - Evidências */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Evidências
            </h2>
            <EvidenciasGrid evidencias={evidencias} onChange={setEvidencias} />
          </section>

          {/* Bloco 5 - Ações */}
          <section className="pt-4 border-t border-gray-200">
            <div className="flex gap-3">
              <button
                onClick={handleSalvar}
                disabled={!isFormValido() || createOccurrence.isPending}
                className="cursor-pointer flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex-1"
              >
                <Save className="w-5 h-5" />
                {createOccurrence.isPending
                  ? "Salvando..."
                  : "Salvar Ocorrência"}
              </button>
              <button
                onClick={handleGerarRelatorio}
                disabled={!isFormValido() || createOccurrence.isPending}
                className="cursor-pointer flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex-1"
              >
                <FileText className="w-5 h-5" />
                Gerar Relatório Individual
              </button>
              <button
                onClick={handleCopiarWhatsApp}
                disabled={!isFormValido() || createOccurrence.isPending}
                className="cursor-pointer flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex-1"
              >
                <MessageCircle className="w-5 h-5" />
                Copiar Texto WhatsApp
              </button>
            </div>
          </section>
        </div>
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
                  viagem: toViagemView(viagemSelecionada),

                  motorista1: toMotoristaView(driver1)!,
                  motorista2: motorista2Ativo
                    ? toMotoristaView(driver2)
                    : undefined,

                  dataEvento,
                  dataViagem,
                  horarioInicial,
                  horarioFinal,
                  localParada,
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

interface MotoristaDisplayProps {
  motorista: Motorista;
  numero: number;
}

function MotoristaDisplay({ motorista, numero }: MotoristaDisplayProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-600">
          Motorista {numero < 10 ? `0${numero}` : numero}
        </span>
        <BaseChip base={motorista.base} />
      </div>
      <p className="font-medium text-gray-900">
        {motorista.matricula} – {motorista.nome} – {motorista.base}
      </p>
    </div>
  );
}
