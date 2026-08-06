import {
  BookMarked,
  Building2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Cpu,
  FileText,
  FolderOpen,
  Lock,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import { ptBR } from "date-fns/locale";
import { Calendar } from "../../components/ui/calendar";
import { UserMenu } from "../../components/UserMenu";
import { ThemeToggle } from "../../components/ThemeToggle";
import type { AutomationFolders } from "../../../hooks/useAutomationFolders";
import { ActionBtn, NavBtn } from "./HeaderButtons";

interface HomeHeaderProps {
  isAdmin: boolean;
  onOpenDrawer: () => void;

  calendarRef: RefObject<HTMLDivElement | null>;
  calendarVisible: boolean;
  onToggleCalendar: () => void;
  changeDay: (offset: number) => void;
  formattedDate: string;
  dateDiffLabel: string;
  goToday: () => void;
  selectedDateObj: Date;
  onSelectDate: (date?: Date) => void;

  onGerarRelatorio: () => void;
  onGerenciarMotoristas: () => void;
  onGerenciarNomes: () => void;
  onGerenciarBaseResponsaveis: () => void;
  onNovaOcorrencia: () => void;
  onShowAdminLogin: () => void;
  logout: () => void;

  agentAvailable: boolean;
  automationFolders: AutomationFolders | null;
  onShowAutomationFolderModal: () => void;
}

/** Cabeçalho fixo da Home: logo, navegação de datas e ações (relatório,
 * motoristas, nova ocorrência, indicador do agente e menu admin). Extraído
 * de `home.tsx` — só reorganiza o JSX existente, sem alterar comportamento. */
export function HomeHeader({
  isAdmin,
  onOpenDrawer,
  calendarRef,
  calendarVisible,
  onToggleCalendar,
  changeDay,
  formattedDate,
  dateDiffLabel,
  goToday,
  selectedDateObj,
  onSelectDate,
  onGerarRelatorio,
  onGerenciarMotoristas,
  onGerenciarNomes,
  onGerenciarBaseResponsaveis,
  onNovaOcorrencia,
  onShowAdminLogin,
  logout,
  agentAvailable,
  automationFolders,
  onShowAutomationFolderModal,
}: HomeHeaderProps) {
  // Ícone da navbar "encolhe" e se acomoda na barra ao rolar a página, com
  // as sombras em camadas se escondendo atrás dele — tudo via transição CSS.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 bg-[#d9d9d9] dark:bg-gray-900 border-t-[1.5px] border-t-white/85 dark:border-t-0 dark:border-b dark:border-gray-800 transition-shadow duration-500 ease-out dark:shadow-none ${
        scrolled
          ? "shadow-[0_10px_20px_-4px_rgba(0,0,0,0.12)]"
          : "shadow-[0_5px_1.5px_rgba(0,0,0,0.5),0_9px_8px_rgba(0,0,0,0.25)]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <div className="relative flex items-center gap-3">
            {isAdmin && (
              <NavBtn onClick={onOpenDrawer} tooltip="Módulos">
                <Menu className="w-4 h-4" />
              </NavBtn>
            )}

            <div
              className="relative z-10 shrink-0 transition-[width,height,transform] duration-500 ease-out"
              style={{
                width: scrolled ? "2.625rem" : "3.5rem",
                height: scrolled ? "2.625rem" : "3.5rem",
                transform: `translateY(${scrolled ? 0 : 20}px)`,
              }}
            >
              {/* Sombra em camadas simulando espessura física (luz vindo de cima-esquerda,
                  projeção pra baixo-direita): core escuro logo atrás do ícone (lateral do
                  bloco) → lâmina clara nítida atrás do core. Ao rolar, o ícone encolhe e se
                  acomoda na navbar, e as camadas de sombra recuam para trás dele. */}
              <button
                type="button"
                onClick={() => window.location.reload()}
                title="Recarregar página"
                className="relative w-full h-full shrink-0 flex items-center justify-center overflow-hidden cursor-pointer
                  bg-gradient-to-b from-[#e6bdf9] to-[#d79bf5] dark:bg-none dark:bg-[#0b0b0f]
                  transition-all duration-500 ease-out hover:-translate-y-1"
                style={{
                  borderRadius: scrolled ? "4px" : "16px",
                  boxShadow: scrolled
                    ? "inset 1px 1px 0 0 rgba(255,255,255,0.6), 1px 3px 1px 0px rgba(0,0,0,0.5), 1px 4px 0px 0px rgba(214,214,214,0.7)"
                    : "inset 1px 1px 0 0 rgba(255,255,255,0.6), 2px 8px 1px 1px rgba(0,0,0,0.75), 3px 13px 0px 0px rgba(214,214,214,0.9)",
                }}
              >
                <img src="/logo.png" alt="Logo" className="dark:hidden w-full h-full object-contain" />
                <img src="/favicon-dark.png" alt="Logo" className="hidden dark:block w-full h-full object-contain" />
              </button>
            </div>

            <div className="leading-none select-none">
              <p className="text-[11px] font-semibold tracking-[0.15em] text-gray-500 dark:text-gray-400 uppercase mb-0.5">
                Gerador de
              </p>
              <p className="text-xl font-extrabold tracking-[0.2em] uppercase">
                <span className="bg-blue-600 dark:bg-blue-500 text-white px-1.5 py-0.5">
                  Relatórios
                </span>
              </p>
            </div>
          </div>

          {/* Navegação de datas — coluna central, fica centralizada na barra
              independente de quantos botões existem à direita (admin ou não). */}
          <div ref={calendarRef} className="relative flex items-center justify-center gap-1">
            <NavBtn onClick={onToggleCalendar} tooltip="Abrir calendário">
              <CalendarIcon className="w-4 h-4" />
            </NavBtn>
            <NavBtn onClick={() => changeDay(-1)} tooltip="Dia anterior">
              <ChevronLeft className="w-4 h-4" />
            </NavBtn>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium px-1 select-none capitalize whitespace-nowrap">
              {formattedDate}
            </span>
            <NavBtn onClick={() => changeDay(1)} tooltip="Próximo dia">
              <ChevronRight className="w-4 h-4" />
            </NavBtn>
            <button
              onClick={goToday}
              className="cursor-pointer ml-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition font-medium"
              title={dateDiffLabel}
            >
              {dateDiffLabel}
            </button>
            {calendarVisible && (
              <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 rounded-xl z-50">
                <Calendar
                  mode="single"
                  selected={selectedDateObj}
                  onSelect={onSelectDate}
                  locale={ptBR}
                  initialFocus
                />
              </div>
            )}
          </div>

          {/* Ações — icon-only com tooltip */}
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <ActionBtn onClick={onGerarRelatorio} tooltip="Relatorio Diario">
                <FileText className="w-4 h-4" />
              </ActionBtn>
            )}
            {isAdmin && (
              <ActionBtn onClick={onGerenciarMotoristas} tooltip="Motoristas">
                <Users className="w-4 h-4" />
              </ActionBtn>
            )}

            {/* Login de Admin — à esquerda do +, apenas quando não é admin */}
            {!isAdmin && (
              <button
                onClick={onShowAdminLogin}
                className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:text-gray-600 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                title="Entrar como Admin"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}

            <ActionBtn onClick={onNovaOcorrencia} tooltip="Nova Ocorrência" primary>
              <Plus className="w-4 h-4" />
            </ActionBtn>

            {/* Indicador do agente local — visível apenas para admin */}
            {isAdmin && (
              <>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
                {agentAvailable ? (
                  <div
                    title="Agente local conectado — automações rodam na sua máquina"
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50"
                  >
                    <Cpu className="w-3 h-3" />
                    <span className="hidden sm:inline">Agente</span>
                  </div>
                ) : (
                  <a
                    href="https://github.com/luc118i/rizer-agent/releases/latest/download/RIZER.Agent.Setup.exe"
                    title="Baixar agente local — automações rodarão na sua máquina"
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-400 bg-gray-100 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-500 dark:bg-gray-800 dark:hover:text-blue-400 dark:hover:bg-blue-950/50 transition-colors"
                    download
                  >
                    <Cpu className="w-3 h-3" />
                    <span className="hidden sm:inline">Servidor</span>
                  </a>
                )}
              </>
            )}

            {/* Admin — dropdown apenas quando logado como admin */}
            {isAdmin && (
              <>
                {/* Separador */}
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
                <div className="relative group/admin">
                  <button
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/50 dark:hover:bg-emerald-950 transition-colors"
                    title="Logado como Admin"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Admin</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 pointer-events-none group-hover/admin:opacity-100 group-hover/admin:pointer-events-auto transition-opacity z-50">
                    <button
                      onClick={onShowAutomationFolderModal}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950/50 rounded-t-lg transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {automationFolders
                          ? `${automationFolders.relatoriosFolderName} / ${automationFolders.medidasFolderName}`
                          : "Pastas de automação"}
                      </span>
                    </button>
                    <button
                      onClick={onGerenciarNomes}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      <BookMarked className="w-3.5 h-3.5 shrink-0" />
                      Nomes padronizados
                    </button>
                    <button
                      onClick={onGerenciarBaseResponsaveis}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      Base e Responsáveis
                    </button>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-red-950/50 rounded-b-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sair da conta admin
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Tema claro/escuro — sempre visível */}
            <ThemeToggle />

            {/* Perfil do usuário logado (Supabase) — sempre visível */}
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
