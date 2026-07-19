// --- `termheat play` level geometry. Shared by level.ts (repair pass) and
// engine.ts (jump physics) so "what the level guarantees" and "what the
// player can do" never drift apart: physics must clear a MAX_GAP pit and
// climb a MAX_RISE step, and the repair pass promises nothing harder exists.
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

/** Game render tick. Play-test verdict: 20 feels smooth (15 was okay). */
export const PLAY_FPS = 20;

export const PF_ROWS = 10; // terrain (0–4) + jump apex (3) + double-jump headroom
export const PLAYER_SCREEN_DAY = 10; // sprite sits this many day-columns in from the left
