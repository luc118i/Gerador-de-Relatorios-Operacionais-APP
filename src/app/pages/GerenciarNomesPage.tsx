import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { presetsApi } from "../../api/presets.api";
import { toast } from "sonner";

interface GerenciarNomesPageProps {
  onVoltar: () => void;
}

export function GerenciarNomesPage({ onVoltar }: GerenciarNomesPageProps) {
  const [novoNome, setNovoNome] = useState("");
  const queryClient = useQueryClient();

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ["occurrence-presets"],
    queryFn: presetsApi.getPresets,
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => presetsApi.createPreset(name),
    onSuccess: (preset) => {
      queryClient.setQueryData<typeof presets>(["occurrence-presets"], (old = []) =>
        [...old, preset].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNovoNome("");
      toast.success("Nome adicionado.");
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("409") ? "Nome já existe na lista." : "Erro ao adicionar nome.";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => presetsApi.deletePreset(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<typeof presets>(["occurrence-presets"], (old = []) =>
        old.filter((p) => p.id !== id)
      );
      toast.success("Nome removido.");
    },
    onError: () => toast.error("Erro ao remover nome."),
  });

  function handleAdd() {
    const name = novoNome.trim().toUpperCase();
    if (!name) return;
    addMutation.mutate(name);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={onVoltar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Nomes Padronizados</h1>
            <p className="text-sm text-gray-500">
              Gerencie os nomes disponíveis para operadores ao registrar ocorrências
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Adicionar novo nome */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Adicionar novo nome</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Ex: PASSAGEIRO AGREDINDO MOTORISTA"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={!novoNome.trim() || addMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Adicionar
            </button>
          </div>
        </div>

        {/* Lista de nomes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Lista atual
            </h2>
            <span className="text-xs text-gray-400">{presets.length} nome(s)</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando...
            </div>
          ) : presets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">Nenhum nome cadastrado ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {presets.map((preset) => (
                <li
                  key={preset.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 group"
                >
                  <span className="text-sm text-gray-800">{preset.name}</span>
                  <button
                    onClick={() => deleteMutation.mutate(preset.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
