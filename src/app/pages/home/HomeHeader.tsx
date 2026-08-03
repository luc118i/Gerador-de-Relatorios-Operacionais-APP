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
import type { RefObject } from "react";
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
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="relative flex items-center gap-3">
            {isAdmin && (
              <NavBtn onClick={onOpenDrawer} tooltip="Módulos">
                <Menu className="w-4 h-4" />
              </NavBtn>
            )}

            <img src="/favicon.png" alt="Logo" className="w-10 h-10 rounded-xl shrink-0 block" />

            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Gerador de Relatórios
              </h1>
            </div>
            {/* Navegação de datas */}
            <div ref={calendarRef} className="relative flex items-center gap-1 ml-2">
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
                <div className="absolute top-9 left-0 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 rounded-xl z-50">
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
