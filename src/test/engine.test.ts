import { GAME } from "@/lib/game-consts";
import { AIR_JUMP_V0, createEngine, type EngineState, JUMP_V0, PHYSICS, respawn, speedAt, step } from "@/lib/engine";
import type { GameLevel, Level, LevelColumn } from "@/lib/types";
import { describe, expect, test } from "bun:test";

const DT = 1 / 20; // the default render tick; physics must not care (dt-based)
const DAY_MS = 86_400_000;

function makeLevel(heights: number[], opts: { flames?: number[]; checkpoints?: number[] } = {}): GameLevel {
	const base = Date.parse("2026-01-01T00:00:00Z");
	const flames = opts.flames ?? [];
	const columns: LevelColumn[] = heights.map((h, i) => ({
		date: new Date(base + i * DAY_MS).toISOString().slice(0, 10),
		level: Math.max(0, Math.min(4, h)) as Level,
		height: h,
		flame: flames.includes(i),
		ghost: false,
	}));
	return {
		columns,
		checkpoints: (opts.checkpoints ?? [0]).map((column) => ({
			column,
			date: columns[column]!.date,
			month: Number(columns[column]!.date.slice(5, 7)) - 1,
		})),
		finishColumn: columns.length - 1,
		flameTotal: flames.length,
	};
}

function tick(w: EngineState, level: GameLevel, jump = false): void {
	step(w, level, DT, { jump });
}

/** Ticks until the predicate holds or the run stops being "running". */
function runUntil(w: EngineState, level: GameLevel, pred: (w: EngineState) => boolean, maxTicks = 5000): void {
	for (let i = 0; i < maxTicks && w.status === "running" && !pred(w); i++) tick(w, level);
}

describe("engine basics", () => {
	test("auto-runs forward at the base speed", () => {
		const level = makeLevel(Array(40).fill(2));
		const w = createEngine(level);
		for (let i = 0; i < 20; i++) tick(w, level); // one second
		expect(w.x).toBeGreaterThan(5.9);
		expect(w.x).toBeLessThan(6.3);
		expect(w.airborne).toBe(false);
		expect(w.y).toBe(2);
	});

	test("speed ramps with survival and caps", () => {
		expect(speedAt(0)).toBe(PHYSICS.SPEED_BASE);
		expect(speedAt(25)).toBeGreaterThan(PHYSICS.SPEED_BASE);
		expect(speedAt(60)).toBe(PHYSICS.SPEED_CAP);
	});

	test("jump math clears what the level repair guarantees", () => {
		// Apex comfortably above the tallest repaired climb…
		expect(PHYSICS.APEX_ROWS).toBeGreaterThan(GAME.MAX_RISE);
		// …and full airtime distance covers the widest repaired pit.
		const tDown = Math.sqrt((2 * PHYSICS.APEX_ROWS) / ((2 * 2 * PHYSICS.APEX_ROWS) / PHYSICS.TIME_TO_APEX ** 2));
		const airtimeCols = (PHYSICS.TIME_TO_APEX + tDown) * PHYSICS.SPEED_BASE;
		expect(airtimeCols).toBeGreaterThan(GAME.MAX_GAP);
	});
});

