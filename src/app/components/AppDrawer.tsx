import { useEffect } from "react";
import { X, Route, MapPin, BarChart2 } from "lucide-react";

export type DrawerPage = "analise-viagem" | "esquemas-rota" | "locais";

interface AppDrawerProps {
  open: boolean;
  currentPage: DrawerPage | null;
  onClose: () => void;
  onNavigate: (page: DrawerPage) => void;
}

const ITEMS: { id: DrawerPage; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "analise-viagem",
    label: "Análise de Viagem",
    description: "Upload de CSV e histórico de análises",
    icon: <BarChart2 className="w-5 h-5" />,
  },
  {
    id: "esquemas-rota",
    label: "Esquemas de Rota",
    description: "Gerenciar esquemas operacionais",
    icon: <Route className="w-5 h-5" />,
  },
  {
    id: "locais",
    label: "Locais",
    description: "Consultar locais cadastrados",
    icon: <MapPin className="w-5 h-5" />,
  },
];

export function AppDrawer({ open, currentPage, onClose, onNavigate }: AppDrawerProps) {
  // Bloqueia scroll do body quando o drawer está aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Fecha com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Menu lateral"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Módulos</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Itens de navegação */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {ITEMS.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                className={`cursor-pointer w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`}>
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-medium leading-tight">{item.label}</p>
                  <p className={`text-xs mt-0.5 ${active ? "text-blue-500" : "text-gray-400"}`}>
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Gerador de Relatórios Operacionais
          </p>
        </div>
      </aside>
    </>
  );
}
