import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export type TratativaKey = "SUSPEICAO" | "ADVERTENCIA" | "VALE" | "REGISTRO";

export const TRATATIVA_OPTIONS: {
  value: TratativaKey;
  label: string;
  dot: string;
  badge: string;
}[] = [
  { value: "SUSPEICAO",   label: "Suspensão",     dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "ADVERTENCIA", label: "Advertência",   dot: "bg-amber-400",  badge: "bg-amber-50  text-amber-700  border-amber-200"  },
  { value: "VALE",        label: "Vale",          dot: "bg-red-500",    badge: "bg-red-50    text-red-700    border-red-200"    },
  { value: "REGISTRO",    label: "Só o Registro", dot: "bg-gray-400",   badge: "bg-gray-100  text-gray-600   border-gray-200"   },
];

export function getTratativaOpt(v: string | null | undefined) {
  return TRATATIVA_OPTIONS.find((o) => o.value === v) ?? null;
}

/**
 * Dropdown custom para selecionar a tratativa de uma ocorrência
 * (Suspensão / Advertência / Vale / Só o Registro / Sem tratativa).
 * Reutilizado na Apuração (Relatório Diário) e no preview da Home.
 */
export function TratativaSelect({
  value,
  onChange,
}: {
  value: TratativaKey | null;
  onChange: (val: TratativaKey | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  } | null>(null);
  const opt = getTratativaOpt(value);

  // Calcula a posição do painel a partir do botão (posição fixa via portal),
  // escolhendo abrir para cima quando não há espaço suficiente abaixo.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function reposition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const PANEL_MAX = 240; // altura estimada do painel
      const GAP = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < PANEL_MAX && rect.top > spaceBelow;
      setCoords({
        left: rect.left,
        top: openUp ? rect.top - GAP : rect.bottom + GAP,
        placement: openUp ? "top" : "bottom",
      });
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer transition-all select-none ${
          opt
            ? `${opt.badge} hover:brightness-95`
            : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt ? opt.dot : "bg-gray-300"}`} />
        {opt ? opt.label : "Sem tratativa"}
        <ChevronDown className={`w-3 h-3 opacity-40 ml-0.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Painel (portal para escapar de overflow-hidden de modais/cards) */}
      {open && coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform: coords.placement === "top" ? "translateY(-100%)" : undefined,
            }}
            className="z-[60] bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[168px]"
          >
            {/* Sem tratativa */}
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full px-3 py-2 flex items-center gap-2.5 text-xs hover:bg-gray-50 transition-colors text-left group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
              <span className="text-gray-400 font-medium flex-1">Sem tratativa</span>
              {value === null && <Check className="w-3 h-3 text-gray-400 shrink-0" />}
            </button>

            <div className="my-1 mx-2 border-t border-gray-100" />

            {TRATATIVA_OPTIONS.map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => { onChange(op.value); setOpen(false); }}
                className={`w-full px-3 py-2 flex items-center gap-2.5 text-xs transition-colors text-left ${
                  value === op.value ? "bg-gray-50/80" : "hover:bg-gray-50"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${op.dot}`} />
                <span className="font-medium text-gray-700 flex-1">{op.label}</span>
                {value === op.value && <Check className="w-3 h-3 text-gray-500 shrink-0" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