describe("terrain rules", () => {
	test("a +1 rise is an auto-step", () => {
		const level = makeLevel([...Array(10).fill(1), ...Array(30).fill(2)]);
		const w = createEngine(level);
		runUntil(w, level, (s) => s.x >= 13);
		expect(w.status).toBe("running");
		expect(w.y).toBe(2);
	});

	test("a +2 rise is a wall — running into it kills", () => {
		const level = makeLevel([...Array(10).fill(2), ...Array(30).fill(4)]);
		const w = createEngine(level);
		runUntil(w, level, () => false);
		expect(w.status).toBe("dead");
		expect(w.deathCause).toBe("wall");
		expect(w.deaths).toBe(1);
	});

	test("the same wall is cleared with a jump", () => {
		const level = makeLevel([...Array(10).fill(2), ...Array(30).fill(4)]);
		const w = createEngine(level);
		runUntil(w, level, (s) => s.x >= 8);
		tick(w, level, true);
		runUntil(w, level, (s) => s.x >= 15);
		expect(w.status).toBe("running");
		expect(w.y).toBe(4);
	});

	test("running into a pit with no jump is death by pit", () => {
		const level = makeLevel([...Array(10).fill(2), ...Array(10).fill(0), ...Array(20).fill(2)]);
		const w = createEngine(level);
		runUntil(w, level, () => false);
		expect(w.status).toBe("dead");
		expect(w.deathCause).toBe("pit");
	});

	test("a MAX_GAP pit is clearable with a single ground jump", () => {
		const level = makeLevel([...Array(10).fill(2), ...Array(GAME.MAX_GAP).fill(0), ...Array(27).fill(2)]);
		const w = createEngine(level);
		runUntil(w, level, (s) => s.x >= 9);
		tick(w, level, true);
		runUntil(w, level, (s) => s.x >= 16);
		expect(w.status).toBe("running");
	});
});

describe("jump feel", () => {
	test("double jump: one extra impulse, then the well is dry", () => {
		const level = makeLevel(Array(60).fill(2));
		const w = createEngine(level);
		runUntil(w, level, (s) => s.x >= 3);
		tick(w, level, true);
		expect(w.airborne).toBe(true);
		expect(w.jumpsUsed).toBe(1);
		runUntil(w, level, (s) => s.vy <= 0); // apex
		tick(w, level, true);
		expect(w.jumpsUsed).toBe(2);
		expect(w.vy).toBeGreaterThan(0); // fresh parabola fired
	});

	test("jump buffer: a press just before landing fires on the ground", () => {
		const level = makeLevel(Array(80).fill(2));
		const w = createEngine(level);
		runUntil(w, level, (s) => s.x >= 3);
		tick(w, level, true); // ground jump
		runUntil(w, level, (s) => s.vy <= 0);
		tick(w, level, true); // double jump — now exhausted
		expect(w.jumpsUsed).toBe(2);
		// Window wider than one tick's max fall (0.9 rows) so it can't be skipped.
		runUntil(w, level, (s) => s.vy < 0 && s.y - 2 < 1.3); // just above ground
		tick(w, level, true); // buffered — a third air impulse must NOT fire
		expect(w.vy).toBeLessThanOrEqual(0); // still falling (or already landed)
		runUntil(w, level, (s) => !s.airborne); // land
		tick(w, level); // buffer fires from the ground, no new press
		expect(w.airborne).toBe(true);
		expect(w.jumpsUsed).toBe(1);
	});

	test("coyote time: a late press just past the ledge still ground-jumps", () => {
		const level = makeLevel([...Array(10).fill(3), ...Array(3).fill(0), ...Array(27).fill(3)]);
		const w = createEngine(level);
		runUntil(w, level, (s) => s.airborne); // walked off the ledge
		expect(w.coyoteS).toBeGreaterThan(0);
		tick(w, level, true);
		// A full ground jump (jumpsUsed 1), not the weaker air jump.
		expect(w.jumpsUsed).toBe(1);
		expect(JUMP_V0).toBeGreaterThan(AIR_JUMP_V0); // and it is the stronger one
		runUntil(w, level, (s) => s.x >= 16);
		expect(w.status).toBe("running");
	});
});

