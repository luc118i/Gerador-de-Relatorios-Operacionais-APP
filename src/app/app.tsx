import { useState } from "react";
import { Home } from "./pages/home";
import { NovaOcorrencia } from "./pages/nova-ocorrencia";
import { RelatorioDiario } from "./pages/relatorio-diario";
import { Ocorrencia } from "./types";

import { toast, Toaster } from "sonner";
import { OccurrencePreviewPage } from "./pages/occurrences/preview/OccurrencePreviewPage";
import { DriversPage } from "./pages/DriversPage";
import { GerenciarNomesPage } from "./pages/GerenciarNomesPage";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginScreen } from "./components/LoginScreen";
import { Loader2 } from "lucide-react";
import { AppDrawer, type DrawerPage } from "./components/AppDrawer";
import { AnaliseTelemetriaPage } from "./pages/AnaliseTelemetriaPage";
import { EsquemasRotaPage } from "./pages/EsquemasRotaPage";
import { LocaisPage } from "./pages/LocaisPage";

type Page =
  | "home"
  | "nova-ocorrencia"
  | "relatorio-diario"
  | "preview-ocorrencia"
  | "motoristas"
  | "gerenciar-nomes"
  | DrawerPage;

function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [previewOccurrenceId, setPreviewOccurrenceId] = useState<string | null>(null);
  const [previewOccurrenceView, setPreviewOccurrenceView] = useState<Ocorrencia | null>(null);

  const handleIrParaNovo = () => {
    setPreviewOccurrenceId(null);
    setPreviewOccurrenceView(null);
    setCurrentPage("nova-ocorrencia");
  };

  const handleSavedToPreview = (args: { id: string; view: Ocorrencia }) => {
    toast.success("Ocorrência salva! Abrindo preview...");
    setPreviewOccurrenceId(args.id);
    setPreviewOccurrenceView(args.view);
    setCurrentPage("preview-ocorrencia");
  };

  const drawerPage: DrawerPage | null =
    currentPage === "analise-viagem" || currentPage === "esquemas-rota" || currentPage === "locais"
      ? currentPage
      : null;

  return (
    <AdminAuthProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Toaster position="top-right" />

        <AppDrawer
          open={drawerOpen}
          currentPage={drawerPage}
          onClose={() => setDrawerOpen(false)}
          onNavigate={(page) => setCurrentPage(page)}
        />

        <main className="flex-grow">
          {currentPage === "home" && (
            <Home
              onNovaOcorrencia={handleIrParaNovo}
              onGerarRelatorio={() => setCurrentPage("relatorio-diario")}
              onGerenciarMotoristas={() => setCurrentPage("motoristas")}
              onGerenciarNomes={() => setCurrentPage("gerenciar-nomes")}
              onOpenDrawer={() => setDrawerOpen(true)}
            />
          )}

          {currentPage === "nova-ocorrencia" && (
            <NovaOcorrencia
              onVoltar={() => setCurrentPage("home")}
              onSaved={handleSavedToPreview}
              edicao={previewOccurrenceView ?? undefined}
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

          {currentPage === "motoristas" && (
            <DriversPage onVoltar={() => setCurrentPage("home")} />
          )}

          {currentPage === "gerenciar-nomes" && (
            <GerenciarNomesPage onVoltar={() => setCurrentPage("home")} />
          )}

          {currentPage === "analise-viagem" && (
            <AnaliseTelemetriaPage onVoltar={() => setCurrentPage("home")} />
          )}

          {currentPage === "esquemas-rota" && (
            <EsquemasRotaPage onVoltar={() => setCurrentPage("home")} />
          )}

          {currentPage === "locais" && (
            <LocaisPage onVoltar={() => setCurrentPage("home")} />
          )}
        </main>

        <footer className="py-6 px-6 md:px-12 border-t border-gray-200 bg-transparent">
          <div
            className="max-w-7xl mx-auto text-center"
            style={{ color: "#718096" }}
          >
            <p className="text-sm">
              © {new Date().getFullYear()} Lucas Inacio • Gerador de Relatórios Operacionais
            </p>
          </div>
        </footer>
      </div>
    </AdminAuthProvider>
  );
}

function AuthGate() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  return <AppShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
