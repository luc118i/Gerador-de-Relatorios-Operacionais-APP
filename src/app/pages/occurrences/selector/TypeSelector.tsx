import { useQuery } from "@tanstack/react-query";
import { occurrencesApi } from "../../../../api/occurrences.api";
import { AlertCircle, X, Loader2 } from "lucide-react";
import type { OccurrenceTypeDTO } from "../../../../domain/occurrences";

interface TypeSelectorProps {
  onSelect: (type: OccurrenceTypeDTO) => void;
  onCancel: () => void; // Ou onClose, conforme preferir
}

export function TypeSelector({ onSelect, onCancel }: TypeSelectorProps) {
  // 1. A lógica do Query deve estar AQUI dentro
  const {
    data: apiResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["occurrence-types"],
    queryFn: async () => {
      return await occurrencesApi.listTypes();
    },
    staleTime: 1000 * 60 * 60,
  });

  // O segredo está aqui: acessar o .data do retorno do request
  const types = apiResponse?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Container do Modal */}
      <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header do Modal */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nova Ocorrência</h2>
            <p className="text-sm text-gray-500 mt-1">
              Selecione o tipo de descumprimento
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-4 overflow-y-auto flex-grow bg-gray-50/50">
          <div className="grid grid-cols-1 gap-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <p className="text-sm text-gray-500">Carregando opções...</p>
              </div>
            ) : isError ? (
              <div className="p-4 text-center bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">Erro ao carregar tipos.</p>
              </div>
            ) : (
              types.map((type: OccurrenceTypeDTO) => (
                <button
                  key={type.id}
                  onClick={() => onSelect(type)}
                  className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left cursor-pointer"
                >
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <AlertCircle size={22} />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900 leading-tight">
                      {type.title}
                    </h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      CÓD: {type.code}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={onCancel}
            className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
