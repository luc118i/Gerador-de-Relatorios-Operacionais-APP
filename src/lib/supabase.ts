import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** `true` quando as variáveis de ambiente do Supabase estão configuradas. */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // Não derruba o app (createClient lança com string vazia) — usamos um
  // placeholder válido e deixamos claro no console que faltou configurar.
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes — login não vai funcionar.",
  );
}

// Placeholder com URL válida evita o crash "supabaseUrl is required" que
// deixaria a tela em branco quando as envs não estão definidas no host.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "gro_auth",
  },
});
