import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  ImageOff,
  Link2,
  Maximize2,
  X,
} from "lucide-react";

type Evidence = {
  id: string;
  url: string;
  caption: string;
  linkTexto: string;
  linkUrl: string;
};

type Slide = { key: string; kind: "image" | "pdf" | "link"; url: string; caption: string };

type Props = {
  evidences: Evidence[];
  loading: boolean;
  driveWebViewLink?: string | null;
};

function toSlides(evs: Evidence[]): Slide[] {
  return evs.map((e) => {
    if (e.linkUrl)
      return { key: e.id, kind: "link", url: e.linkUrl, caption: e.linkTexto || e.caption || "Link" };
    const isPdf = e.url.toLowerCase().split("?")[0].endsWith(".pdf");
    return {
      key: e.id,
      kind: isPdf ? "pdf" : "image",
      url: e.url,
      caption: e.caption || (isPdf ? "Documento (PDF)" : ""),
    };
  });
}

export function FichaEvidencias({ evidences, loading, driveWebViewLink }: Props) {
  const slides = toSlides(evidences);
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const total = slides.length;
  const cur = slides[Math.min(idx, total - 1)];
  const many = total > 1;

  const go = (d: number) => setIdx((i) => (total ? (i + d + total) % total : 0));

  useEffect(() => {
    if (idx > total - 1) setIdx(Math.max(0, total - 1));
  }, [total, idx]);

  useEffect(() => {
    thumbsRef.current
      ?.querySelector<HTMLElement>(`[data-i="${idx}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [idx]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, total]);

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Evidências
        </h2>
        {many && (
          <span className="text-[11px] tabular-nums text-gray-400">
            {idx + 1} de {total}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 aspect-[16/10] w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      ) : total === 0 ? (
        <div className="mt-2 space-y-2">
          <p className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
            <ImageOff className="h-4 w-4" />
            Nenhuma evidência anexada.
          </p>
          {driveWebViewLink && (
            <a
              href={driveWebViewLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Relatório no Drive
            </a>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {/* Visor principal */}
          <div
            ref={boxRef}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") go(1);
              if (e.key === "ArrowLeft") go(-1);
            }}
            className="group relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-950/[0.035] outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            {cur.kind === "image" ? (
              <>
                <img
                  src={cur.url}
                  alt={cur.caption}
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  aria-label="Ampliar"
                  className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-black/40 text-white opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                {cur.kind === "pdf" ? (
                  <FileText className="h-10 w-10" />
                ) : (
                  <Link2 className="h-10 w-10" />
                )}
                <a
                  href={cur.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {cur.kind === "pdf" ? "Abrir PDF" : "Abrir link"}
                </a>
              </div>
            )}

            {cur.caption && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-3 py-2 text-xs font-medium text-white">
                {cur.caption}
              </span>
            )}

            {many && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Anterior"
                  className="absolute left-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Próxima"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Miniaturas */}
          {many && (
            <div ref={thumbsRef} className="flex gap-2 overflow-x-auto pb-1">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  data-i={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Evidência ${i + 1}`}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border transition-colors ${
                    i === idx
                      ? "border-blue-500 ring-2 ring-blue-500/40"
                      : "border-gray-200 opacity-70 hover:opacity-100 dark:border-gray-700"
                  }`}
                >
                  {s.kind === "image" ? (
                    <img src={s.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-800">
                      {s.kind === "pdf" ? <FileText className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {driveWebViewLink && (
            <a
              href={driveWebViewLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Relatório no Drive
            </a>
          )}
        </div>
      )}

      {lightbox && cur?.kind === "image" && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {many && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Anterior"
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Próxima"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={cur.url}
              alt={cur.caption}
              className="max-h-[82vh] w-auto rounded-lg object-contain"
            />
            <figcaption className="mt-2 text-center text-sm text-white/80">
              {cur.caption}
              {many ? ` · ${idx + 1} de ${total}` : ""}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
