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
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    "w-full pl-10 pr-10 h-11 rounded-xl border border-[#dde4f0] bg-[#f4f7ff] text-sm text-[#1a2a4a] outline-none transition-colors focus:border-[#3a6ee8] focus:bg-white placeholder:text-[#9aa8c8]";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-4 overflow-hidden bg-[#edf1f7] px-4 py-8">
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
            className="ls-anim absolute rounded-full border border-[rgba(80,120,210,0.2)] bg-[rgba(220,230,255,0.85)] px-2 py-0.5 text-[10px] font-semibold text-[#3a5fbb] whitespace-nowrap"
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
      <div className="relative z-10 w-full max-w-[340px] rounded-2xl bg-white px-8 pt-9 pb-8 shadow-[0_2px_24px_rgba(60,100,200,0.10),0_0.5px_2px_rgba(60,100,200,0.10)]">
        <div className="flex justify-center mb-2">
          <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#eef3ff]">
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
            <LogIn className="relative w-6 h-6 text-[#3a6ee8]" />
          </div>
        </div>

        <h1 className="text-center text-[17px] font-semibold text-[#1a2a4a]">
          Gerador de Relatórios
        </h1>
        <p className="mb-5 text-center text-xs text-[#8899bb]">
          Entre com seu perfil para apurar ocorrências
        </p>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc]" />
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
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc]" />
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8899cc] hover:text-[#5a6a99] transition-colors"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-center text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={!email || !password || loading}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3a6ee8] text-sm font-semibold text-white transition-[background,transform] hover:bg-[#2a5dd4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-[17px] h-[17px]" />
            )}
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>

      {/* ── Rodapé ───────────────────────────────────────────────────── */}
      <div className="relative z-10 text-center">
        <p className="text-[11px] text-[#aabbcc]">
          © {new Date().getFullYear()} Gerador de Relatórios Operacionais
        </p>
        <p className="mt-0.5 text-[11px] text-[#aabbcc]">
          Desenvolvido por{" "}
          <span className="font-semibold text-[#8aa0c4]">{DEVELOPER_NAME}</span>
        </p>
      </div>
    </div>
  );
}
