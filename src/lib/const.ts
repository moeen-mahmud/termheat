// --- Constants used throughout the project. ---

export const THEMES = ["github", "fire", "ocean", "mono"] as const;

export const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export const CONTRIBUTIONS_URL = (username: string) =>
  `https://github.com/users/${encodeURIComponent(username)}/contributions`;
