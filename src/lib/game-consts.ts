// --- `termheat play` level geometry. Shared by level.ts (repair pass) and
// engine.ts (jump physics) so "what the level guarantees" and "what the
// player can do" never drift apart: physics must clear a MAX_GAP pit and
// climb a MAX_RISE step, and the repair pass promises nothing harder exists.

/** GitHub's danger red — hearts must not read as collectible flames. */
export const HEART_COLOR = "#f85149";

export const HUD_INPUT = {
	restart: "r",
	jump: " ",
	quit: "q",
	help: "h",
} as const;

/**
 * `--gif` input-log codes, one per tick. The engine is deterministic, so a
 * whole run IS this log: Game.tsx records it as it steps, replay.ts feeds it
 * back through the same engine to re-render the run offline. A restart wipes
 * the log — the GIF covers the run that actually ended.
 */
export const TICK_INPUT = {
	idle: 0,
	jump: 1,
	respawn: 2,
} as const;

export const GAME = {
	/** Steepest climb the repair pass leaves standing, in rows. */
	MAX_RISE: 2,
	/** Widest pit the repair pass leaves standing, in columns. */
	MAX_GAP: 3,
	/** Columns from the left edge that are always walkable, so the spawn is safe. */
	SPAWN_SAFE_COLS: 12,
	/**
	 * Consecutive active days for a run to burn as collectible flames. Flames
	 * reward consistency all year long — the *current* streak alone would put
	 * every collectible in the last few columns before today.
	 */
	FLAME_MIN_STREAK: 3,
} as const;

// Consistency is power, mechanically: your current streak buys hearts, and
// hearts are what separate "lose 10 columns" from "lose the run".
export const HEARTS = {
	/** Everyone starts here — a quiet week shouldn't mean one-death runs. */
	BASE: 2,
	/** One extra heart per this many days of current streak. */
	PER_STREAK_DAYS: 7,
	MAX: 5,
} as const;

/** Game render tick. Play-test verdict: 20 feels smooth (15 was okay). */
export const PLAY_FPS = 20;

export const PF_ROWS = 10; // terrain (0–4) + jump apex (3) + double-jump headroom
export const PLAYER_SCREEN_DAY = 10; // sprite sits this many day-columns in from the left

/** Altitude assigned while over a pit — far enough down that y < -1 = dead. */
export const NO_FLOOR = -10;

export const REPLAY = {
	/** Days visible per frame — matches a ~112-column terminal viewport. */
	VIEW_DAYS: 56,
	DAY_PX: 8,
	ROW_PX: 10,
	/** Rasterize every Nth tick: a 20fps simulation becomes a 10fps GIF. */
	SAMPLE_EVERY: 2,
	/** Longest a deduplicated still frame may pause, in hundredths of a second. */
	STILL_CAP_CS: 100,
	/** Extra hold on the final frame before the loop restarts. */
	HOLD_CS: 150,
} as const;

export const REPLAY_FRAME_WIDTH = REPLAY.VIEW_DAYS * REPLAY.DAY_PX;
export const REPLAY_FRAME_HEIGHT = PF_ROWS * REPLAY.ROW_PX;
