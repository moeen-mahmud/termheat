// --- Constants used throughout the project. ---

export const THEMES = ["github", "fire", "ocean", "mono"] as const;

export const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export const CONTRIBUTIONS_URL = (username: string) =>
  `https://github.com/users/${encodeURIComponent(username)}/contributions`;

// Flat blocks, quiet zeroes: color carries intensity, empty days recede.
export const CHARS = ["··", "██", "██", "██", "██"] as const;
export const COLORS = [
  "\x1b[38;5;237m", // 0: near-invisible dots
  "\x1b[38;5;22m", //  1: deep green
  "\x1b[38;5;28m", //  2
  "\x1b[38;5;40m", //  3
  "\x1b[1;38;5;46m", // 4: bright green, bold
] as const;
// Current-streak cells burn through the theme: red-orange → yellow, oldest → newest.
export const FIRE = [
  "\x1b[38;5;202m",
  "\x1b[38;5;208m",
  "\x1b[38;5;214m",
  "\x1b[1;38;5;220m",
] as const;
export const RESET = "\x1b[0m";
export const WEEKDAY_LABELS = ["   ", "Mon", "   ", "Wed", "   ", "Fri", "   "];
export const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(
  " ",
);
