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
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <ShaderBackdrop light speed={0.5} />
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
 * Cobertura do carregamento: uma lâmina de "vidro fosco" em tela cheia
 * (base clara translúcida + desfoque, a luz do shader borrada por trás e
 * um brilho de reflexo por cima). Quando o carregamento termina, um furo
 * circular cresce do centro para os cantos (mesma direção do shader),
 * revelando o conteúdo de dentro pra fora; um fade-out acompanha no fim.
 * O shader segue animando durante toda a transição — sem corte.
 */
function LoadingGlass({ out, onDone }: { out: boolean; onDone: () => void }) {
  return (
    <div
      className="lg-root fixed inset-0 z-[120] overflow-hidden pointer-events-none"
      data-out={out ? "1" : "0"}
      aria-hidden="true"
      onTransitionEnd={(e) => {
        // Só o fim da transição da própria lâmina (a `opacity`, que é a
        // última a terminar) — ignora eventos que sobem do canvas do shader.
        if (e.target === e.currentTarget && e.propertyName === "opacity") {
          onDone();
        }
      }}
    >
      <style>{`
        @property --lg-hole {
          syntax: '<length-percentage>';
          initial-value: 0%;
          inherits: false;
        }
        .lg-root {
          --lg-hole: 0%;
          opacity: 1;
          -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent var(--lg-hole), #000 calc(var(--lg-hole) + 26%));
                  mask-image: radial-gradient(circle at 50% 50%, transparent var(--lg-hole), #000 calc(var(--lg-hole) + 26%));
          transition: --lg-hole 1000ms cubic-bezier(.4, 0, .2, 1),
                      opacity 700ms ease-out 320ms;
        }
        .lg-root[data-out="1"] {
          --lg-hole: 150%;
          opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .lg-root { transition: opacity 300ms ease; }
        }
      `}</style>
      <div className="absolute inset-0 bg-[#eef2f8]/60 backdrop-blur-2xl" />
      <div className="absolute inset-0 opacity-30 blur-[3px]">
        <ShaderBackdrop light speed={0.5} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-white/5 to-white/25" />
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

  // Controle do vidro do carregamento.
  //  cover  → cobre a tela enquanto `loading`
  //  out    → carregamento terminou; a máscara abre do centro + fade-out
  //  gone   → transição concluída (evento transitionend) → desmonta
  // A abertura só dispara depois de 2 frames com o conteúdo já montado
  // atrás, pra garantir um "antes" limpo (senão a transição pula/corta).
  const [glassPhase, setGlassPhase] = useState<"cover" | "out" | "gone">(
    loading ? "cover" : "gone",
  );

  useEffect(() => {
    if (loading) {
      setGlassPhase("cover");
      return;
    }
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setGlassPhase((p) => (p === "cover" ? "out" : p));
      });
    });
    // Rede de segurança caso o transitionend não chegue.
    const t = window.setTimeout(() => setGlassPhase("gone"), 2600);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(t);
    };
  }, [loading]);

  const showGlass = glassPhase !== "gone";
  const glassOut = glassPhase === "out";

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
      {showGlass && (
        <LoadingGlass out={glassOut} onDone={() => setGlassPhase("gone")} />
      )}
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
