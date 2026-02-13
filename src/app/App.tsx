import { useState } from "react";
import { Home } from "./pages/home";
import { NovaOcorrencia } from "./pages/nova-ocorrencia";
import { RelatorioDiario } from "./pages/relatorio-diario";
import { Ocorrencia } from "./types";

import { toast, Toaster } from "sonner";
import { OccurrencePreviewPage } from "./pages/occurrences/preview/OccurrencePreviewPage";

type Page =
  | "home"
  | "nova-ocorrencia"
  | "relatorio-diario"
  | "preview-ocorrencia";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  const [previewOccurrenceId, setPreviewOccurrenceId] = useState<string | null>(
    null,
  );
  const [previewOccurrenceView, setPreviewOccurrenceView] =
    useState<Ocorrencia | null>(null);

  const handleSavedToPreview = (args: { id: string; view: Ocorrencia }) => {
    toast.success("Ocorrência salva! Abrindo preview...");
    setPreviewOccurrenceId(args.id);
    setPreviewOccurrenceView(args.view);
    setCurrentPage("preview-ocorrencia");
  };

  return (
    // Adicionamos um flex-col com min-h-screen para o footer "empurrar" para baixo
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster position="top-right" />

      <main className="flex-grow">
        {currentPage === "home" && (
          <Home
            onNovaOcorrencia={() => setCurrentPage("nova-ocorrencia")}
            onGerarRelatorio={() => setCurrentPage("relatorio-diario")}
          />
        )}

        {currentPage === "nova-ocorrencia" && (
          <NovaOcorrencia
            onVoltar={() => setCurrentPage("home")}
            onSaved={handleSavedToPreview}
          />
        )}

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
