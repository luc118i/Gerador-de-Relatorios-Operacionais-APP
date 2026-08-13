declare module "*?raw" {
  const content: string;
  export default content;
}

declare module "*.csv" {
  const content: string;
  export default content;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ADMIN_PIN?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  // App "esquemas-consulta" (MODO APRESENTACAO DOS ESQUEMAS) — ver
  // src/utils/esquemaLookup.ts. Sem essas duas, o link do esquema some da
  // notificação e ela cai pro aviso genérico (nunca quebra o envio).
  readonly VITE_ESQUEMAS_API_URL?: string; // Apps Script (/exec) — mesma fonte que aquele app usa
  readonly VITE_ESQUEMAS_SITE_URL?: string; // ex.: https://esquemas-consulta.vercel.app
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injetado em build time pelo vite.config.ts — identifica a versão atual do bundle. */
declare const __APP_BUILD_ID__: string;
