import { useState } from 'react';
import { ArrowLeft, Copy, Download, Check } from 'lucide-react';
import { Ocorrencia } from '../types';
import { gerarRelatorioDiario } from '../utils/relatorio';

interface RelatorioDiarioProps {
  ocorrencias: Ocorrencia[];
  onVoltar: () => void;
}

export function RelatorioDiario({ ocorrencias, onVoltar }: RelatorioDiarioProps) {
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [copiado, setCopiado] = useState(false);

  const ocorrenciasFiltradas = ocorrencias.filter(o => o.dataEvento === dataSelecionada);
  const textoRelatorio = gerarRelatorioDiario(ocorrenciasFiltradas);

  const handleCopiar = () => {
    navigator.clipboard.writeText(textoRelatorio);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleExportar = () => {
    const blob = new Blob([textoRelatorio], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-diario-${dataSelecionada}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onVoltar}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Relatório Diário Consolidado
                </h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Todas as ocorrências em formato padronizado
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopiar}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                {copiado ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copiar Tudo
                  </>
                )}
              </button>
              <button
                onClick={handleExportar}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                Exportar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {/* Filtro de Data */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a Data
            </label>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-600 mt-2">
              {ocorrenciasFiltradas.length} ocorrência{ocorrenciasFiltradas.length !== 1 ? 's' : ''} encontrada{ocorrenciasFiltradas.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Área do Relatório */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Relatório Consolidado
              </label>
              <span className="text-xs text-gray-500">
                Formato oficial padronizado
              </span>
            </div>
            
            <div className="relative">
              <textarea
                value={textoRelatorio}
                readOnly
                rows={30}
                className="w-full px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-800 focus:outline-none resize-none"
              />
              
              {ocorrenciasFiltradas.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-gray-500 font-medium mb-2">
                      Nenhuma ocorrência registrada nesta data
                    </p>
                    <p className="text-sm text-gray-400">
                      Selecione outra data ou registre novas ocorrências
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Footer */}
          {ocorrenciasFiltradas.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  📋 Informações do Relatório
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• O relatório segue o formato oficial padronizado</li>
                  <li>• Cada ocorrência é separada por uma linha de 80 caracteres</li>
                  <li>• As evidências fotográficas devem ser anexadas separadamente</li>
                  <li>• Total de {ocorrenciasFiltradas.reduce((acc, o) => acc + o.evidencias.length, 0)} evidência(s) registrada(s)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
