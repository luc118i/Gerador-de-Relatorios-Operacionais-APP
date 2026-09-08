import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Slider } from "../../components/ui/slider";
import { coverVisibleFraction } from "./coverGeom";

const DEFAULT_POS_Y = 50;
const DEFAULT_OPACITY = 0.16;
const DEFAULT_ZOOM = 1;
const MIN_OPACITY = 0.03;
const MAX_OPACITY = 0.4;

type Props = {
  url: string;
  posY: number;
  opacity: number;
  zoom: number;
  busy: boolean;
  /** proporção (larg/alt) da faixa real da capa no cabeçalho */
  bandAspect: number;
  onSave: (patch: { posY: number; opacity: number; zoom: number }) => void;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Mini editor da capa: mostra a imagem inteira com uma "janela" do tamanho
 *  exato do que aparece no cabeçalho. Arrastar a janela = enquadramento
 *  (object-position Y); slider de zoom = quanto a imagem preenche a faixa. */
export function CoverAdjuster({
  url,
  posY,
  opacity,
  zoom,
  busy,
  bandAspect,
  onSave,
}: Props) {
  const [y, setY] = useState(posY);
  const [op, setOp] = useState(opacity);
  const [z, setZ] = useState(zoom);
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startWinTop: number } | null>(null);

  useEffect(() => {
    if (!drag.current) setY(posY);
  }, [posY]);
  useEffect(() => setOp(opacity), [opacity]);
  useEffect(() => setZ(zoom), [zoom]);

  // f = proporção imagem / proporção faixa
  const f = imgAspect && bandAspect > 0 ? imgAspect / bandAspect : 1;
  const canZoom = f < 0.985; // imagem "mais alta" que a faixa → dá pra afastar
  // fração da altura da imagem visível na faixa (tamanho da janela)
  const fv = imgAspect ? coverVisibleFraction(f, z) : 1;
  const canReposition = fv < 0.985;
  const winTop = (y / 100) * (1 - fv);

  const dirty =
    Math.round(y) !== Math.round(posY) ||
    Math.abs(op - opacity) > 0.001 ||
    Math.abs(z - zoom) > 0.001;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canReposition) return;
    drag.current = { startY: e.clientY, startWinTop: winTop };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const h = boxRef.current?.clientHeight || 1;
    const span = 1 - fv;
    const nextTop = clamp(
      drag.current.startWinTop + (e.clientY - drag.current.startY) / h,
      0,
      span,
    );
    setY(span <= 0 ? DEFAULT_POS_Y : (nextTop / span) * 100);
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
    setZ(DEFAULT_ZOOM);
  };

  return (
    <div className="space-y-2 rounded-md border border-gray-200 p-2 dark:border-gray-800">
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative w-full select-none overflow-hidden rounded bg-gray-100 dark:bg-gray-900 ${
          canReposition ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        <img
          src={url}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalWidth && el.naturalHeight) {
              setImgAspect(el.naturalWidth / el.naturalHeight);
            }
          }}
          className="pointer-events-none block w-full"
        />

        {canReposition && (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 bg-black/55"
              style={{ height: `${winTop * 100}%` }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55"
              style={{ height: `${(1 - winTop - fv) * 100}%` }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 border-y-2 border-white/85"
              style={{ top: `${winTop * 100}%`, height: `${fv * 100}%` }}
            >
              <span className="absolute left-1 top-1 rounded bg-black/50 px-1 text-[9px] font-medium uppercase tracking-wide text-white">
                cabeçalho
              </span>
            </div>
          </>
        )}
      </div>

      <p className="text-[11px] leading-snug text-gray-400 dark:text-gray-500">
        {canReposition
          ? "Arraste a faixa clara para escolher o trecho que aparece no cabeçalho."
          : "A imagem inteira aparece no cabeçalho."}
      </p>

      {canZoom && (
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
            Zoom
          </span>
          <Slider
            value={[z]}
            min={0}
            max={1}
            step={0.02}
            onValueChange={([v]) => setZ(v)}
            className="flex-1"
          />
          <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
            {z <= 0.005 ? "tudo" : `${Math.round(z * 100)}%`}
          </span>
        </div>
      )}

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
          onClick={() =>
            onSave({
              posY: Math.round(y),
              opacity: Number(op.toFixed(2)),
              zoom: Number(z.toFixed(2)),
            })
          }
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
