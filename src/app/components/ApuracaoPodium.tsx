import { useEffect, useRef, useState } from "react";
import type { OccurrenceDTO } from "../../domain/occurrences";
import { ClipboardCheck } from "lucide-react";

type Ranked = { name: string; count: number; rank: number };

const STYLES: Record<number, { block: string; votes: string; height: string }> = {
  1: { block: "bg-amber-400",  votes: "text-amber-600",  height: "h-28" },
  2: { block: "bg-gray-300",   votes: "text-gray-500",   height: "h-20" },
  3: { block: "bg-orange-300", votes: "text-orange-700", height: "h-16" },
};

const FLOAT_COLORS = ["#d48a00", "#3a8af0", "#5bc4a0", "#6699dd", "#c07030"];
const SPARKLE_COLORS = ["#f5b800", "#3a8af0", "#5bc4a0", "#d45060"];
const CHIP_TEXTS = ["voto", "apurado", "✓", "voto", "resultado"];

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function ApuracaoPodium({
  occurrences,
  className = "",
}: {
  occurrences: OccurrenceDTO[];
  className?: string;
}) {
  const layerRef = useRef<HTMLDivElement | null>(null);

  const map = new Map<string, number>();
  let apurado = 0;
  for (const o of occurrences) {
    const analyst = (o.analisadoPor ?? "").trim();
    if (analyst) {
      apurado++;
      map.set(analyst, (map.get(analyst) ?? 0) + 1);
    }
  }

  const byAnalyst = [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const total = occurrences.length;
  const targetPct = total > 0 ? Math.round((apurado / total) * 100) : 0;
  const vehicles = new Set(occurrences.map((o) => o.vehicleNumber)).size;
  const bases = new Set(occurrences.map((o) => o.baseCode).filter(Boolean)).size;

  // Odômetro honesto: conta de 0 até o valor real.
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setPct(targetPct);
      return;
    }
    setPct(0);
    let cur = 0;
    const id = window.setInterval(() => {
      cur += Math.max(1, Math.round(targetPct / 22));
      if (cur >= targetPct) {
        cur = targetPct;
        window.clearInterval(id);
      }
      setPct(cur);
    }, 60);
    return () => window.clearInterval(id);
  }, [targetPct]);

  // Spawn contínuo de "+N", chips e sparkles (imperativo, fora do React).
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const layer = layerRef.current;
    if (!layer) return;

    let floatIdx = 0;
    let chipIdx = 0;
    const timers: number[] = [];

    const spawnFloat = () => {
      const el = document.createElement("span");
      el.className = "podium-float-el absolute text-sm font-black";
      el.textContent = "+" + (1 + Math.floor(Math.random() * 3));
      el.style.left = 6 + Math.round(Math.random() * 88) + "%";
      el.style.bottom = 22 + Math.round(Math.random() * 40) + "%";
      el.style.color = FLOAT_COLORS[floatIdx++ % FLOAT_COLORS.length]!;
      el.style.setProperty("--dur", (1.4 + Math.random() * 0.8).toFixed(2) + "s");
      layer.appendChild(el);
      window.setTimeout(() => el.remove(), 2400);
    };

    const spawnChip = () => {
      const el = document.createElement("span");
      el.className =
        "podium-chip-el absolute text-[10px] font-semibold px-2 py-0.5 rounded-full";
      el.textContent = CHIP_TEXTS[chipIdx++ % CHIP_TEXTS.length]!;
      el.style.left = 14 + Math.round(Math.random() * 70) + "%";
      el.style.bottom = 36 + Math.round(Math.random() * 34) + "%";
      el.style.background = "rgba(245,184,0,0.15)";
      el.style.color = "#a07800";
      el.style.border = "0.5px solid rgba(245,184,0,0.4)";
      el.style.setProperty("--dur", (1.6 + Math.random() * 0.9).toFixed(2) + "s");
      layer.appendChild(el);
      window.setTimeout(() => el.remove(), 2700);
    };

    const spawnSparkle = () => {
      const el = document.createElement("span");
      el.className = "podium-sparkle-el absolute w-1 h-1 rounded-full";
      el.style.left = 6 + Math.round(Math.random() * 88) + "%";
      el.style.bottom = 24 + Math.round(Math.random() * 50) + "%";
      el.style.background =
        SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]!;
      el.style.setProperty("--dur", (0.6 + Math.random() * 0.8).toFixed(2) + "s");
      layer.appendChild(el);
      window.setTimeout(() => el.remove(), 1600);
    };

    timers.push(window.setInterval(spawnFloat, 430));
    timers.push(window.setInterval(spawnChip, 1100));
    timers.push(window.setInterval(spawnSparkle, 300));

    return () => {
      timers.forEach((t) => window.clearInterval(t));
      layer.replaceChildren();
    };
  }, []);

  if (byAnalyst.length === 0) return null;

  const top: Ranked[] = byAnalyst.slice(0, 3).map((e, i) => ({ ...e, rank: i + 1 }));

  // Ordem visual: 2º à esquerda, 1º no centro, 3º à direita.
  const displayOrder: Ranked[] =
    top.length === 1
      ? [top[0]!]
      : top.length === 2
        ? [top[1]!, top[0]!]
        : [top[1]!, top[0]!, top[2]!];

  // Itens do ticker BI passando atrás do pódio.
  const ticker: string[] = [
    "APURAÇÃO AO VIVO",
    `${total} OCORRÊNCIAS`,
    `${targetPct}% APURADO`,
    ...byAnalyst.map((a) => `${a.name.toUpperCase()}: ${a.count} APURAÇÕES`),
    `${vehicles} VEÍCULOS`,
    `${bases} BASES`,
    "RESULTADO PARCIAL",
  ];
  const tickerLoop = [...ticker, ...ticker];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-[#f0f4fa] p-5 min-h-[260px] ${className}`}
    >
      {/* ── Fundo "vivo" — BI de apuração passando atrás ──────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* Grade de telemetria estática */}
        <div className="absolute left-0 right-0 border-t border-sky-500/10" style={{ bottom: "25%" }} />
        <div className="absolute left-0 right-0 border-t border-sky-500/10" style={{ bottom: "50%" }} />
        <div className="absolute left-0 right-0 border-t border-sky-500/10" style={{ bottom: "75%" }} />

        {/* Scan line de leitura subindo */}
        <div
          className="podium-scanline absolute left-0 right-0 h-0.5"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(80,140,220,0.35) 40%, rgba(80,140,220,0.55) 50%, rgba(80,140,220,0.35) 60%, transparent 100%)",
          }}
        />

        {/* Ticker BI rolando */}
        <div className="absolute left-0 right-0 top-9 overflow-hidden">
          <div className="podium-marquee">
            {tickerLoop.map((t, i) => (
              <span
                key={i}
                className={`mx-4 text-[11px] font-semibold uppercase tracking-wider ${
                  t.includes("%") || t.includes("AO VIVO") ? "text-sky-500/70" : "text-slate-400/70"
                }`}
              >
                {t}
                <span className="ml-8 text-sky-300/70">▸</span>
              </span>
            ))}
          </div>
        </div>

        {/* Camada de partículas (spawn imperativo) */}
        <div ref={layerRef} className="absolute inset-0" />

        {/* Barra de progresso "% apurado" na base */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-sky-500/10">
          <div
            className="relative h-full overflow-hidden bg-gradient-to-r from-sky-400 to-emerald-400 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          >
            <span className="podium-bar-shine absolute inset-y-0 w-1/3 bg-white/40" />
          </div>
        </div>
      </div>

      {/* ── Conteúdo (frente) ─────────────────────────────────────────────── */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-5">
          <span className="relative flex w-2 h-2">
            <span className="podium-live absolute inset-0 rounded-full bg-rose-500" />
            <span className="relative w-2 h-2 rounded-full bg-rose-500" />
          </span>
          <ClipboardCheck className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Pódio de apuração
          </h3>
          <span className="ml-auto text-[11px] font-semibold text-sky-600 tabular-nums">
            {pct}% apurado
          </span>
        </div>

        <div className="flex items-end justify-center gap-3 sm:gap-5 pt-4">
          {displayOrder.map((e) => {
            const s = STYLES[e.rank]!;
            return (
              <div key={e.name} className="flex flex-col items-center w-24">
                <div
                  className="text-sm font-semibold text-slate-600 truncate max-w-[96px] text-center"
                  title={e.name}
                >
                  {e.name}
                </div>
                <div className={`text-2xl font-black tabular-nums leading-none mt-0.5 ${s.votes}`}>
                  {e.count}
                </div>
                <div className="text-[10px] text-slate-400 mb-1.5">apurações</div>
                <div
                  className={`w-full ${s.height} ${s.block} rounded-t-lg flex items-start justify-center pt-2 shadow-inner`}
                >
                  <span className="text-white text-lg font-bold drop-shadow-sm">{e.rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
