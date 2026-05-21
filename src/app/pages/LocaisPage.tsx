import { ArrowLeft, MapPin } from "lucide-react";

interface Props {
  onVoltar: () => void;
}

export function LocaisPage({ onVoltar }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <MapPin className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">Locais</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center text-center gap-4 py-20">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Locais</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            Em breve: consulta e visualização dos 421 locais cadastrados com coordenadas, tipo e raio de geofence.
          </p>
        </div>
      </main>
    </div>
  );
}
