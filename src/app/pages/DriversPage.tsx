import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { driversApi } from "../../api/drivers.api";
import type { Driver } from "../../domain/drivers";
import { DriverProfilePage } from "./DriverProfilePage";
import { DriversDashboard } from "../components/DriversDashboard";

interface DriversPageProps {
  onVoltar: () => void;
}

export function DriversPage({ onVoltar }: DriversPageProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<Driver | null>(null);
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);

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

  if (viewingDriver) {
    return (
      <DriverProfilePage
        driver={viewingDriver}
        onVoltar={() => setViewingDriver(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Motoristas</h1>
          <button
            onClick={onVoltar}
            className="cursor-pointer text-sm px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Voltar
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DriversDashboard onSelectDriver={setViewingDriver} />

        <div className="flex items-center justify-between mb-4 gap-3">
          <input
            type="text"
            placeholder="Buscar por código ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <p className="text-sm text-gray-600 dark:text-gray-400">Carregando motoristas…</p>
        ) : isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Falha ao carregar motoristas. Tente novamente.
          </p>
        ) : drivers.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Nenhum motorista encontrado.</p>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Código
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Nome
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    Base
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setViewingDriver(d)}
                    className="cursor-pointer border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td className="px-4 py-2">{d.code}</td>
                    <td className="px-4 py-2">{d.name}</td>
                    <td className="px-4 py-2">{d.base ?? "-"}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(d);
                        }}
                        className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Edit2 className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDeleting(d);
                        }}
                        className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40"
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
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingDriver ? "Editar Motorista" : "Novo Motorista"}
                </h2>
                <button
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingDriver(null);
                  }}
                  className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código
                  </label>
                  <input
                    name="code"
                    defaultValue={editingDriver?.code ?? ""}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingDriver}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome
                  </label>
                  <input
                    name="name"
                    defaultValue={editingDriver?.name ?? ""}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingDriver}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Base (opcional)
                  </label>
                  <input
                    name="base"
                    defaultValue={editingDriver?.base ?? ""}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingDriver(null);
                    }}
                    className="cursor-pointer px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
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
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Excluir motorista
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Tem certeza que deseja excluir o motorista{" "}
                <span className="font-semibold">{isDeleting.name}</span>?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsDeleting(null)}
                  className="cursor-pointer px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
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
