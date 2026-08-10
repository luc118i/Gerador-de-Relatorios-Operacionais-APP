import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { renameAnalisadoPorHistory } from "../../api/occurrences.api";

type AuthContextValue = {
  /** Sessão Supabase (contém o access_token / JWT). */
  session: Session | null;
  user: User | null;
  /** Nome do analista para a apuração (perfil > metadata > parte do e-mail). */
  profileName: string;
  /**
   * Todos os nomes que o usuário já usou (atual + anteriores), normalizados
   * em minúsculas/sem acento. Usado para filtrar ocorrências por `analisadoPor`
   * sem perder o acesso às próprias ocorrências antigas depois de um rename
   * (ver `updateProfileName`).
   */
  profileNameAliases: Set<string>;
  loading: boolean;
  /** `true` quando o usuário chegou aqui pelo link de "esqueci minha senha" e precisa definir uma nova. */
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Cria uma conta nova (auto-cadastro) e dispara o e-mail de confirmação do Supabase. */
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Salva o nome de exibição no perfil do usuário logado. */
  updateProfileName: (name: string) => Promise<{ error: string | null }>;
  /** Dispara o e-mail de recuperação de senha do Supabase para o endereço informado. */
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** Define a nova senha durante o fluxo de recuperação. */
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  /** Cancela o fluxo de recuperação (sai da sessão temporária e volta ao login). */
  cancelPasswordRecovery: () => Promise<void>;
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

/** Normaliza (minúsculas, sem acento) pra comparar nomes sem depender de grafia exata. */
function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Lê os nomes anteriores gravados em `user_metadata.previous_names` (rename history). */
function previousNames(user: User | null): string[] {
  const raw = user?.user_metadata?.previous_names;
  return Array.isArray(raw) ? raw.filter((n): n is string => typeof n === "string") : [];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileNameAliases, setProfileNameAliases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // Busca o nome na tabela `profiles`; cai para metadata/e-mail se não existir.
  const loadProfileName = useCallback(async (u: User | null) => {
    if (!u) {
      setProfileName("");
      setProfileNameAliases(new Set());
      return;
    }
    const fb = fallbackName(u);
    const buildAliases = (current: string) =>
      new Set(
        [current, fb, ...previousNames(u)]
          .filter(Boolean)
          .map(normalizeName),
      );
    try {
      const { data } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", u.id)
        .maybeSingle();
      const nome = (data?.nome ?? "").trim();
      const finalName = nome || fb;
      setProfileName(finalName);
      setProfileNameAliases(buildAliases(finalName));
    } catch {
      setProfileName(fb);
      setProfileNameAliases(buildAliases(fb));
    }
  }, []);

  // `detectSessionInUrl` está desligado no client (ver `src/lib/supabase.ts`), então o
  // link de recuperação de senha ("#access_token=...&type=recovery") precisa ser lido
  // manualmente aqui e trocado por uma sessão válida.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("type=recovery")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (!error) setPasswordRecovery(true);
      // Remove os tokens da URL para não reaplicar ao recarregar a página.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    });
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

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      void loadProfileName(newSession?.user ?? null);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
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

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail) return { error: "Informe um e-mail." };
    if (!trimmedName) return { error: "Informe seu nome." };
    if (password.length < 6) return { error: "A senha deve ter pelo menos 6 caracteres." };

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        // `display_name` é lido pelo dashboard do Supabase; `nome` é o que o app usa primeiro.
        data: { nome: trimmedName, display_name: trimmedName },
        emailRedirectTo: redirectTo,
      },
    });
    if (error) {
      const msg = /already registered|already exists/i.test(error.message)
        ? "Já existe uma conta com este e-mail."
        : error.message;
      return { error: msg };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setPasswordRecovery(false);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) return { error: "Informe um e-mail." };
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
    return { error: error ? error.message : null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (newPassword.length < 6) {
      return { error: "A senha deve ter pelo menos 6 caracteres." };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    setPasswordRecovery(false);
    return { error: null };
  }, []);

  const cancelPasswordRecovery = useCallback(async () => {
    await supabase.auth.signOut();
    setPasswordRecovery(false);
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

    // Bug: ocorrências antigas ficam gravadas com o nome de `analisadoPor` de quando
    // foram criadas. Se o usuário troca o nome de exibição sem isso, o filtro por
    // autor (ver home.tsx) para de bater e ele perde acesso às próprias ocorrências
    // antigas mesmo logado na mesma conta. Por isso guardamos o nome anterior em
    // `previous_names` e passamos a comparar contra todos os aliases (ver
    // `profileNameAliases`), não só o nome atual.
    // `profileName` é a fonte da verdade do que está sendo comparado contra
    // `analisadoPor` na hora de filtrar (pode vir de `profiles.nome`, que nem
    // sempre está espelhado em `user_metadata`), por isso tem prioridade aqui.
    const oldName = profileName || sessionData.session.user.user_metadata?.nome || "";
    const priorNames = previousNames(sessionData.session.user);
    const nextPreviousNames =
      oldName && normalizeName(oldName) !== normalizeName(trimmed)
        ? Array.from(new Set([...priorNames, oldName])).slice(-10)
        : priorNames;

    // Grava em `display_name` (coluna do dashboard) e `nome` (lido primeiro pelo app).
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: trimmed, nome: trimmed, previous_names: nextPreviousNames },
    });
    if (error) {
      const msg = /session|jwt|token/i.test(error.message)
        ? "Sua sessão expirou. Saia e entre novamente para editar o perfil."
        : error.message;
      return { error: msg };
    }
    setUser(data.user);
    setProfileName(trimmed);
    setProfileNameAliases(
      new Set([trimmed, ...nextPreviousNames].filter(Boolean).map(normalizeName)),
    );

    // Atualização retroativa: reescreve o `analisadoPor` das ocorrências antigas
    // pro nome novo, pra elas não ficarem "presas" ao nome de exibição de quando
    // foram criadas. Roda em segundo plano (não trava o save do nome) — se
    // falhar, o acesso continua garantido pelos aliases acima de qualquer forma.
    if (nextPreviousNames.length > priorNames.length) {
      const sinceDateISO = (data.user.created_at ?? "").slice(0, 10);
      void renameAnalisadoPorHistory(nextPreviousNames, trimmed, sinceDateISO)
        .then(({ updated, failed }) => {
          if (updated > 0) {
            toast.success(
              `${updated} ocorrência${updated > 1 ? "s" : ""} antiga${updated > 1 ? "s" : ""} atualizada${updated > 1 ? "s" : ""} para o novo nome.`,
            );
          }
          if (failed > 0) {
            toast.error(
              `${failed} ocorrência${failed > 1 ? "s" : ""} antiga${failed > 1 ? "s" : ""} não puderam ser atualizada${failed > 1 ? "s" : ""} — mas o acesso a elas continua garantido.`,
            );
          }
        })
        .catch(() => {
          // Silencioso: o acesso não depende disso (ver profileNameAliases).
        });
    }

    return { error: null };
  }, [profileName]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profileName,
        profileNameAliases,
        loading,
        passwordRecovery,
        signIn,
        signUp,
        signOut,
        updateProfileName,
        requestPasswordReset,
        updatePassword,
        cancelPasswordRecovery,
      }}
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
