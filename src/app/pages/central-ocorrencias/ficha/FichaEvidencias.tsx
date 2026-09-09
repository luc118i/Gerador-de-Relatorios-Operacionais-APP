import { useEffect, useState } from "react";
import { ExternalLink, ImageOff, Link2, X } from "lucide-react";

type Evidence = {
  id: string;
  url: string;
  caption: string;
  linkTexto: string;
  linkUrl: string;
};

type Props = {
  evidences: Evidence[];
  loading: boolean;
  driveWebViewLink?: string | null;
};

const isImage = (e: Evidence) =>
  !!e.url && !e.url.toLowerCase().split("?")[0].endsWith(".pdf") && !e.linkUrl;

export function FichaEvidencias({ evidences, loading, driveWebViewLink }: Props) {
  const [lightbox, setLightbox] = useState<Evidence | null>(null);

  const fotos = evidences.filter(isImage);
  const pdfs = evidences.filter((e) => !e.linkUrl && !isImage(e) && e.url);
  const links = evidences.filter((e) => !!e.linkUrl);
  const nada = !loading && fotos.length === 0 && pdfs.length === 0 && links.length === 0;

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <section>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Evidências
      </h2>

      {loading ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : nada ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
          <ImageOff className="h-4 w-4" />
          Nenhuma evidência anexada.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotos.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setLightbox(e)}
                  className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-lg border border-gray-200/70 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                  title={e.caption || "Abrir imagem"}
                >
                  <img
                    src={e.url}
                    alt={e.caption || ""}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                  {e.caption && (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 text-left text-[10px] font-medium text-white">
                      {e.caption}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {(pdfs.length > 0 || links.length > 0 || driveWebViewLink) && (
            <div className="flex flex-wrap gap-2">
              {pdfs.map((e) => (
                <a
                  key={e.id}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {e.caption || "Documento (PDF)"}
                </a>
              ))}
              {links.map((e) => (
                <a
                  key={e.id}
                  href={e.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {e.linkTexto || e.caption || "Link"}
                </a>
              ))}
              {driveWebViewLink && (
                <a
                  href={driveWebViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Relatório no Drive
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <figure
            className="max-h-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.url}
              alt={lightbox.caption || ""}
              className="max-h-[80vh] w-auto rounded-lg object-contain"
            />
            {lightbox.caption && (
              <figcaption className="mt-2 text-center text-sm text-white/80">
                {lightbox.caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </section>
  );
}
