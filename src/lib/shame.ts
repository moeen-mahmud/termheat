/**
 * Gentle shame mode (--shame): one line derived from how long the user has
 * been idle.
 *
 * The curve escalates slowly on purpose — day one is a rest day, not a crime.
 * Ship-days get a small praise line instead of silence so the flag stays fun
 * to keep enabled (a carrot keeps the stick reachable).
 *
 * @param idleDays whole days since the last contribution — 0 means they
 *   contributed today, null means no contributions anywhere in the visible
 *   year (see daysSinceLastContribution).
 * @returns the line to display, or null to display nothing.
 */
export function shameLine(idleDays: number | null): string | null {
  if (idleDays === null)
    return "🦖 404 contributions found — this year's grid is a blank canvas.";
  if (idleDays === 0) return "✨ Shipped today. Zero shame detected.";
  if (idleDays === 1) return "🐌 Quiet for a day — the keyboard misses you.";
  if (idleDays <= 3)
    return `🐌 You haven't pushed in ${idleDays} days. The grid is cooling…`;
  if (idleDays <= 6)
    return `🥶 ${idleDays} days idle. Your green squares are fading to gray.`;
  if (idleDays <= 13)
    return `🕸️ ${idleDays} days. Cobwebs are forming on \`git push\`.`;
  if (idleDays <= 29)
    return `💀 ${idleDays} days of silence. \`git blame\` finds only ghosts.`;
  return `🪦 ${idleDays} days. Somewhere, an unfinished branch mourns you.`;
}
