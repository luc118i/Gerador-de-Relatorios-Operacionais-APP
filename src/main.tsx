import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./app/App";
import "./styles/index.css";
import { Toaster } from "sonner";

// 1. Tipagem para evitar o erro de propriedade inexistente no window
declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: any;
  }
}

// 2. Silenciar logs informativos do Vite e o convite do React DevTools
if (import.meta.env.DEV) {
  const repoUrl =
    "https://github.com/luc118i/Gerador-de-Relatorios-Operacionais-APP";

  // 1. Banner com Link Clicável
  console.log(
    `%c© 2026 Lucas Inacio%cRepo: %c${repoUrl}`,
    "color: #4A5568; font-weight: bold; background: #EDF2F7; padding: 4px 8px; border-radius: 4px 0 0 4px;",
    "color: #718096; background: #F7FAFC; padding: 4px 8px;",
    "color: #3182CE; background: #F7FAFC; padding: 4px 8px; border-radius: 0 4px 4px 0; text-decoration: underline;",
  );

  // 2. Criar um "comando" no console para abrir o repo (Basta digitar 'repo' e dar enter)
  Object.defineProperty(window, "repo", {
    get: () => {
      window.open(repoUrl, "_blank");
      return "Abrindo repositório...";
    },
  });

  console.log(
    "%c💡 Dica: Digite 'repo' e dê Enter para abrir o código-fonte.",
    "color: #718096; font-style: italic; font-size: 10px;",
  );

  // Filtro para os logs do Vite
  const originalLog = console.log;
  console.log = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("[vite]") || args[0].includes("connected"))
    )
      return;
    originalLog(...args);
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster richColors position="top-right" />
  </QueryClientProvider>,
);
