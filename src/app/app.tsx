import { useEffect, useRef, useState } from "react";
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
import { Loader2, Check } from "lucide-react";
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

/**
 * Splash de boas-vindas exibido logo após o login bem-sucedido.
 * Mostra um check animado e o nome do analista, depois some sozinho.
 */
function WelcomeSplash({ name }: { name: string }) {
  return (
    <div className="ls-welcome fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#edf1f7]">
      <style>{`
        @keyframes lw-fade { 0%{opacity:0} 12%{opacity:1} 82%{opacity:1} 100%{opacity:0} }
        @keyframes lw-pop {
          0%{transform:scale(.4);opacity:0}
          55%{transform:scale(1.12);opacity:1}
          70%{transform:scale(.96)}
          100%{transform:scale(1);opacity:1}
        }
        @keyframes lw-ring {
          0%{transform:translate(-50%,-50%) scale(.7);opacity:.6}
          100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}
        }
        @keyframes lw-check { from{stroke-dashoffset:48} to{stroke-dashoffset:0} }
        @keyframes lw-up { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
        .ls-welcome { animation: lw-fade 1.6s ease forwards; }
      `}</style>

      <div className="relative flex h-24 w-24 items-center justify-center">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-20 w-20 rounded-full border-2 border-[#3a6ee8]/40"
            style={{
              animation: "lw-ring 1.4s ease-out forwards",
              animationDelay: `${0.15 + i * 0.25}s`,
            }}
          />
        ))}
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[#3a6ee8] shadow-lg shadow-[#3a6ee8]/30"
          style={{ animation: "lw-pop .6s cubic-bezier(.2,.8,.3,1) forwards" }}
        >
          <Check
            className="h-10 w-10 text-white"
            strokeWidth={3}
            style={{
              strokeDasharray: 48,
              animation: "lw-check .45s ease forwards .35s",
            }}
          />
        </div>
      </div>

      <div
        className="text-center"
        style={{ animation: "lw-up .5s ease forwards .4s", opacity: 0 }}
      >
        <p className="text-lg font-semibold text-[#1a2a4a]">
          Bem-vindo{name ? `, ${name.split(" ")[0]}` : ""}!
        </p>
        <p className="mt-0.5 text-sm text-[#8899bb]">Preparando seu painel…</p>
      </div>
    </div>
  );
}

function AuthGate() {
  const { loading, session, profileName } = useAuth();
  // Marca se a tela de login chegou a ser exibida (para não animar em refresh
  // com sessão persistida no localStorage).
  const sawLogin = useRef(false);
  const welcomedFor = useRef<string | null>(null);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    if (
      session &&
      sawLogin.current &&
      welcomedFor.current !== session.user.id
    ) {
      welcomedFor.current = session.user.id;
      setWelcome(true);
      const t = setTimeout(() => setWelcome(false), 1600);
      return () => clearTimeout(t);
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!session) {
    sawLogin.current = true;
    return <LoginScreen />;
  }

  return (
    <>
      <AppShell />
      {welcome && <WelcomeSplash name={profileName} />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
