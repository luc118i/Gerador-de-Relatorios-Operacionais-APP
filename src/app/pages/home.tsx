import { Plus, FileText, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { occurrencesApi } from "../../api/occurrences.api";
import type { OccurrenceDTO } from "../../domain/occurrences";
import type { Ocorrencia } from "../types";
import { OccurrenceCard } from "../components/OccurrenceCardDTO";
import { OccurrencePreviewModal } from "./occurrences/preview/OccurrencePreviewModal";
import { formatToLocalDate } from "../utils/dateUtils";
import { Calendar as CalendarIcon } from "lucide-react";
import { NovaOcorrencia } from "./nova-ocorrencia";
import { DayPicker } from "react-day-picker";
import { toast } from "sonner";
import "react-day-picker/dist/style.css";
import { viagensCatalog } from "../../catalogs/viagens.catalog";

interface HomeProps {
  onNovaOcorrencia: () => void;
  onGerarRelatorio: () => void;
  onGerenciarMotoristas: () => void;
}

export function Home({
  onNovaOcorrencia,
  onGerarRelatorio,
  onGerenciarMotoristas,
}: HomeProps) {
  const queryClient = useQueryClient();

  // ── Estados ──────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDateString(new Date()),
  );
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [editando, setEditando] = useState<Ocorrencia | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const calendarRef = useRef<HTMLDivElement | null>(null);

  // ── Derivados ─────────────────────────────────────────────
  const formattedDate = useMemo(
    () => formatToLocalDate(selectedDate),
    [selectedDate],
  );

  const dateDiffLabel = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = selectedDate.split("-").map(Number);
    const current = new Date(year, month - 1, day);
    current.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (today.getTime() - current.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays > 1) return `${diffDays} dias atrás`;
    if (diffDays === -1) return "Amanhã";
    return `Em ${Math.abs(diffDays)} dias`;
  }, [selectedDate]);

  const selectedDateObj = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDate]);

  // ── Query ─────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["occurrences", "byCreationDate", selectedDate],
    queryFn: async () => {
      const res = await occurrencesApi.listOccurrences(selectedDate);
      return res.data;
    },
    staleTime: 30_000,
  });

  const ocorrencias: OccurrenceDTO[] = data ?? [];

  // ── Efeitos ───────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setCalendarVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Handlers ──────────────────────────────────────────────
  function changeDay(offset: number) {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + offset);
    setSelectedDate(getLocalDateString(date));
  }

  function goToday() {
    setSelectedDate(getLocalDateString(new Date()));
  }

  function handleSelect(date?: Date) {
    if (!date) return;
    setSelectedDate(getLocalDateString(date));
    setCalendarVisible(false);
  }

  async function handleEditar(occ: OccurrenceDTO) {
    try {
      const full = await occurrencesApi.getOccurrenceById(occ.id);

      // ✅ busca as URLs assinadas
      const signedRes = await occurrencesApi.getEvidenceSignedUrls(occ.id);

      setEditando(dtoToOcorrencia(full as any, signedRes));
    } catch {
      toast.error("Erro ao carregar ocorrência.");
    }
  }

  async function handleConfirmarExclusao() {
    if (!excluindoId) return;
    setExcluindo(true);
    try {
      await occurrencesApi.deleteOccurrence(excluindoId);
      toast.success("Ocorrência excluída.");
      setExcluindoId(null);
      queryClient.invalidateQueries({
        queryKey: ["occurrences", "byCreationDate", selectedDate],
      });
    } catch {
      toast.error("Erro ao excluir ocorrência.");
    } finally {
      setExcluindo(false);
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="relative">
              <h1 className="text-2xl font-semibold text-gray-900">
                Gerador de Relatórios Operacionais
              </h1>
              <div
                ref={calendarRef}
                className="relative text-sm text-gray-600 mt-1 capitalize flex items-center gap-2"
              >
                <button
                  onClick={() => setCalendarVisible((v) => !v)}
                  className="p-1 rounded hover:bg-gray-100 hover:text-blue-600 transition"
                >
                  <CalendarIcon className="cursor-pointer w-4 h-4" />
                </button>
                <button
                  onClick={() => changeDay(-1)}
                  className="cursor-pointer p-1 rounded hover:bg-gray-100 hover:text-blue-600 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {formattedDate}
                <button
                  onClick={() => changeDay(1)}
                  className="cursor-pointer p-1 rounded hover:bg-gray-100 hover:text-blue-600 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={goToday}
                  className="cursor-pointer ml-2 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition"
                >
                  {dateDiffLabel}
                </button>
                {calendarVisible && (
                  <div className="absolute top-8 left-0 bg-white shadow-lg border rounded-lg p-2 z-50">
                    <DayPicker
                      mode="single"
                      selected={selectedDateObj}
                      onSelect={handleSelect}
                      className="p-3 bg-white rounded-xl shadow-xl border"
                      classNames={{
                        day_selected:
                          "bg-blue-600 text-white hover:bg-blue-600",
                        day_today: "border border-blue-500",
                        nav_button: "hover:bg-gray-100 rounded-md",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onGerarRelatorio}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <FileText className="w-5 h-5" /> Ocorrências da Data
              </button>
              <button
                onClick={onGerenciarMotoristas}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <Users className="w-5 h-5" /> Motoristas
              </button>
              <button
                onClick={onNovaOcorrencia}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" /> Nova Ocorrência
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Ocorrências do Dia
          </h2>
          {isLoading ? (
            <p className="text-sm text-gray-600">Carregando…</p>
          ) : isError ? (
            <p className="text-sm text-red-600">
              Falha ao carregar ocorrências do dia.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              {ocorrencias.length} registro{ocorrencias.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {isError ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Não foi possível carregar as ocorrências
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Verifique a conexão com a API e tente novamente.
            </p>
            <button
              onClick={() => refetch()}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : ocorrencias.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma ocorrência registrada
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Clique no botão "Nova Ocorrência" para registrar um descumprimento
              operacional
            </p>
            <button
              onClick={onNovaOcorrencia}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" /> Nova Ocorrência
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ocorrencias.map((occ) => (
              <OccurrenceCard
                key={occ.id}
                occurrence={occ}
                onOpen={() => setPreviewId(occ.id)}
                onEditar={() => handleEditar(occ)}
                onExcluir={() => setExcluindoId(occ.id)}
              />
            ))}
          </div>
        )}

        <OccurrencePreviewModal
          occurrenceId={previewId}
          open={!!previewId}
          onClose={() => setPreviewId(null)}
        />
      </main>

      {/* Drawer de Edição */}
      {editando && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditando(null)}
          />
          <div className="relative w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl">
            <NovaOcorrencia
              edicao={editando}
              onVoltar={() => setEditando(null)}
              onSaved={() => {
                setEditando(null);
                toast.success("Ocorrência atualizada!");
                queryClient.invalidateQueries({
                  queryKey: ["occurrences", "byCreationDate", selectedDate],
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {excluindoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !excluindo && setExcluindoId(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Excluir ocorrência?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setExcluindoId(null)}
                disabled={excluindo}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarExclusao}
                disabled={excluindo}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dtoToOcorrencia(
  dto: any,
  signedUrls: Array<{
    id: string;
    url: string;
    caption?: string;
    linkTexto?: string;
    linkUrl?: string;
  }> = [],
): Ocorrencia {
  const viagemNoCatalogo = dto.tripId
    ? viagensCatalog.byKey.get(dto.tripId)
    : viagensCatalog.rows.find(
        (v) => `${v.codigoLinha} - ${v.nomeLinha}` === dto.lineLabel,
      );

  console.log("tripId:", dto.tripId);
  console.log("lineLabel:", dto.lineLabel);
  console.log("viagemEncontrada:", viagemNoCatalogo);
  return {
    id: dto.id,
    viagem: {
      id: dto.tripId ?? "",
      linha: dto.lineLabel ?? "",
      prefixo: dto.vehicleNumber ?? "",
      horario: viagemNoCatalogo?.horaPartida ?? "",
      codigoLinha: viagemNoCatalogo?.codigoLinha ?? "",
      nomeLinha: viagemNoCatalogo?.nomeLinha ?? "",
      sentido: viagemNoCatalogo?.sentido ?? "",
      origem: "",
      destino: "",
    },
    evidencias: signedUrls.map((e) => ({
      id: e.id,
      url: e.url,
      legenda: e.caption ?? "",
      linkTexto: e.linkTexto ?? "",
      linkUrl: e.linkUrl ?? "",
    })),
    motorista1: {
      id: dto.drivers?.[0]?.driverId ?? "",
      matricula: dto.drivers?.[0]?.registry ?? "",
      nome: dto.drivers?.[0]?.name ?? "",
      base: dto.drivers?.[0]?.baseCode ?? "",
    },
    motorista2: dto.drivers?.[1]
      ? {
          id: dto.drivers[1].driverId,
          matricula: dto.drivers[1].registry,
          nome: dto.drivers[1].name,
          base: dto.drivers[1].baseCode ?? "",
        }
      : undefined,
    dataEvento: dto.eventDate ?? "",
    dataViagem: dto.tripDate ?? "",
    horarioInicial: dto.startTime ?? "",
    horarioFinal: dto.endTime ?? "",
    localParada: dto.place ?? "",
    typeCode: dto.typeCode ?? "",
    typeTitle: dto.typeTitle ?? "",
    speedKmh: dto.speedKmh ?? null,

    createdAt: dto.createdAt ?? "",
  };
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="h-5 w-28 bg-gray-100 rounded mb-3" />
      <div className="h-4 w-44 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-36 bg-gray-100 rounded mb-4" />
      <div className="h-3 w-52 bg-gray-100 rounded" />
    </div>
  );
}
