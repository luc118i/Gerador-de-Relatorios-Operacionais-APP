import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { ReportProvider } from "../../features/report/ReportContext";
import { ReportLayout } from "../../features/report/ReportLayout";
import {
  periodForDate,
  shiftPeriod,
  todayISO,
  type Period,
  type ReportView,
} from "../../features/report/period";

// ── Shell ───────────────────────────────────────────────────────────────────

interface RelatorioDiarioProps {
  onVoltar: () => void;
}

/**
 * Centro de Relatórios e Inteligência Operacional.
 * A lógica de análise vive em `src/features/report/*`. Aqui ficam o gate de
 * admin e o estado do período (Diário / Semanal / Mensal / Personalizado).
 */
export function RelatorioDiario({ onVoltar }: RelatorioDiarioProps) {
  const { isAdmin } = useAdminAuth();
  const [period, setPeriod] = useState<Period>(() => periodForDate("diario", todayISO()));

  if (!isAdmin) return <AdminGate onVoltar={onVoltar} />;

  function setView(view: ReportView) {
    if (view === "personalizado") {
      setPeriod((p) => ({ view, start: p.start, end: p.end }));
      return;
    }
    setPeriod((p) => periodForDate(view, p.start));
  }

  function shift(dir: -1 | 1) {
    setPeriod((p) => shiftPeriod(p, dir));
  }

  function jumpToDate(iso: string) {
    setPeriod((p) => periodForDate(p.view === "personalizado" ? "diario" : p.view, iso));
  }

  /** Abre um dia específico na visão Diária (clique na evolução diária). */
  function openDay(iso: string) {
    setPeriod(periodForDate("diario", iso));
  }

  function setCustomRange(start: string, end: string) {
    const [s, e] = start <= end ? [start, end] : [end, start];
    setPeriod({ view: "personalizado", start: s, end: e });
  }

  return (
    <ReportProvider period={period}>
      <ReportLayout
        onVoltar={onVoltar}
        onSetView={setView}
        onShift={shift}
        onJumpToDate={jumpToDate}
        onOpenDay={openDay}
        onSetCustomRange={setCustomRange}
      />
    </ReportProvider>
  );
}

// ── AdminGate — tela de bloqueio para não-admins ─────────────────────────────

function AdminGate({ onVoltar }: { onVoltar: () => void }) {
  const { login } = useAdminAuth();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = login(pin);
    if (!ok) {
      setError(true);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-3">
            <button
              onClick={onVoltar}
              className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Centro de Relatórios</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-8 border border-gray-100 dark:border-gray-800 ${shake ? "animate-shake" : ""}`}
        >
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
              <Lock className="w-7 h-7 text-orange-500" />
            </div>
          </div>

          <h2 className="text-center text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Acesso Restrito</h2>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            O Centro de Relatórios é exclusivo para administradores.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                placeholder="Senha de acesso"
                className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm outline-none transition-colors ${
                  error
                    ? "border-red-400 bg-red-50 dark:bg-red-950/40 focus:ring-1 focus:ring-red-300"
                    : "border-gray-200 dark:border-gray-800 focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPin((v) => !v)}
                className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && <p className="text-xs text-red-500 text-center">Senha incorreta. Tente novamente.</p>}

            <button
              type="submit"
              disabled={!pin}
              className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Entrar como Admin
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.45s ease-in-out; }
      `}</style>
    </div>
  );
}
