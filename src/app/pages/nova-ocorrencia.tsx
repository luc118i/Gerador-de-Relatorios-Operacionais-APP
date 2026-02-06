import { useState } from "react";
import {
  ArrowLeft,
  Save,
  FileText,
  MessageCircle,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { Viagem, Motorista, Evidencia, Ocorrencia } from "../types";
import { AutocompleteViagem } from "../components/autocomplete-viagem";
import { EvidenciasGrid } from "../components/evidencias-grid";
import { BaseChip } from "../components/base-chip";

import { DriverPicker } from "../components/DriverPicker/DriverPicker";
import { DriverCreateModal } from "../components/DriverCreateModal/DriverCreateModal";
import type { Driver } from "../../domain/drivers";

import { useCreateOccurrence } from "../../features/occurrences/queries/occurrences.queries";
import { buildOccurrencePayload } from "../../features/occurrences/buildOccurrencePayload";

import {
  gerarTextoRelatorioIndividual,
  gerarTextoWhatsApp,
} from "../utils/relatorio";

interface NovaOcorrenciaProps {
  viagens: Viagem[];
  onVoltar: () => void;
  onSaved: (args: { id: string; view: Ocorrencia }) => void;
}

export function NovaOcorrencia({
  viagens,
  onVoltar,
  onSaved,
}: NovaOcorrenciaProps) {
  const [viagemSelecionada, setViagemSelecionada] = useState<Viagem | null>(
    null,
  );
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

  const isHorarioValido = () => {
    if (!horarioInicial || !horarioFinal) return true;
    const [hI, mI] = horarioInicial.split(":").map(Number);
    const [hF, mF] = horarioFinal.split(":").map(Number);
    const totalInicial = hI * 60 + mI;
    const totalFinal = hF * 60 + mF;
    return totalFinal > totalInicial;
  };

  const isFormValido = () => {
    const driversOk = !!driver1 && (!driver2Id || driver2Id !== driver1Id);

    return (
      viagemSelecionada &&
      dataEvento &&
      horarioInicial &&
      horarioFinal &&
      localParada.trim() &&
      isHorarioValido() &&
      driversOk
    );
  };

  const handleSalvar = async () => {
    if (!isFormValido() || !viagemSelecionada) return;

    try {
      const payload = buildOccurrencePayload({
        driver1Id,
        driver2Id,
        motorista2Ativo,
        date: dataEvento,
        startTime: horarioInicial,
        endTime: horarioFinal,
        location: localParada,
        tripId: viagemSelecionada.id,
      });

      // 👇 AQUI ESTÁ A VIRADA DE CHAVE
      const created = await createOccurrence.mutateAsync(payload);

      const novaOcorrenciaView: Ocorrencia = {
        id: created.id,
        viagem: viagemSelecionada,
        motorista1: toMotoristaView(driver1)!,
        motorista2: motorista2Ativo ? toMotoristaView(driver2) : undefined,
        dataEvento,
        horarioInicial,
        horarioFinal,
        localParada,
        evidencias,
        createdAt: new Date().toISOString(),
      };

      onSaved({ id: created.id, view: novaOcorrenciaView });
    } catch (e) {}
  };

  const handleGerarRelatorio = () => {
    if (!isFormValido() || !viagemSelecionada || !driver1) return;

    const m1 = toMotoristaView(driver1) as Motorista;
    const m2 =
      motorista2Ativo && driver2 ? toMotoristaView(driver2) : undefined;

    const ocorrenciaTemp: Ocorrencia = {
      id: "temp",
      viagem: viagemSelecionada,
      motorista1: m1,
      motorista2: m2,
      dataEvento,
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
      viagem: viagemSelecionada,
      motorista1: m1,
      motorista2: m2,
      dataEvento,
      horarioInicial,
      horarioFinal,
      localParada,
      evidencias,
      createdAt: new Date().toISOString(),
    };

    const texto = gerarTextoWhatsApp(ocorrenciaTemp);
    navigator.clipboard.writeText(texto);
    alert("Texto copiado para WhatsApp!");
  };

  const createOccurrence = useCreateOccurrence();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onVoltar}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Nova Ocorrência
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
                viagens={viagens}
                value={viagemSelecionada}
                onChange={(v) => {
                  setViagemSelecionada(v);
                  setMotorista2Ativo(false);

                  setDriver1Id(null);
                  setDriver2Id(null);
                  setDriver1(null);
                  setDriver2(null);
                }}
              />

              {viagemSelecionada && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="text-xs text-gray-600">Linha</label>
                    <p className="font-medium text-gray-900">
                      {viagemSelecionada.linha}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">
                      Horário da Viagem
                    </label>
                    <p className="font-medium text-gray-900">
                      {viagemSelecionada.horario}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">
                      Origem x Destino
                    </label>
                    <p className="font-medium text-gray-900">
                      {viagemSelecionada.origem} x {viagemSelecionada.destino}
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
                      className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remover Motorista 02"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setMotorista2Ativo(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                disabled={!isFormValido()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex-1"
              >
                <Save className="w-5 h-5" />
                Salvar Ocorrência
              </button>
              <button
                onClick={handleGerarRelatorio}
                disabled={!isFormValido()}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex-1"
              >
                <FileText className="w-5 h-5" />
                Gerar Relatório Individual
              </button>
              <button
                onClick={handleCopiarWhatsApp}
                disabled={!isFormValido()}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex-1"
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
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
                {gerarTextoRelatorioIndividual({
                  id: "temp",
                  viagem: viagemSelecionada,
                  motorista1: toMotoristaView(driver1)!,
                  motorista2: motorista2Ativo
                    ? toMotoristaView(driver2)
                    : undefined,

                  dataEvento,
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
