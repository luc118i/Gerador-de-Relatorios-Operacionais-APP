/** Iniciais de um nome: 1ª letra do 1º e do último nome (ex.: "Lucas Silva" → "LS"). */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Paleta contida — tons de fundo suaves com texto legível, coerente com o
// resto da UI (nada de cores berrantes).
const AVATAR_BG = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
];

/** Classe de cor determinística a partir do nome. */
export function avatarColor(name: string | null | undefined): string {
  const s = (name ?? "").trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}
