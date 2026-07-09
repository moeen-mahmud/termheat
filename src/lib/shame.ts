/**
 * Gentle shame mode (--shame): one nagging line derived from how long the
 * user has been idle.
 *
 * @param idleDays whole days since the last contribution — 0 means they
 *   contributed today, null means no contributions anywhere in the visible
 *   year (see daysSinceLastContribution).
 * @returns the line to display, or null to display nothing.
 */
export function shameLine(idleDays: number | null): string | null {
  // TODO(you): shape the nag curve. This placeholder only handles the basics —
  // decide the thresholds and the tone: when does gentle ribbing start, when
  // does it escalate, is a fresh streak *praised*? (PLAN.md's example was
  // "🐌 You haven't pushed in 3 days".)
  if (idleDays === null) return "🐌 No contributions this year… yet.";
  if (idleDays >= 1)
    return `🐌 You haven't pushed in ${idleDays} day${idleDays === 1 ? "" : "s"}`;
  return null;
}
