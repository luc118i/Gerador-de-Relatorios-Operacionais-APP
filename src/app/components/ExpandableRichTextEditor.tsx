import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X, Sparkles, Loader2 } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { aiApi } from "../../api/ai.api";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;         // título exibido no modal
  disabled?: boolean;
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Botão de correção ortográfica ─────────────────────────────────────────────
function SpellCheckBtn({
  html,
  onCorrected,
  size = "sm",
}: {
  html: string;
  onCorrected: (corrected: string) => void;
  size?: "sm" | "md";
}) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!html.trim() || loading) return;
    setLoading(true);
    try {
      const plain = htmlToPlain(html);
      const { corrected, errorCount } = await aiApi.correct(html, plain);
      onCorrected(corrected);
      toast.success(
        errorCount > 0
          ? `${errorCount} erro${errorCount > 1 ? "s" : ""} corrigido${errorCount > 1 ? "s" : ""}.`
          : "Nenhum erro encontrado — texto já está correto.",
      );
    } catch {
      toast.error("Falha ao corrigir o texto. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const base =
    size === "md"
      ? "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading || !html.trim()}
      title="Corrigir ortografia com IA"
      className={base}
    >
      {loading ? (
        <>
          <Loader2 className={size === "md" ? "w-4 h-4 animate-spin" : "w-3 h-3 animate-spin"} />
          Corrigindo...
        </>
      ) : (
        <>
          <Sparkles className={size === "md" ? "w-4 h-4" : "w-3 h-3"} />
          Corrigir ortografia
        </>
      )}
    </button>
  );
}

// ── Modal de edição ───────────────────────────────────────────────────────────
function EditorModal({
  label,
  value,
  onChange,
  placeholder,
  onClose,
}: {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onClose: () => void;
}) {
  // Fecha com Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Bloqueia scroll do body enquanto aberto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
           style={{ height: "min(80vh, 680px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">
              {label ?? "Editar texto"}
            </h3>
            <SpellCheckBtn html={value} onCorrected={onChange} size="md" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editor com fonte maior */}
        <div className="flex-1 overflow-y-auto p-4">
          <RichTextEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            minHeight="300px"
            fontSizePx={18}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <span className="text-xs text-gray-400">
            Pressione <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded font-mono">Esc</kbd> para fechar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer h-9 px-5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function ExpandableRichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "120px",
  label,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative group">
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight={minHeight}
          disabled={disabled}
        />

        {/* Botão expandir — aparece no hover */}
        {!disabled && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="Expandir editor"
            className="cursor-pointer absolute bottom-2 right-2 p-1.5 rounded-lg bg-white/80 border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-white hover:border-gray-300 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-150"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <EditorModal
          label={label}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
