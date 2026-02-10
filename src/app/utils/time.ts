export function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  return Math.max(endMin - startMin, 0);
}

export function formatTimeRangeWithDuration(
  start: string,
  end: string,
): string {
  const minutes = diffMinutes(start, end);

  return `${start} — ${end} (${minutes} min)`;
}
