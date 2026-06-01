import { useEffect, useRef } from "react";
import { FileBarChart } from "lucide-react";

const BADGES = [
  "sem dados",
  "aguardando...",
  "nenhum registro",
  "vazio",
  "—",
  "0 itens",
  "sem resultado",
];

const LINES: { pos: React.CSSProperties; dur: string; delay: string }[] = [
  { pos: { left: "8%", right: "55%", bottom: "20%" }, dur: "2.2s", delay: "0s" },
  { pos: { left: "8%", right: "45%", bottom: "17%" }, dur: "2.8s", delay: "0.4s" },
  { pos: { left: "8%", right: "60%", bottom: "14%" }, dur: "2.0s", delay: "0.9s" },
  { pos: { right: "8%", left: "55%", bottom: "20%" }, dur: "2.5s", delay: "0.3s" },
  { pos: { right: "8%", left: "50%", bottom: "17%" }, dur: "2.1s", delay: "0.7s" },
  { pos: { right: "8%", left: "58%", bottom: "14%" }, dur: "2.7s", delay: "0.1s" },
];

// SVG paths simples (lucide-like) para os documentos flutuantes.
const FLOAT_SVGS = [
  `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>`,
  `<path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8"/><rect x="14" y="6" width="3" height="12"/>`,
  `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M12 3v18"/>`,
  `<path d="M21 12A9 9 0 1 1 9 3.5"/><path d="M12 12V3a9 9 0 0 1 9 9z"/>`,
  `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M8 13h8M8 17h6"/>`,
  `<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`,
  `<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/>`,
];

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function EmptyReportScene({
  subtitle = "nenhum dado disponível",
  className = "",
}: {
  subtitle?: string;
  className?: string;
}) {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const layer = layerRef.current;
    if (!layer) return;

    let docIdx = 0;
    let badgeIdx = 0;
    const timers: number[] = [];

    const spawnDoc = () => {
      const el = document.createElement("span");
      el.className = "empty-doc-el absolute";
      el.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(80,120,200,0.45)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${
        FLOAT_SVGS[docIdx++ % FLOAT_SVGS.length]
      }</svg>`;
      el.style.left = 6 + Math.round(Math.random() * 88) + "%";
      el.style.bottom = 14 + Math.round(Math.random() * 56) + "%";
      el.style.setProperty("--dur", (2.2 + Math.random()).toFixed(2) + "s");
      layer.appendChild(el);
      window.setTimeout(() => el.remove(), 3200);
    };

    const spawnBadge = () => {
      const el = document.createElement("span");
      el.className =
        "empty-badge-el absolute whitespace-nowrap text-[10px] font-semibold px-2 py-0.5 rounded-full";
      el.textContent = BADGES[badgeIdx++ % BADGES.length]!;
      el.style.left = 8 + Math.round(Math.random() * 74) + "%";
      el.style.bottom = 22 + Math.round(Math.random() * 48) + "%";
      el.style.background = "rgba(235,240,255,0.9)";
      el.style.color = "#4466bb";
      el.style.border = "0.5px solid rgba(80,120,200,0.25)";
      el.style.setProperty("--dur", (2.0 + Math.random() * 0.8).toFixed(2) + "s");
      layer.appendChild(el);
      window.setTimeout(() => el.remove(), 3000);
    };

    timers.push(window.setInterval(spawnDoc, 700));
    timers.push(window.setInterval(spawnBadge, 1400));

    return () => {
      timers.forEach((t) => window.clearInterval(t));
      layer.replaceChildren();
    };
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-sky-500/20 bg-[#f4f6fb] min-h-[260px] ${className}`}
    >
      {/* Grade de telemetria */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[25, 50, 75].map((t) => (
          <div key={`h${t}`} className="absolute left-0 right-0 border-t border-sky-500/[0.07]" style={{ top: `${t}%` }} />
        ))}
        {[20, 40, 60, 80].map((l) => (
          <div key={`v${l}`} className="absolute top-0 bottom-0 border-l border-sky-500/[0.07]" style={{ left: `${l}%` }} />
        ))}

        {/* Linhas animadas (esqueleto de relatório) */}
        {LINES.map((ln, i) => (
          <div
            key={i}
            className="empty-line absolute h-0.5 rounded-sm overflow-hidden bg-sky-500/15"
            style={{ ...ln.pos, "--dur": ln.dur, "--delay": ln.delay } as React.CSSProperties}
          />
        ))}

        {/* Camada de partículas (spawn imperativo) */}
        <div ref={layerRef} className="absolute inset-0" />
      </div>

      {/* Centro: ícone com órbita + pulsos */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 pointer-events-none">
        <div className="relative flex w-[54px] h-[54px] items-center justify-center rounded-full border-[1.5px] border-sky-600/20 bg-white/70">
          <span className="empty-pulse-ring absolute left-1/2 top-1/2 w-[54px] h-[54px] rounded-full border border-sky-600/30" />
          <span className="empty-pulse-ring absolute left-1/2 top-1/2 w-[54px] h-[54px] rounded-full border border-sky-600/30" style={{ animationDelay: "1s" }} />
          <span className="empty-pulse-ring absolute left-1/2 top-1/2 w-[54px] h-[54px] rounded-full border border-sky-600/30" style={{ animationDelay: "2s" }} />
          <span className="empty-orbit absolute left-1/2 top-1/2 w-[72px] h-[72px] rounded-full border border-dashed border-sky-600/20">
            <span className="absolute left-1/2 -top-[2.5px] -translate-x-1/2 w-[5px] h-[5px] rounded-full bg-sky-600/50" />
          </span>
          <FileBarChart className="w-6 h-6 text-sky-600" />
        </div>
        <div className="text-[17px] font-semibold text-slate-600">Gerador de relatório</div>
        <div className="text-xs uppercase tracking-wider text-slate-400">{subtitle}</div>
      </div>
    </div>
  );
}
