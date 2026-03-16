import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { driversApi } from "../../api/drivers.api";
import type { Driver } from "../../domain/drivers";

interface DriversPageProps {
  onVoltar: () => void;
}

export function DriversPage({ onVoltar }: DriversPageProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<Driver | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["drivers", { search }],
    queryFn: () => driversApi.listDrivers({ search, active: true, limit: 50 }),
    staleTime: 30_000,
  });

  const drivers = data ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: {
      code: string;
      name: string;
      base?: string | null;
    }) => driversApi.createDriver(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setIsFormOpen(false);
      setEditingDriver(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: {
      id: string;
      payload: { code?: string; name?: string; base?: string | null };
    }) => driversApi.updateDriver(args.id, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setIsFormOpen(false);
      setEditingDriver(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => driversApi.deleteDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setIsDeleting(null);
    },
  });

  function openCreate() {
    setEditingDriver(null);
    setIsFormOpen(true);
  }

  function openEdit(driver: Driver) {
    setEditingDriver(driver);
    setIsFormOpen(true);
  }

  function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = (formData.get("code") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const baseRaw = (formData.get("base") as string)?.trim();
    const base = baseRaw.length ? baseRaw : null;

    if (!code || !name) return;

    if (editingDriver) {
      const payload: { code?: string; name?: string; base?: string | null } =
        {};
      if (code !== editingDriver.code) payload.code = code;
      if (name !== editingDriver.name) payload.name = name;
      if (base !== editingDriver.base) payload.base = base;

      updateMutation.mutate({ id: editingDriver.id, payload });
    } else {
      createMutation.mutate({ code, name, base });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Motoristas</h1>
          <button
            onClick={onVoltar}
            className="cursor-pointer text-sm px-3 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Voltar
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <input
            type="text"
            placeholder="Buscar por código ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={openCreate}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Motorista
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-600">Carregando motoristas…</p>
        ) : isError ? (
          <p className="text-sm text-red-600">
            Falha ao carregar motoristas. Tente novamente.
          </p>
        ) : drivers.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum motorista encontrado.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-700">
                    Código
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700">
                    Nome
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700">
                    Base
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2">{d.code}</td>
                    <td className="px-4 py-2">{d.name}</td>
                    <td className="px-4 py-2">{d.base ?? "-"}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        onClick={() => openEdit(d)}
                        className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100"
                      >
                        <Edit2 className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        onClick={() => setIsDeleting(d)}
                        className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal formulário */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingDriver ? "Editar Motorista" : "Novo Motorista"}
                </h2>
                <button
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingDriver(null);
                  }}
                  className="cursor-pointer text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código
                  </label>
                  <input
                    name="code"
                    defaultValue={editingDriver?.code ?? ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingDriver}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    name="name"
                    defaultValue={editingDriver?.name ?? ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingDriver}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base (opcional)
                  </label>
                  <input
                    name="base"
                    defaultValue={editingDriver?.base ?? ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingDriver(null);
                    }}
                    className="cursor-pointer px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="cursor-pointer px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {editingDriver ? "Salvar" : "Criar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal confirmação exclusão */}
        {isDeleting && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Excluir motorista
              </h2>
              <p className="text-sm text-gray-700 mb-4">
                Tem certeza que deseja excluir o motorista{" "}
                <span className="font-semibold">{isDeleting.name}</span>?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsDeleting(null)}
                  className="cursor-pointer px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteMutation.mutate(isDeleting.id)}
                  disabled={deleteMutation.isPending}
                  className="cursor-pointer px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
