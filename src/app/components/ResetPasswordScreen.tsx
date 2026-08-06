import { useState } from "react";
import { Lock, Eye, EyeOff, KeyRound, Loader2, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * Tela exibida quando o usuário chega pelo link de "esqueci minha senha"
 * (ver `AuthContext.passwordRecovery`). Pede a nova senha e a confirma.
 */
export function ResetPasswordScreen() {
  const { updatePassword, cancelPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const inputBase =
    "w-full pl-10 pr-10 h-11 rounded-xl border border-[#dde4f0] dark:border-gray-700 bg-[#f4f7ff] dark:bg-gray-800 text-sm text-[#1a2a4a] dark:text-gray-100 outline-none transition-colors focus:border-[#3a6ee8] focus:bg-white dark:focus:bg-gray-800 placeholder:text-[#9aa8c8] dark:placeholder:text-gray-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !confirm) return;
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    setDone(true);
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-4 bg-[#edf1f7] dark:bg-[#0b1220] px-4 py-8">
      <div className="relative z-10 w-full max-w-[340px] rounded-2xl bg-white dark:bg-[#111a2e] px-8 pt-9 pb-8 shadow-[0_2px_24px_rgba(60,100,200,0.10),0_0.5px_2px_rgba(60,100,200,0.10)]">
        <div className="flex justify-center mb-2">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#eef3ff] dark:bg-[#1c2b4a]">
            {done ? (
              <Check className="w-6 h-6 text-[#3a6ee8]" />
            ) : (
              <KeyRound className="w-6 h-6 text-[#3a6ee8]" />
            )}
          </div>
        </div>

        <h1 className="text-center text-[17px] font-semibold text-[#1a2a4a] dark:text-gray-100">
          {done ? "Senha redefinida" : "Definir nova senha"}
        </h1>
        <p className="mb-5 text-center text-xs text-[#8899bb] dark:text-gray-500">
          {done
            ? "Sua senha foi alterada com sucesso."
            : "Escolha uma nova senha para acessar sua conta"}
        </p>

        {done ? (
          <button
            type="button"
            onClick={cancelPasswordRecovery}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3a6ee8] text-sm font-semibold text-white transition-[background,transform] hover:bg-[#2a5dd4] active:scale-[0.98]"
          >
            Ir para o login
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc] dark:text-gray-500" />
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Nova senha"
                className={inputBase}
                autoFocus
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8899cc] dark:text-gray-500 hover:text-[#5a6a99] dark:hover:text-gray-300 transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899cc] dark:text-gray-500" />
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError(null);
                }}
                placeholder="Confirmar nova senha"
                className={inputBase}
              />
            </div>

            {error && <p className="text-center text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={!password || !confirm || loading}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3a6ee8] text-sm font-semibold text-white transition-[background,transform] hover:bg-[#2a5dd4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Salvando…" : "Redefinir senha"}
            </button>

            <button
              type="button"
              onClick={cancelPasswordRecovery}
              className="flex h-9 w-full items-center justify-center text-xs font-medium text-[#8899bb] hover:text-[#5a6a99] dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
