import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { baseResponsaveisApi, type BaseResponsavel } from "../../api/baseResponsaveis.api";

interface BaseResponsaveisPageProps {
  onVoltar: () => void;
}

const QUERY_KEY = ["base-responsaveis"];

export function BaseResponsaveisPage({ onVoltar }: BaseResponsaveisPageProps) {
  const queryClient = useQueryClient();

  const [novaSigla, setNovaSigla] = useState("");
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [novaVisibilidade, setNovaVisibilidade] = useState("");

  const [editingSigla, setEditingSigla] = useState<string | null>(null);
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editVisibilidade, setEditVisibilidade] = useState("");

  const { data: bases = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: baseResponsaveisApi.list,
  });

  const addMutation = useMutation({
    mutationFn: (input: BaseResponsavel) => baseResponsaveisApi.create(input),
    onSuccess: (created) => {
      queryClient.setQueryData<BaseResponsavel[]>(QUERY_KEY, (old = []) =>
        [...old, created].sort((a, b) => a.sigla.localeCompare(b.sigla))
      );
      setNovaSigla("");
      setNovoResponsavel("");
      setNovaVisibilidade("");
      toast.success("Base adicionada.");
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("409") ? "Sigla já cadastrada." : "Erro ao adicionar base.";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { sigla: string; responsavel: string; visibilidade: string }) =>
      baseResponsaveisApi.update(args.sigla, { responsavel: args.responsavel, visibilidade: args.visibilidade }),
    onSuccess: (updated) => {
      queryClient.setQueryData<BaseResponsavel[]>(QUERY_KEY, (old = []) =>
        old.map((b) => (b.sigla === updated.sigla ? updated : b))
      );
      setEditingSigla(null);
      toast.success("Base atualizada.");
    },
    onError: () => toast.error("Erro ao atualizar base."),
  });

  const deleteMutation = useMutation({
    mutationFn: (sigla: string) => baseResponsaveisApi.remove(sigla),
    onSuccess: (_, sigla) => {
      queryClient.setQueryData<BaseResponsavel[]>(QUERY_KEY, (old = []) =>
        old.filter((b) => b.sigla !== sigla)
      );
      toast.success("Base removida.");
    },
    onError: () => toast.error("Erro ao remover base."),
  });

  function handleAdd() {
    const sigla = novaSigla.trim().toUpperCase();
    const responsavel = novoResponsavel.trim();
    const visibilidade = novaVisibilidade.trim();
    if (!sigla || !responsavel || !visibilidade) return;
    addMutation.mutate({ sigla, responsavel, visibilidade });
  }

  function startEdit(base: BaseResponsavel) {
    setEditingSigla(base.sigla);
    setEditResponsavel(base.responsavel);
    setEditVisibilidade(base.visibilidade);
  }

  function saveEdit(sigla: string) {
    const responsavel = editResponsavel.trim();
    const visibilidade = editVisibilidade.trim();
    if (!responsavel || !visibilidade) return;
    updateMutation.mutate({ sigla, responsavel, visibilidade });
  }

  const inputBase =
    "px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={onVoltar}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Base e Responsáveis</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerencie o responsável e a visibilidade (cidade) de cada base operacional
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Adicionar nova base */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Adicionar nova base</h2>
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr_auto] gap-2">
            <input
              type="text"
              value={novaSigla}
              onChange={(e) => setNovaSigla(e.target.value.toUpperCase())}
              placeholder="Sigla"
              className={inputBase}
            />
            <input
              type="text"
              value={novoResponsavel}
              onChange={(e) => setNovoResponsavel(e.target.value)}
              placeholder="Responsável"
              className={inputBase}
            />
            <input
              type="text"
              value={novaVisibilidade}
              onChange={(e) => setNovaVisibilidade(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Visibilidade (cidade)"
              className={inputBase}
            />
            <button
              onClick={handleAdd}
              disabled={
                !novaSigla.trim() || !novoResponsavel.trim() || !novaVisibilidade.trim() || addMutation.isPending
              }
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Lista */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bases cadastradas</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{bases.length} base(s)</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando...
            </div>
          ) : bases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 gap-2">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">Nenhuma base cadastrada ainda.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-2 font-medium">Sigla</th>
                  <th className="px-5 py-2 font-medium">Responsável</th>
                  <th className="px-5 py-2 font-medium">Visibilidade</th>
                  <th className="px-5 py-2 font-medium w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bases.map((base) => {
                  const isEditing = editingSigla === base.sigla;
                  return (
                    <tr key={base.sigla} className="group hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-5 py-2.5 font-semibold text-gray-800 dark:text-gray-200">{base.sigla}</td>
                      <td className="px-5 py-2.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editResponsavel}
                            onChange={(e) => setEditResponsavel(e.target.value)}
                            className={`${inputBase} w-full`}
                            autoFocus
                          />
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">{base.responsavel}</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editVisibilidade}
                            onChange={(e) => setEditVisibilidade(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit(base.sigla)}
                            className={`${inputBase} w-full`}
                          />
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">{base.visibilidade}</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(base.sigla)}
                                disabled={updateMutation.isPending}
                                className="p-1.5 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                                title="Salvar"
                              >
                                {updateMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setEditingSigla(null)}
                                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(base)}
                                className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteMutation.mutate(base.sigla)}
                                disabled={deleteMutation.isPending}
                                className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
