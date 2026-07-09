import type { THEMES } from "@/lib/const";

/** One calendar day of contribution activity, as reported by GitHub. */
export interface ContributionDay {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  count: number;
}

/** GitHub-style intensity bucket. 0 = none, 4 = hottest. */
export type Level = 0 | 1 | 2 | 3 | 4;

export interface HeatmapCell extends ContributionDay {
  level: Level;
}

/** 7 slots, Sunday-first. `null` = date outside the fetched range (partial edge weeks). */
export type Week = (HeatmapCell | null)[];

export interface Heatmap {
  weeks: Week[];
  total: number;
}

/**
 * The name of a color theme, as defined in `src/lib/const.ts`.
 */
export type ThemeName = (typeof THEMES)[number];

/**
 * A color theme. All colors are `#rrggbb` hex — Ink's `<Text color>` renders
 * them as truecolor, and hex supports brightness math (see `scaleHex`).
 */
export interface Theme {
  name: ThemeName;
  /** Cell color per intensity level; index 0 is the empty-day dot. */
  levels: readonly [string, string, string, string, string];
  /** Accent for the title and streak stat. */
  accent: string;
}
