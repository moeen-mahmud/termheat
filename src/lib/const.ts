// --- Constants used throughout the project. ---

/** Keep in sync with package.json when cutting a release. */
export const VERSION = "0.1.0";

export const THEMES = ["github", "fire", "ocean", "mono"] as const;

export const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export const CONTRIBUTIONS_URL = (username: string) =>
  `https://github.com/users/${encodeURIComponent(username)}/contributions`;

// Flat blocks, quiet zeroes: color carries intensity, empty days recede.
// Colors live in src/themes.ts — Ink renders them, no raw ANSI here.
export const CHARS = ["··", "██", "██", "██", "██"] as const;
export const WEEKDAY_LABELS = ["   ", "Mon", "   ", "Wed", "   ", "Fri", "   "];
export const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(
  " ",
);
