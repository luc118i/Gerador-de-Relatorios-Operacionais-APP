import { useEffect, useRef, useState, type ReactNode } from "react";
import { Home } from "./pages/home";
import { NovaOcorrencia } from "./pages/nova-ocorrencia";
import { RelatorioDiario } from "./pages/relatorio-diario";
import { Ocorrencia } from "./types";

import { toast } from "sonner";
import { OccurrencePreviewPage } from "./pages/occurrences/preview/OccurrencePreviewPage";
import { DriversPage } from "./pages/DriversPage";
import { GerenciarNomesPage } from "./pages/GerenciarNomesPage";
import { BaseResponsaveisPage } from "./pages/BaseResponsaveisPage";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginScreen } from "./components/LoginScreen";
import { ResetPasswordScreen } from "./components/ResetPasswordScreen";
import { Check } from "lucide-react";
import { AppDrawer, type DrawerPage } from "./components/AppDrawer";
import { AnaliseTelemetriaPage } from "./pages/AnaliseTelemetriaPage";
import { EsquemasRotaPage } from "./pages/EsquemasRotaPage";
import { LocaisPage } from "./pages/LocaisPage";
import { useAppUpdateNotifier } from "../hooks/useAppUpdateNotifier";
import { ShaderBackdrop } from "./components/ShaderBackdrop";

type Page =
  | "home"
  | "nova-ocorrencia"
  | "relatorio-diario"
  | "preview-ocorrencia"
  | "motoristas"
  | "gerenciar-nomes"
  | "base-responsaveis"
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
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
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
              onGerenciarBaseResponsaveis={() => setCurrentPage("base-responsaveis")}
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

          {currentPage === "base-responsaveis" && (
            <BaseResponsaveisPage onVoltar={() => setCurrentPage("home")} />
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

        <footer className="py-6 px-6 md:px-12 border-t border-gray-200 dark:border-gray-800 bg-transparent">
          <div className="max-w-7xl mx-auto text-center text-[#718096] dark:text-gray-500">
            <p className="text-sm">
              © {new Date().getFullYear()} Lucas Inacio • Gerador de Relatórios
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
    <div className="ls-welcome fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 overflow-hidden bg-[#eef2f8]">
      <div className="pointer-events-none absolute inset-0">
        <ShaderBackdrop />
      </div>
      <style>{`
        @keyframes lw-fade { 0%{opacity:0} 9%{opacity:1} 66%{opacity:1} 100%{opacity:0} }
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
        .ls-welcome { animation: lw-fade 2.2s ease-in-out forwards; }
      `}</style>

      <div className="relative z-10 flex h-24 w-24 items-center justify-center">
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
        className="relative z-10 text-center"
        style={{ animation: "lw-up .5s ease forwards .4s", opacity: 0 }}
      >
        <p className="text-lg font-semibold text-[#1a2a4a] [text-shadow:0_1px_10px_rgba(238,242,248,0.9)]">
          Bem-vindo{name ? `, ${name.split(" ")[0]}` : ""}!
        </p>
        <p className="mt-0.5 text-sm text-[#5b6b8c] [text-shadow:0_1px_8px_rgba(238,242,248,0.9)]">
          Preparando seu painel…
        </p>
      </div>
    </div>
  );
}

/**
 * Cobertura do carregamento que, ao terminar, "abre" em duas folhas —
 * mas o corte segue a mesma diagonal das linhas do shader (anti-diagonal,
 * x + y = const). As folhas deslizam em sentidos opostos, perpendicular
 * ao corte, revelando a tela por trás sem o corte seco.
 */
function IntroReveal({ opening }: { opening: boolean }) {
  const trans =
    "transform 950ms cubic-bezier(.7,0,.25,1), opacity 340ms ease 640ms";

  // Triângulos separados pela reta que passa pelo centro na direção (1,-1)
  // — o mesmo ângulo das faixas do shader. Vértices bem fora da viewport
  // para a folha nunca mostrar borda ao deslizar.
  const clipTopLeft = "polygon(-60% -60%, 160% -60%, -60% 160%)";
  const clipBottomRight = "polygon(160% -60%, 160% 160%, -60% 160%)";

  const sheet = "absolute inset-0 will-change-transform";

  return (
    <div
      className="fixed inset-0 z-[120] overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* folha de cima-esquerda → desliza para cima-esquerda */}
      <div
        className={sheet}
        style={{
          clipPath: clipTopLeft,
          transform: opening ? "translate(-80%, -80%)" : "translate(0, 0)",
          opacity: opening ? 0 : 1,
          transition: trans,
        }}
      >
        <ShaderBackdrop />
      </div>

      {/* folha de baixo-direita → desliza para baixo-direita */}
      <div
        className={sheet}
        style={{
          clipPath: clipBottomRight,
          transform: opening ? "translate(80%, 80%)" : "translate(0, 0)",
          opacity: opening ? 0 : 1,
          transition: trans,
        }}
      >
        <ShaderBackdrop />
      </div>

      {/* fresta de luz ao longo do corte, no mesmo ângulo das linhas */}
      <div
        className="absolute left-1/2 top-1/2 h-px bg-white/25"
        style={{
          width: "220%",
          transform: "translate(-50%, -50%) rotate(-45deg)",
          opacity: opening ? 0 : 1,
          transition: "opacity 220ms ease",
        }}
      />
    </div>
  );
}

function AuthGate() {
  const { loading, session, profileName, passwordRecovery } = useAuth();
  // Marca se a tela de login chegou a ser exibida (para não animar em refresh
  // com sessão persistida no localStorage).
  const sawLogin = useRef(false);
  const welcomedFor = useRef<string | null>(null);
  const [welcome, setWelcome] = useState(false);

  // Fases da cobertura de abertura: cobre → abre → some.
  const [intro, setIntro] = useState<"loading" | "opening" | "done">(
    loading ? "loading" : "done",
  );

  useEffect(() => {
    if (!loading && intro === "loading") {
      setIntro("opening");
      const t = setTimeout(() => setIntro("done"), 950);
      return () => clearTimeout(t);
    }
  }, [loading, intro]);

  useEffect(() => {
    if (
      session &&
      sawLogin.current &&
      welcomedFor.current !== session.user.id
    ) {
      welcomedFor.current = session.user.id;
      setWelcome(true);
      const t = setTimeout(() => setWelcome(false), 2200);
      return () => clearTimeout(t);
    }
  }, [session]);

  let body: ReactNode = null;
  if (!loading) {
    if (passwordRecovery) {
      body = <ResetPasswordScreen />;
    } else if (!session) {
      sawLogin.current = true;
      body = <LoginScreen />;
    } else {
      body = (
        <>
          <AppShell />
          {welcome && <WelcomeSplash name={profileName} />}
        </>
      );
    }
  }

  return (
    <>
      {body}
      {intro !== "done" && <IntroReveal opening={intro === "opening"} />}
    </>
  );
}

export default function App() {
  useAppUpdateNotifier();

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
