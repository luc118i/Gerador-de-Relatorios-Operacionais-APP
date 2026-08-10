import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

// Identificador único de build, usado para detectar novas versões em produção.
// Prioriza o hash de commit (quando disponível no ambiente de deploy) e cai
// para um timestamp como fallback.
// (build de teste: notificação de nova versão)
const buildId =
  process.env.VITE_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.RENDER_GIT_COMMIT ||
  String(Date.now());

/**
 * Emite `version.json` na raiz do build com o buildId atual. O app faz
 * polling desse arquivo (sem cache) para saber quando uma nova versão foi
 * publicada e pedir ao usuário um reload.
 */
function versionFilePlugin(): Plugin {
  return {
    name: "emit-version-json",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ buildId }),
      });
    },
  };
}

export default defineConfig({
  // Adicione esta linha para silenciar os logs informativos do Vite
  logLevel: "warn",

  plugins: [react(), tailwindcss(), versionFilePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },

  assetsInclude: ["**/*.svg", "**/*.csv"],
});
