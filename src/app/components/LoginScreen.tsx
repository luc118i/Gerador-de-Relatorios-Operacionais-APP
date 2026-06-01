import { useState } from "react";
import { Lock, Mail, Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    "w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-200";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <LogIn className="w-7 h-7 text-blue-600" />
            </div>
          </div>

          <h1 className="text-center text-lg font-semibold text-gray-800">
            Gerador de Relatórios
          </h1>
          <p className="text-center text-sm text-gray-500 mb-6">
            Entre com seu perfil para apurar ocorrências
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="seu@email.com"
                className={inputBase}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Senha"
                className={inputBase}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={!email || !password || loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          © {new Date().getFullYear()} Gerador de Relatórios Operacionais
        </p>
      </div>
    </div>
  );
}
