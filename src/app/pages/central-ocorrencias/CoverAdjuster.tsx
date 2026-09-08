import { useEffect, useRef, useState } from "react";
import { Loader2, MoveVertical, RotateCcw } from "lucide-react";
import { Slider } from "../../components/ui/slider";

const DEFAULT_POS_Y = 50;
const DEFAULT_OPACITY = 0.16;
const MIN_OPACITY = 0.03;
const MAX_OPACITY = 0.4;

type Props = {
  url: string;
  posY: number;
  opacity: number;
  busy: boolean;
  onSave: (patch: { posY: number; opacity: number }) => void;
};

/** Mini editor da capa do quadro: enquadramento vertical (arrastar) + opacidade.
 *  Não reenvia a imagem — só ajusta como ela aparece. */
export function CoverAdjuster({ url, posY, opacity, busy, onSave }: Props) {
  const [y, setY] = useState(posY);
  const [op, setOp] = useState(opacity);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startPos: number } | null>(null);

  // Sincroniza quando o servidor devolve novos valores (e não estamos mexendo).
  useEffect(() => {
    if (!drag.current) setY(posY);
  }, [posY]);
  useEffect(() => {
    setOp(opacity);
  }, [opacity]);

  const dirty = Math.round(y) !== Math.round(posY) || Math.abs(op - opacity) > 0.001;

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, startPos: y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const h = boxRef.current?.clientHeight || 150;
    const deltaPct = ((e.clientY - drag.current.startY) / h) * 100 * 1.4;
    // arrastar a imagem pra baixo revela o topo → diminui Y
    setY(Math.min(100, Math.max(0, drag.current.startPos - deltaPct)));
  };
  const endDrag = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const reset = () => {
    setY(DEFAULT_POS_Y);
    setOp(DEFAULT_OPACITY);
  };

  return (
    <div className="space-y-2 rounded-md border border-gray-200 p-2 dark:border-gray-800">
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative h-[130px] w-full cursor-grab overflow-hidden rounded bg-gray-100 active:cursor-grabbing dark:bg-gray-900"
        title="Arraste para enquadrar"
      >
        <img
          src={url}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full select-none object-cover"
          style={{ objectPosition: `50% ${y}%` }}
        />
        <span className="pointer-events-none absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <MoveVertical className="h-3 w-3" />
          {Math.round(y)}%
        </span>
        {/* prévia real da opacidade, faixa fina embaixo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 border-t border-white/20 bg-gray-50 dark:bg-gray-950">
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: `50% ${y}%`, opacity: op }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
          Opacidade
        </span>
        <Slider
          value={[op]}
          min={MIN_OPACITY}
          max={MAX_OPACITY}
          step={0.01}
          onValueChange={([v]) => setOp(v)}
          className="flex-1"
        />
        <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
          {Math.round(op * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave({ posY: Math.round(y), opacity: Number(op.toFixed(2)) })}
          disabled={busy || !dirty}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-blue-600 px-2 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-default disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Salvar ajuste
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          title="Voltar ao padrão"
          aria-label="Voltar ao padrão"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-400 transition-colors hover:bg-black/[0.03] hover:text-gray-600 disabled:opacity-40 dark:border-gray-800 dark:hover:bg-white/[0.05]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
