import { Plus, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { occurrencesApi } from "../../api/occurrences.api";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { OccurrenceCard } from "../components/OccurrenceCardDTO";

import { OccurrencePreviewModal } from "./occurrences/preview/OccurrencePreviewModal";

import { formatToLocalDate } from "../utils/dateUtils";

import { Calendar as CalendarIcon } from "lucide-react";

import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface HomeProps {
  onNovaOcorrencia: () => void;
  onGerarRelatorio: () => void;
}

export function Home({ onNovaOcorrencia, onGerarRelatorio }: HomeProps) {
  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDateString(new Date()),
  );

  const formattedDate = useMemo(() => {
    return formatToLocalDate(selectedDate); // Agora usando a função importada para garantir o fuso horário correto
  }, [selectedDate]);

  const dateDiffLabel = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera o horário para comparar apenas os dias

    // Use o mesmo padrão UTC para criar a data de comparação
    const [year, month, day] = selectedDate.split("-").map(Number);
    const current = new Date(year, month - 1, day);
    current.setHours(0, 0, 0, 0);

    // Para calcular a diferença de dias de forma segura:
    const diffTime = today.getTime() - current.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays > 1) return `${diffDays} dias atrás`;
    if (diffDays === -1) return "Amanhã";
    if (diffDays < -1) return `Em ${Math.abs(diffDays)} dias`;

    return "";
  }, [selectedDate]);

  const calendarRef = useRef<HTMLDivElement | null>(null);

  const selectedDateObj = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDate]);

  const { data, isLoading, isError, refetch } = useQuery({
    // Mudamos a chave para deixar claro que é por data de criação/relatório
    queryKey: ["occurrences", "byCreationDate", selectedDate],
    queryFn: async () => {
      // Aqui você chama a API passando a data de hoje.
      // IMPORTANTE: O seu Back-end deve usar esse 'todayISO' na query:
      // WHERE created_at::date = '2026-02-13'
      const res = await occurrencesApi.listOccurrences(selectedDate);
      return res.data;
    },
    staleTime: 30_000,
  });

  const ocorrencias: OccurrenceDTO[] = data ?? [];

  const [previewId, setPreviewId] = useState<string | null>(null);

  function changeDay(offset: number) {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    date.setDate(date.getDate() + offset); // Soma ou subtrai o dia

    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, "0");
    const newDay = String(date.getDate()).padStart(2, "0");

    setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
  }

  const today = (() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  const [calendarVisible, setCalendarVisible] = useState(false);

  function goToday() {
    setSelectedDate(getLocalDateString(new Date()));
  }

  function getLocalDateString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function handleSelect(date?: Date) {
    if (!date) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    setSelectedDate(`${year}-${month}-${day}`);
    setCalendarVisible(false);
  }

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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
                <FileText className="w-5 h-5" />
                Ocorrências da Data
              </button>

              <button
                onClick={onNovaOcorrencia}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium "
              >
                <Plus className="w-5 h-5 " />
                Nova Ocorrência
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
              {ocorrencias.length} registro
              {ocorrencias.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {isError ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
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
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
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
              <Plus className="w-5 h-5" />
              Nova Ocorrência
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ocorrencias.map((occ) => (
              <OccurrenceCard
                key={occ.id}
                occurrence={occ}
                onOpen={() => setPreviewId(occ.id)}
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
    </div>
  );
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
