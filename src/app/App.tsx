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
    <>
      <Toaster position="top-right" />

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
    </>
  );
}
