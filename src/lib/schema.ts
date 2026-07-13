import type { ThemeName, Heatmap as HeatmapData, ContributionDay } from "@/lib/types";

export interface CliArgs {
	username?: string;
	theme?: ThemeName;
	watch: boolean;
	shame: boolean;
	config: boolean;
	help: boolean;
	version: boolean;
	/** Render a single static frame — no breathe, flicker, or reveal wipe. */
	noAnimation: boolean;
	/** ASCII-only cells and no emoji, for basic terminals and fonts. */
	ascii: boolean;
	/** Human-readable problems; if non-empty the CLI prints them and exits 1. */
	errors: string[];
}

export interface TermheatConfig {
	username?: string;
	theme?: ThemeName;
	refreshMinutes?: number;
	shame?: boolean;
}

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

export interface AnimationFrame {
	/** Monotonic frame counter — the single source all effects derive from. */
	tick: number;
	/** 0..1 whole-grid brightness cycle (sine, ~4s period). */
	breathe: number;
}

export interface HeatmapProps {
	heatmap: HeatmapData;
	theme: Theme;
	/** Dates of the current streak, oldest → newest (see currentStreakDates). */
	streakDates: string[];
	anim: AnimationFrame;
	/** Tick at which the current data arrived; null = no wipe (static render). */
	revealFrom: number | null;
	ascii: boolean;
}

export interface StatsBarProps {
	days: ContributionDay[];
	streakLength: number;
	theme: Theme;
	shame: boolean;
	watch: boolean;
	refreshMinutes: number;
	/** True while a background refetch is in flight. */
	refreshing: boolean;
	interactive: boolean;
	ascii: boolean;
}

export interface AppProps {
	username: string;
	theme: Theme;
	watch: boolean;
	refreshMinutes: number;
	shame: boolean;
	/** False = one static frame (from --no-animation/--static or NO_COLOR). */
	animate: boolean;
	ascii: boolean;
}
