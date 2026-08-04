import { getBaseCanonicalKey, resolveBaseSigla } from "../../utils/base";

type BaseChipProps = { base: string };

const PALETTE = [
  "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
  "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  "bg-pink-100 dark:bg-pink-950/40 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800",
  "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  "bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  "bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
];

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function BaseChip({ base }: BaseChipProps) {
  const canonicalKey = getBaseCanonicalKey(base || "");

  const baseSigla = resolveBaseSigla(base || "");
  const fallbackSigla = canonicalKey.slice(0, 5);
  const sigla = (baseSigla ?? fallbackSigla) || "—";
  const idx = canonicalKey ? hashString(canonicalKey) % PALETTE.length : 0;
  const colorClass = PALETTE[idx];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
      title={base}
    >
      {sigla || "—"}
    </span>
  );
}
