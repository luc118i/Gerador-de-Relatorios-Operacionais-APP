import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type AuthContextValue = {
  /** Sessão Supabase (contém o access_token / JWT). */
  session: Session | null;
  user: User | null;
  /** Nome do analista para a apuração (perfil > metadata > parte do e-mail). */
  profileName: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Salva o nome de exibição no perfil do usuário logado. */
  updateProfileName: (name: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Deriva um nome amigável a partir do que estiver disponível no usuário. */
function fallbackName(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata ?? {};
  // `display_name` é a coluna "Display name" do dashboard do Supabase.
  const metaName = (meta.nome ?? meta.display_name ?? meta.full_name ?? meta.name) as
    | string
    | undefined;
  if (metaName && metaName.trim()) return metaName.trim();
  const email = user.email ?? "";
  const local = email.split("@")[0] ?? "";
  return local || "Analista";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);

  // Busca o nome na tabela `profiles`; cai para metadata/e-mail se não existir.
  const loadProfileName = useCallback(async (u: User | null) => {
    if (!u) {
      setProfileName("");
      return;
    }
    const fb = fallbackName(u);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", u.id)
        .maybeSingle();
      const nome = (data?.nome ?? "").trim();
      setProfileName(nome || fb);
    } catch {
      setProfileName(fb);
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      void loadProfileName(data.session?.user ?? null).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      void loadProfileName(newSession?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfileName]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfileName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return { error: "Informe um nome." };

    // Garante uma sessão válida antes de gravar (getSession tenta refresh do token).
    // Evita o erro cru "Auth session missing!" quando o JWT expirou.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { error: "Sua sessão expirou. Saia e entre novamente para editar o perfil." };
    }

    // Grava em `display_name` (coluna do dashboard) e `nome` (lido primeiro pelo app).
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: trimmed, nome: trimmed },
    });
    if (error) {
      const msg = /session|jwt|token/i.test(error.message)
        ? "Sua sessão expirou. Saia e entre novamente para editar o perfil."
        : error.message;
      return { error: msg };
    }
    setUser(data.user);
    setProfileName(trimmed);
    return { error: null };
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user, profileName, loading, signIn, signOut, updateProfileName }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
