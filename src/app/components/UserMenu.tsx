import { useEffect, useRef, useState } from "react";
import { Pencil, Check, X, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

/** Iniciais para o avatar (1ª letra dos dois primeiros nomes, ou início do e-mail). */
function initialsOf(name: string, email: string): string {
  const src = name.trim() || email.split("@")[0] || "";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Avatar do usuário logado (Supabase Auth) no canto superior direito.
 * Abre um menu com nome (editável), e-mail e Sair. Visível para qualquer usuário.
 */
export function UserMenu() {
  const { profileName, user, signOut, updateProfileName } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const t = e.target as Node | null;
      if (t && !t.isConnected) return;
      if (ref.current && t && !ref.current.contains(t)) {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const name = profileName || "Analista";
  const email = user?.email ?? "";
  const initials = initialsOf(profileName, email);

  function startEdit() {
    setDraft(profileName || "");
    setEditing(true);
  }

  async function save() {
    if (saving) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Informe um nome.");
      return;
    }
    setSaving(true);
    const { error } = await updateProfileName(trimmed);
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Nome atualizado!");
      setEditing(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center hover:bg-blue-700 transition-colors shrink-0"
        title={name}
        aria-label="Abrir menu do perfil"
      >
        {initials}
      </button>

      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold mb-2">
              Seu perfil
            </p>
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void save();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  placeholder="Seu nome"
                  maxLength={60}
                  disabled={saving}
                  className="min-w-0 flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:opacity-60"
                />
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="cursor-pointer p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors shrink-0"
                  aria-label="Salvar nome"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-50 transition-colors shrink-0"
                  aria-label="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate">{email}</p>
                </div>
                <button
                  onClick={startEdit}
                  className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                  aria-label="Editar nome"
                  title="Editar seu nome"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => void signOut()}
            className="cursor-pointer w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