describe("flames, checkpoints, win", () => {
	test("flames collect at ground level and survive respawn", () => {
		const heights = [...Array(30).fill(2), ...Array(8).fill(0), ...Array(22).fill(2)];
		const level = makeLevel(heights, { flames: [5], checkpoints: [0, 20] });
		const w = createEngine(level);
		runUntil(w, level, () => false); // dies in the 8-wide pit
		expect(w.flames).toBe(1);
		expect(w.status).toBe("dead");
		expect(w.deaths).toBe(1);

		const deathColumn = w.deathColumn!;
		respawn(w, level);
		expect(w.status).toBe("running");
		// Backoff behind the death, floored at the last checkpoint passed.
		expect(w.x).toBe(Math.max(20, deathColumn - PHYSICS.RESPAWN_BACKOFF_COLS));
		expect(w.airborne).toBe(true); // drops in from above
		expect(w.y).toBe(2 + PHYSICS.RESPAWN_DROP_ROWS);
		expect(w.flames).toBe(1); // a lived day stays lived
		expect(w.elapsed).toBe(0); // speed ramp restarts
	});

	test("respawn drop-in survives a wall right at the spawn point", () => {
		// Death at the 2→4 wall; a grounded respawn 10 columns back would run
		// straight into it again within the checkpoint's first columns —
		// dropping in above the tallest nearby ground absorbs the step.
		const heights = [...Array(22).fill(2), ...Array(18).fill(4)];
		const level = makeLevel(heights, { checkpoints: [0, 20] });
		const w = createEngine(level);
		runUntil(w, level, () => false); // wall death at ~col 21
		expect(w.deathCause).toBe("wall");
		respawn(w, level);
		expect(w.y).toBe(4 + PHYSICS.RESPAWN_DROP_ROWS); // above the wall top
		runUntil(w, level, (s) => s.x >= 30);
		expect(w.status).toBe("running"); // lands on the 4-block and keeps going
	});

	test("respawn never rolls back past the last checkpoint", () => {
		// Wall two columns after the checkpoint: backoff would land at col 11,
		// but the checkpoint at 20... floors it.
		const heights = [...Array(22).fill(2), ...Array(18).fill(4)];
		const level = makeLevel(heights, { checkpoints: [0, 20] });
		const w = createEngine(level);
		runUntil(w, level, () => false); // wall death at ~col 21
		expect(w.status).toBe("dead");
		expect(w.deathCause).toBe("wall");
		respawn(w, level);
		expect(w.x).toBe(20);
	});

	test("respawn slides left off a pit column", () => {
		// Death at col ~35; backoff lands at ~25 which is a pit → slide left
		// onto the solid ground just before it.
		const heights = [...Array(24).fill(2), 0, 0, 0, ...Array(8).fill(2), ...Array(25).fill(4)];
		const level = makeLevel(heights, { checkpoints: [0] });
		const w = createEngine(level);
		runUntil(w, level, (s) => s.x >= 23);
		tick(w, level, true); // clear the 3-wide pit
		runUntil(w, level, () => false); // wall death at ~col 35
		expect(w.status).toBe("dead");
		expect(w.deathCause).toBe("wall");
		respawn(w, level);
		expect(level.columns[Math.floor(w.x)]!.height).toBeGreaterThan(0);
		expect(w.status).toBe("running");
	});

	test("sailing high over a flame does not collect it", () => {
		const level = makeLevel(Array(40).fill(2), { flames: [8] });
		const w = createEngine(level);
		runUntil(w, level, (s) => s.x >= 5.5);
		tick(w, level, true);
		runUntil(w, level, (s) => s.vy <= 0);
		tick(w, level, true); // double jump — apex ~5 rows over the flame
		runUntil(w, level, (s) => s.x >= 12);
		expect(w.flames).toBe(0);
	});

	test("reaching today's column wins", () => {
		const level = makeLevel(Array(30).fill(2));
		const w = createEngine(level);
		runUntil(w, level, () => false);
		expect(w.status).toBe("won");
		expect(w.x).toBe(level.finishColumn);
	});

	test("a finished simulation is frozen", () => {
		const level = makeLevel(Array(30).fill(2));
		const w = createEngine(level);
		runUntil(w, level, () => false);
		const x = w.x;
		tick(w, level, true);
		expect(w.x).toBe(x);
		expect(w.status).toBe("won");
	});
});
