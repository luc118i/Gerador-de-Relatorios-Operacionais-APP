import { useState, useEffect } from "react";
import { Home } from "./pages/home";
import { NovaOcorrencia } from "./pages/nova-ocorrencia";
import { RelatorioDiario } from "./pages/relatorio-diario";
import { Ocorrencia } from "./types";

import { toast, Toaster } from "sonner";
import { OccurrencePreviewPage } from "./pages/occurrences/preview/OccurrencePreviewPage";
import { TypeSelector } from "./pages/occurrences/selector/TypeSelector";

type Page =
  | "home"
  | "nova-ocorrencia"
  | "relatorio-diario"
  | "selecionar-tipo"
  | "preview-ocorrencia";

type OccurrenceType = {
  id: string;
  code: string;
  title: string;
};

function RedirectToSelector({ onRedirect }: { onRedirect: () => void }) {
  useEffect(() => {
    onRedirect();
  }, [onRedirect]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-gray-500 animate-pulse">
        Redirecionando para seleção de tipo...
      </p>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  const [previewOccurrenceId, setPreviewOccurrenceId] = useState<string | null>(
    null,
  );
  const [previewOccurrenceView, setPreviewOccurrenceView] =
    useState<Ocorrencia | null>(null);

  const handleIrParaNovo = (type?: OccurrenceType) => {
    setPreviewOccurrenceId(null);
    setPreviewOccurrenceView(null);

    if (type) {
      setSelectedOccurrenceType(type);
      setCurrentPage("nova-ocorrencia");
    } else {
      setCurrentPage("selecionar-tipo");
    }
  };

  const handleSavedToPreview = (args: { id: string; view: Ocorrencia }) => {
    toast.success("Ocorrência salva! Abrindo preview...");
    setPreviewOccurrenceId(args.id);
    setPreviewOccurrenceView(args.view);
    setCurrentPage("preview-ocorrencia");
  };

  const [selectedOccurrenceType, setSelectedOccurrenceType] = useState<{
    id: string;
    code: string;
    title: string;
  } | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster position="top-right" />

      <main className="flex-grow">
        {currentPage === "home" && (
          <Home
            onNovaOcorrencia={handleIrParaNovo}
            onGerarRelatorio={() => setCurrentPage("relatorio-diario")}
          />
        )}

        {currentPage === "selecionar-tipo" && (
          <TypeSelector
            onCancel={() => setCurrentPage("home")}
            onSelect={(type) => {
              setSelectedOccurrenceType(type);
              setCurrentPage("nova-ocorrencia");
            }}
          />
        )}

        {/* Bloco Único para Nova Ocorrência */}
        {currentPage === "nova-ocorrencia" &&
          (selectedOccurrenceType ? (
            <NovaOcorrencia
              occurrenceType={selectedOccurrenceType}
              onVoltar={() => setCurrentPage("selecionar-tipo")}
              onSaved={handleSavedToPreview}
              edicao={previewOccurrenceView ?? undefined}
            />
          ) : (
            <RedirectToSelector
              onRedirect={() => setCurrentPage("selecionar-tipo")}
            />
          ))}

        {currentPage === "relatorio-diario" && (
          <RelatorioDiario onVoltar={() => setCurrentPage("home")} />
        )}

        {currentPage === "preview-ocorrencia" &&
          previewOccurrenceId &&
          previewOccurrenceView && (
            <OccurrencePreviewPage
              occurrenceId={previewOccurrenceId}
              occurrence={previewOccurrenceView}
              onBack={() => setCurrentPage("home")}
              onEdit={() => setCurrentPage("nova-ocorrencia")}
            />
          )}
      </main>

      <footer className="py-6 px-6 md:px-12 border-t border-gray-200 bg-transparent">
        <div
          className="max-w-7xl mx-auto text-center"
          style={{ color: "#718096" }} // Um cinza um pouco mais escuro para melhor contraste
        >
          <p className="text-sm">
            © {new Date().getFullYear()} Lucas Inacio • Gerador de Relatórios
            Operacionais
          </p>
        </div>
      </footer>
    </div>
  );
}
