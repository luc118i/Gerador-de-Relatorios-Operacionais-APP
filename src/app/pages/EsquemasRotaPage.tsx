import { ArrowLeft, Route } from "lucide-react";

interface Props {
  onVoltar: () => void;
}

export function EsquemasRotaPage({ onVoltar }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Route className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Esquemas de Rota</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center text-center gap-4 py-20">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <Route className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Esquemas de Rota</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Em breve: criação e gerenciamento de esquemas operacionais de rota com pontos e configurações de velocidade.
          </p>
        </div>
      </main>
    </div>
  );
}
