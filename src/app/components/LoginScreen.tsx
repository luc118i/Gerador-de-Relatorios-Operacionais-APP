import { useMemo, useState } from "react";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  FileBarChart,
  BarChart3,
  User,
  ShieldCheck,
  FileText,
  PieChart,
  KeyRound,
  Table,
  ListChecks,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

/** Nome do desenvolvedor exibido no rodapé (crédito). */
const DEVELOPER_NAME = "Lucas Inácio";

/** Ícones que sobem flutuando no fundo (inspirado no mockup). */
const FLOAT_ICONS = [
  FileBarChart,
  BarChart3,
  Lock,
  User,
  ShieldCheck,
  FileText,
  PieChart,
  LogIn,
  KeyRound,
  Table,
  ListChecks,
];

const FLOAT_BADGES = [
  "acesso seguro",
  "relatório",
  "autenticando…",
  "dados",
  "ocorrências",
  "operacional",
  "verificando",
];

const SPARKLE_COLORS = ["#3a6ee8", "#5bc4a0", "#f5b800", "#d45060", "#8855dd"];

/** Pseudo-random determinístico (mesma posição a cada render). */
function rand(seed: number) {
  const x = Math.sin(seed * 9973.13) * 43758.5453;
  return x - Math.floor(x);
}

export function LoginScreen() {
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<"login" | "forgot" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  function openForgot() {
    setForgotEmail(email);
    setForgotSent(false);
    setForgotError(null);
    setMode("forgot");
  }

  function openSignup() {
    setSignupEmail(email);
    setSignupSent(false);
    setSignupError(null);
    setMode("signup");
  }

  function backToLogin() {
    setMode("login");
    setForgotError(null);
    setSignupError(null);
  }

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword || !signupConfirm) return;
    if (signupPassword !== signupConfirm) {
      setSignupError("As senhas não coincidem.");
      return;
    }
    setSignupLoading(true);
    setSignupError(null);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setSignupLoading(false);
    if (error) {
      setSignupError(error);
      return;
    }
    setSignupSent(true);
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotError(null);
    const { error } = await requestPasswordReset(forgotEmail);
    setForgotLoading(false);
    if (error) {
      setForgotError(error);
      return;
    }
    setForgotSent(true);
  }

  // Partículas pré-computadas (posição/atraso estáveis entre renders).
  const floatIcons = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => {
        const Icon = FLOAT_ICONS[i % FLOAT_ICONS.length];
        return {
          Icon,
          left: 8 + rand(i + 1) * 80,
          bottom: 6 + rand(i + 11) * 70,
          dur: 6 + rand(i + 21) * 4,
          delay: rand(i + 31) * 6,
        };
      }),
    [],
  );

  const floatBadges = useMemo(
    () =>
      FLOAT_BADGES.map((text, i) => ({
        text,
        left: 6 + rand(i + 101) * 66,
        bottom: 10 + rand(i + 111) * 64,
        dur: 5.5 + rand(i + 121) * 3,
        delay: rand(i + 131) * 7,
      })),
    [],
  );

  const sparkles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: 4 + rand(i + 201) * 92,
        bottom: 4 + rand(i + 211) * 88,
        color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
        dur: 1.4 + rand(i + 221) * 1.2,
        delay: rand(i + 231) * 2.5,
      })),
    [],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(
        error.toLowerCase().includes("invalid")
          ? "E-mail ou senha incorretos."
          : error,
      );
    }
  }

  const inputBase =
    "w-full pl-10 pr-10 h-11 rounded-xl border border-[#dde4f0] dark:border-gray-700 bg-[#f4f7ff] dark:bg-gray-800 text-sm text-[#1a2a4a] dark:text-gray-100 outline-none transition-colors focus:border-[#3a6ee8] focus:bg-white dark:focus:bg-gray-800 placeholder:text-[#9aa8c8] dark:placeholder:text-gray-500";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-4 overflow-hidden bg-[#edf1f7] dark:bg-[#0b1220] px-4 py-8">
      {/* keyframes locais (escopo via prefixo ls-) */}
      <style>{`
        @keyframes ls-scan { 0%{top:0;opacity:.7} 50%{opacity:1} 100%{top:100%;opacity:.2} }
        @keyframes ls-rise {
          0%{opacity:0;transform:translateY(14px) scale(.7)}
          18%{opacity:.8;transform:translateY(0) scale(1)}
          80%{opacity:.35;transform:translateY(-40px) scale(.95)}
          100%{opacity:0;transform:translateY(-58px) scale(.8)}
        }
        @keyframes ls-badge {
          0%{opacity:0;transform:translateY(8px) scale(.85)}
          20%{opacity:1;transform:translateY(0) scale(1)}
          75%{opacity:.7}
          100%{opacity:0;transform:translateY(-22px) scale(.9)}
        }
        @keyframes ls-sparkle { 0%,100%{opacity:0;transform:scale(.5)} 50%{opacity:.75;transform:scale(1.6)} }
        @keyframes ls-spin { from{transform:translate(-50%,-50%) rotate(0)} to{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes ls-pulse {
          0%{transform:translate(-50%,-50%) scale(.9);opacity:.5}
          100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-anim { animation: none !important; opacity: .25 !important; }
        }
      `}</style>

      {/* ── Fundo decorativo ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Grade */}
        {[20, 40, 60, 80].map((t) => (
          <div
            key={`h${t}`}
            className="absolute left-0 right-0 h-px bg-[rgba(90,120,200,0.08)]"
            style={{ top: `${t}%` }}
          />
        ))}
        {[16, 32, 50, 68, 84].map((l) => (
          <div
            key={`v${l}`}
            className="absolute top-0 bottom-0 w-px bg-[rgba(90,120,200,0.08)]"
            style={{ left: `${l}%` }}
          />
        ))}

        {/* Dot grids nos cantos */}
        {[
          { top: 16, left: 16, cols: 6, rows: 3 },
          { bottom: 16, right: 16, cols: 6, rows: 3 },
          { top: 16, right: 16, cols: 4, rows: 2 },
          { bottom: 16, left: 16, cols: 4, rows: 2 },
        ].map((g, gi) => (
          <div
            key={gi}
            className="absolute grid gap-3 opacity-[0.13]"
            style={{
              top: g.top,
              bottom: g.bottom,
              left: g.left,
              right: g.right,
              gridTemplateColumns: `repeat(${g.cols}, 1fr)`,
            }}
          >
            {Array.from({ length: g.cols * g.rows }, (_, i) => (
              <span
                key={i}
                className="block w-[3px] h-[3px] rounded-full bg-[#4477cc]"
              />
            ))}
          </div>
        ))}

        {/* Linha de varredura */}
        <div
          className="ls-anim absolute left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(70,120,220,.18) 40%, rgba(70,120,220,.28) 50%, rgba(70,120,220,.18) 60%, transparent 100%)",
            animation: "ls-scan 4s linear infinite",
          }}
        />

        {/* Ícones flutuantes */}
        {floatIcons.map(({ Icon, left, bottom, dur, delay }, i) => (
          <div
            key={`fi${i}`}
            className="ls-anim absolute text-[#3c6ed2]/40"
            style={{
              left: `${left}%`,
              bottom: `${bottom}%`,
              animation: `ls-rise ${dur}s ease-in-out ${delay}s infinite`,
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
        ))}

        {/* Badges flutuantes */}
        {floatBadges.map((b, i) => (
          <div
            key={`fb${i}`}
            className="ls-anim absolute rounded-full border border-[rgba(80,120,210,0.2)] dark:border-[rgba(140,170,240,0.3)] bg-[rgba(220,230,255,0.85)] dark:bg-[rgba(30,45,80,0.85)] px-2 py-0.5 text-[10px] font-semibold text-[#3a5fbb] dark:text-[#8fb0f0] whitespace-nowrap"
            style={{
              left: `${b.left}%`,
              bottom: `${b.bottom}%`,
              animation: `ls-badge ${b.dur}s ease-in-out ${b.delay}s infinite`,
            }}
          >
            {b.text}
          </div>
        ))}

        {/* Sparkles */}
        {sparkles.map((s, i) => (
          <span
            key={`sp${i}`}
            className="ls-anim absolute w-[3px] h-[3px] rounded-full"
            style={{
              left: `${s.left}%`,
              bottom: `${s.bottom}%`,
              background: s.color,
              animation: `ls-sparkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Card ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[340px] rounded-2xl bg-white dark:bg-[#111a2e] px-8 pt-9 pb-8 shadow-[0_2px_24px_rgba(60,100,200,0.10),0_0.5px_2px_rgba(60,100,200,0.10)]">
        <div className="flex justify-center mb-2">
          <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-b from-[#e6bdf9] to-[#d79bf5] dark:bg-none dark:bg-[#0b0b0f]">
            {/* Anéis de pulso */}
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="ls-anim absolute left-1/2 top-1/2 h-[52px] w-[52px] rounded-full border border-[rgba(60,110,230,0.25)]"
                style={{
                  animation: "ls-pulse 3.5s ease-out infinite",
                  animationDelay: `${i * 1.2}s`,
                }}
              />
            ))}
            {/* Órbita */}
            <span
              className="ls-anim absolute left-1/2 top-1/2 h-[68px] w-[68px] rounded-full border border-dashed border-[rgba(60,110,230,0.2)]"
              style={{ animation: "ls-spin 10s linear infinite" }}
            >
              <span className="absolute left-1/2 top-[-2.5px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#3a6ee8] opacity-50" />
            </span>
            <img src="/logo.png" alt="Logo" className="relative dark:hidden w-full h-full object-contain" />
            <img
              src="/favicon-dark.png"
              alt="Logo"
              className="relative hidden dark:block w-full h-full object-contain"
            />
          </div>
        </div>

        {mode === "login" ? (
          <>
            <h1 className="text-center text-[17px] font-semibold text-[#1a2a4a] dark:text-gray-100">
              Gerador de Relatórios
            </h1>
            <p className="mb-5 text-center text-xs text-[#8899bb] dark:text-gray-500">
              Entre com seu perfil para apurar ocorrências
            </p>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc] dark:text-gray-500" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="seu@email.com"
                  className={inputBase}
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc] dark:text-gray-500" />
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Senha"
                  className={inputBase}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#8899cc] dark:text-gray-500 hover:text-[#5a6a99] dark:hover:text-gray-300 transition-[color,transform] active:scale-90"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openForgot}
                  className="cursor-pointer text-xs font-medium text-[#3a6ee8] hover:text-[#2a5dd4] dark:text-[#7fa0f0] dark:hover:text-[#9cb6f5] transition-[color,transform] active:scale-95"
                >
                  Esqueci minha senha
                </button>
              </div>

              {error && <p className="text-center text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={!email || !password || loading}
                className="mt-1 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#3a6ee8] text-sm font-semibold text-white transition-[background,transform] hover:bg-[#2a5dd4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-[17px] h-[17px]" />
                )}
                {loading ? "Entrando…" : "Entrar"}
              </button>

              <button
                type="button"
                onClick={openSignup}
                className="flex h-9 w-full cursor-pointer items-center justify-center gap-1 text-xs font-medium text-[#8899bb] hover:text-[#5a6a99] dark:text-gray-500 dark:hover:text-gray-300 transition-[color,transform] active:scale-95"
              >
                Não tem conta?{" "}
                <span className="text-[#3a6ee8] dark:text-[#7fa0f0] font-semibold">Criar conta</span>
              </button>
            </form>
          </>
        ) : mode === "forgot" ? (
          <>
            <h1 className="text-center text-[17px] font-semibold text-[#1a2a4a] dark:text-gray-100">
              Esqueci minha senha
            </h1>
            <p className="mb-5 text-center text-xs text-[#8899bb] dark:text-gray-500">
              {forgotSent
                ? "Confira sua caixa de entrada"
                : "Informe seu e-mail para receber o link de recuperação"}
            </p>

            {forgotSent ? (
              <div className="space-y-4">
                <p className="text-center text-xs text-[#5a6a99] dark:text-gray-400">
                  Se <span className="font-semibold">{forgotEmail}</span> estiver cadastrado,
                  enviamos um link para redefinir a senha. O link expira em pouco tempo.
                </p>
                <button
                  type="button"
                  onClick={backToLogin}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#3a6ee8] text-sm font-semibold text-white transition-[background,transform] hover:bg-[#2a5dd4] active:scale-[0.98]"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-2.5">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc] dark:text-gray-500" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setForgotError(null);
                    }}
                    placeholder="seu@email.com"
                    className={inputBase}
                    autoFocus
                  />
                </div>

                {forgotError && (
                  <p className="text-center text-xs text-red-500">{forgotError}</p>
                )}

                <button
                  type="submit"
                  disabled={!forgotEmail || forgotLoading}
                  className="mt-1 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#3a6ee8] text-sm font-semibold text-white transition-[background,transform] hover:bg-[#2a5dd4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {forgotLoading ? "Enviando…" : "Enviar link de recuperação"}
                </button>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="flex h-9 w-full cursor-pointer items-center justify-center text-xs font-medium text-[#8899bb] hover:text-[#5a6a99] dark:text-gray-500 dark:hover:text-gray-300 transition-[color,transform] active:scale-95"
                >
                  Voltar ao login
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <h1 className="text-center text-[17px] font-semibold text-[#1a2a4a] dark:text-gray-100">
              Criar conta
            </h1>
            <p className="mb-5 text-center text-xs text-[#8899bb] dark:text-gray-500">
              {signupSent
                ? "Confirme seu e-mail para continuar"
                : "Cadastre-se para apurar ocorrências"}
            </p>

            {signupSent ? (
              <div className="space-y-4">
                <p className="text-center text-xs text-[#5a6a99] dark:text-gray-400">
                  Enviamos um link de confirmação para{" "}
                  <span className="font-semibold">{signupEmail}</span>. Clique nele para ativar
                  sua conta e conseguir entrar.
                </p>
                <button
                  type="button"
                  onClick={backToLogin}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#3a6ee8] text-sm font-semibold text-white transition-[background,transform] hover:bg-[#2a5dd4] active:scale-[0.98]"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-2.5">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc] dark:text-gray-500" />
                  <input
                    type="text"
                    autoComplete="name"
                    value={signupName}
                    onChange={(e) => {
                      setSignupName(e.target.value.toUpperCase());
                      setSignupError(null);
                    }}
                    placeholder="Seu nome"
                    className={inputBase}
                    autoFocus
                  />
                </div>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc] dark:text-gray-500" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      setSignupError(null);
                    }}
                    placeholder="seu@email.com"
                    className={inputBase}
                  />
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc] dark:text-gray-500" />
                  <input
                    type={showSignupPwd ? "text" : "password"}
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      setSignupError(null);
                    }}
                    placeholder="Senha"
                    className={inputBase}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowSignupPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#8899cc] dark:text-gray-500 hover:text-[#5a6a99] dark:hover:text-gray-300 transition-[color,transform] active:scale-90"
                  >
                    {showSignupPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc] dark:text-gray-500" />
                  <input
                    type={showSignupPwd ? "text" : "password"}
                    autoComplete="new-password"
                    value={signupConfirm}
                    onChange={(e) => {
                      setSignupConfirm(e.target.value);
                      setSignupError(null);
                    }}
                    placeholder="Confirmar senha"
                    className={inputBase}
                  />
                </div>

                {signupError && (
                  <p className="text-center text-xs text-red-500">{signupError}</p>
                )}

                <button
                  type="submit"
                  disabled={
                    !signupName ||
                    !signupEmail ||
                    !signupPassword ||
                    !signupConfirm ||
                    signupLoading
                  }
                  className="mt-1 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#3a6ee8] text-sm font-semibold text-white transition-[background,transform] hover:bg-[#2a5dd4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {signupLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-[17px] h-[17px]" />
                  )}
                  {signupLoading ? "Criando…" : "Criar conta"}
                </button>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="flex h-9 w-full cursor-pointer items-center justify-center text-xs font-medium text-[#8899bb] hover:text-[#5a6a99] dark:text-gray-500 dark:hover:text-gray-300 transition-[color,transform] active:scale-95"
                >
                  Já tem conta? Entrar
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* ── Rodapé ───────────────────────────────────────────────────── */}
      <div className="relative z-10 text-center">
        <p className="text-[11px] text-[#aabbcc] dark:text-gray-600">
          © {new Date().getFullYear()} Gerador de Relatórios
        </p>
        <p className="mt-0.5 text-[11px] text-[#aabbcc] dark:text-gray-600">
          Desenvolvido por{" "}
          <span className="font-semibold text-[#8aa0c4] dark:text-gray-500">{DEVELOPER_NAME}</span>
        </p>
      </div>
    </div>
  );
}
