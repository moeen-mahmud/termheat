import type { EXPORT_FORMATS, THEMES } from "@/lib/const";

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

// --- `termheat play` domain types. Built by level.ts, consumed by engine.ts
// and the game renderer. Kept here (not in level.ts) per the one-concern-per-
// file rule: types.ts owns domain shapes, level.ts owns the logic.

/** One playable day-column of a `termheat play` level. */
export interface LevelColumn {
	/** ISO date this column represents. */
	date: string;
	/** Honest contribution intensity 0–4 — drives tile color, never collision. */
	level: Level;
	/** Playable terrain height in rows after the fairness repair. 0 = pit. */
	height: number;
	/** Collectible flame — this date is part of a streak (FLAME_MIN_STREAK+ consecutive active days). */
	flame: boolean;
	/** Artificial platform inserted by the repair pass; rendered dim. */
	ghost: boolean;
}

/** A respawn point — column 0, plus each month's first walkable column. */
export interface LevelCheckpoint {
	column: number;
	date: string;
	/** 0 = January … 11 = December. */
	month: number;
}

/** A full year-as-level: one column per day, guaranteed beatable. */
export interface GameLevel {
	columns: LevelColumn[];
	checkpoints: LevelCheckpoint[];
	/** Index of the last column — today, where the finish flag waits. */
	finishColumn: number;
	/** How many flames exist, for the HUD's `n/total` counter. */
	flameTotal: number;
}

/**
 * The name of a color theme, as defined in `src/lib/const.ts`.
 */
export type ThemeName = (typeof THEMES)[number];

/**
 * A shareable-card output format, as defined in `src/lib/const.ts`.
 */
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
