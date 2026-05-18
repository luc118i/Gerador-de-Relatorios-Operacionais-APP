import { useState, useRef, useEffect } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

interface AdminLoginModalProps {
  onClose: () => void;
}

export function AdminLoginModal({ onClose }: AdminLoginModalProps) {
  const { login } = useAdminAuth();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(pin);
    if (ok) {
      onClose();
    } else {
      setError(true);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 ${shake ? "animate-shake" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícone */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
            <Lock className="w-7 h-7 text-orange-500" />
          </div>
        </div>

        <h2 className="text-center text-lg font-semibold text-gray-800 mb-1">
          Acesso Restrito
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Funcionalidade disponível apenas para administradores.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(false); }}
              placeholder="Senha de acesso"
              className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm outline-none transition-colors ${
                error
                  ? "border-red-400 bg-red-50 focus:ring-1 focus:ring-red-300"
                  : "border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
              }`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">Senha incorreta. Tente novamente.</p>
          )}

          <button
            type="submit"
            disabled={!pin}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Entrar como Admin
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.45s ease-in-out; }
      `}</style>
    </div>
  );
}
