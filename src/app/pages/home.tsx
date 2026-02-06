import { Plus, FileText, Calendar } from 'lucide-react';
import { Ocorrencia } from '../types';
import { OcorrenciaCard } from '../components/ocorrencia-card';

interface HomeProps {
  ocorrencias: Ocorrencia[];
  onNovaOcorrencia: () => void;
  onGerarRelatorio: () => void;
}

export function Home({ ocorrencias, onNovaOcorrencia, onGerarRelatorio }: HomeProps) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const ocorrenciasHoje = ocorrencias.filter(o => {
    const dataOcorrencia = new Date(o.dataEvento + 'T00:00:00');
    const dataHoje = new Date();
    return (
      dataOcorrencia.getDate() === dataHoje.getDate() &&
      dataOcorrencia.getMonth() === dataHoje.getMonth() &&
      dataOcorrencia.getFullYear() === dataHoje.getFullYear()
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Gerador de Relatórios Operacionais
              </h1>
              <p className="text-sm text-gray-600 mt-1 capitalize">
                <Calendar className="w-4 h-4 inline mr-1" />
                {hoje}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onGerarRelatorio}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <FileText className="w-5 h-5" />
                Relatório do Dia
              </button>
              <button
                onClick={onNovaOcorrencia}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
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
          <p className="text-sm text-gray-600">
            {ocorrenciasHoje.length} registro{ocorrenciasHoje.length !== 1 ? 's' : ''} hoje
          </p>
        </div>

        {ocorrenciasHoje.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma ocorrência registrada hoje
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Clique no botão "Nova Ocorrência" para registrar um descumprimento operacional
            </p>
            <button
              onClick={onNovaOcorrencia}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Nova Ocorrência
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ocorrenciasHoje.map((ocorrencia) => (
              <OcorrenciaCard
                key={ocorrencia.id}
                ocorrencia={ocorrencia}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
