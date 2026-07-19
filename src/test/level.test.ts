import { describe, expect, test } from "bun:test";
import { bridgeGaps, buildLevel, clampClimbs, placeGhostBridge } from "@/level";
import { GAME } from "@/lib/game-consts";
import type { ContributionDay } from "@/lib/types";

const DAY_MS = 86_400_000;

function makeDays(counts: number[], start = "2026-01-01"): ContributionDay[] {
	const base = Date.parse(`${start}T00:00:00Z`);
	return counts.map((count, i) => ({
		date: new Date(base + i * DAY_MS).toISOString().slice(0, 10),
		count,
	}));
}

const lastDate = (days: ContributionDay[]) => days.at(-1)!.date;

/** Longest run of consecutive pit (height 0) columns. */
function maxZeroRun(heights: number[]): number {
	let best = 0;
	let run = 0;
	for (const h of heights) {
		run = h === 0 ? run + 1 : 0;
		if (run > best) best = run;
	}
	return best;
}

describe("clampClimbs", () => {
	test("caps a cliff to lastSolid + MAX_RISE", () => {
		expect(clampClimbs([1, 0, 0, 4])).toEqual([1, 0, 0, 3]);
	});

	test("clamps chain relative to the already-repaired column", () => {
		expect(clampClimbs([1, 4, 9])).toEqual([1, 3, 5]);
	});

	test("never touches descents", () => {
		expect(clampClimbs([4, 2, 1])).toEqual([4, 2, 1]);
	});

	test("the first solid column sets the baseline unclamped", () => {
		expect(clampClimbs([0, 0, 4, 4])).toEqual([0, 0, 4, 4]);
	});
});

describe("bridgeGaps", () => {
	test("leaves jumpable gaps alone", () => {
		const { heights, ghosts } = bridgeGaps([1, 0, 0, 0, 2]);
		expect(heights).toEqual([1, 0, 0, 0, 2]);
		expect(ghosts.size).toBe(0);
	});

	test("no zero-run survives longer than MAX_GAP", () => {
		const { heights } = bridgeGaps([2, 0, 0, 0, 0, 0, 0, 0, 0, 4]);
		expect(maxZeroRun(heights)).toBeLessThanOrEqual(GAME.MAX_GAP);
	});

	test("platforms sit at min(neighbor) height and are marked ghost", () => {
		const { heights, ghosts } = bridgeGaps([2, 0, 0, 0, 0, 0, 0, 0, 0, 4]);
		expect(ghosts.size).toBeGreaterThan(0);
		for (const i of ghosts) {
			expect(i).toBeGreaterThan(0);
			expect(i).toBeLessThan(9);
			expect(heights[i]).toBe(2);
		}
	});

	test("a pit at the level edge assumes height-1 ground beyond it", () => {
		const { heights, ghosts } = bridgeGaps([0, 0, 0, 0, 0, 2]);
		expect(maxZeroRun(heights)).toBeLessThanOrEqual(GAME.MAX_GAP);
		for (const i of ghosts) expect(heights[i]).toBe(1);
	});
});

describe("placeGhostBridge", () => {
	test("contract: no remaining stretch exceeds maxGap, whatever the strategy", () => {
		for (const runLength of [4, 5, 9, 14, 31, 60]) {
			const platform = new Set(placeGhostBridge(runLength, GAME.MAX_GAP));
			for (const offset of platform) {
				expect(offset).toBeGreaterThanOrEqual(0);
				expect(offset).toBeLessThan(runLength);
			}
			const run = Array.from({ length: runLength }, (_, i) => (platform.has(i) ? 1 : 0));
			// Solid ground flanks the run on both sides.
			expect(maxZeroRun([1, ...run, 1])).toBeLessThanOrEqual(GAME.MAX_GAP);
		}
	});
});

describe("buildLevel", () => {
	test("maps each day to a column: honest color, repaired height", () => {
		const days = makeDays([0, 2, 5, 9, 20]);
		const level = buildLevel(days, { today: lastDate(days) });
		expect(level.columns.map((c) => c.level)).toEqual([0, 1, 2, 3, 4]);
		expect(level.columns.map((c) => c.date)).toEqual(days.map((d) => d.date));
		expect(level.finishColumn).toBe(4);
	});

	test("excludes days after today — the level ends at today's cell", () => {
		const days = makeDays([1, 1, 1, 1, 1]);
		const level = buildLevel(days, { today: days[2]!.date });
		expect(level.columns).toHaveLength(3);
		expect(level.finishColumn).toBe(2);
	});

	test("spawn pad: the first stretch is always walkable, marked ghost", () => {
		const days = makeDays(Array(20).fill(0));
		const level = buildLevel(days, { today: lastDate(days) });
		for (let i = 0; i < GAME.SPAWN_SAFE_COLS; i++) {
			expect(level.columns[i]!.height).toBeGreaterThanOrEqual(1);
			expect(level.columns[i]!.ghost).toBe(true);
			expect(level.columns[i]!.level).toBe(0); // color stays honest
		}
	});

	test("spawn runway: no jump is required inside the spawn zone", () => {
		// A wall right after spawn would be a ~0.17s reaction test and an
		// instant respawn-death loop for anyone who doesn't jump immediately.
		const days = makeDays([0, 4, 0, 3, 4, 4, 0, 4, ...Array(20).fill(1)]);
		const level = buildLevel(days, { today: lastDate(days) });
		for (let i = 1; i < GAME.SPAWN_SAFE_COLS; i++) {
			const rise = level.columns[i]!.height - level.columns[i - 1]!.height;
			expect(rise).toBeLessThanOrEqual(1); // auto-step, never a wall
		}
	});

	test("a cliff right after the spawn pad becomes an auto-step", () => {
		const counts = [...Array(4).fill(0), 20, ...Array(10).fill(1)];
		const days = makeDays(counts);
		const level = buildLevel(days, { today: lastDate(days) });
		// Pad is height 1; inside the spawn zone the raw height-4 cliff is
		// smoothed to a +1 step — but its color stays honestly hot.
		expect(level.columns[4]!.height).toBe(2);
		expect(level.columns[4]!.level).toBe(4);
	});

	test("flames burn on every 3+ day streak, all year long", () => {
		// A lone active day is not a streak; both the mid-year run and the
		// current one burn — collectibles must not cluster at today's edge.
		const days = makeDays([5, 0, 3, 4, 5, 0, 2, 0, 1, 1, 1]);
		const level = buildLevel(days, { today: lastDate(days) });
		expect(level.columns.map((c) => c.flame)).toEqual([
			false,
			false,
			true,
			true,
			true,
			false,
			false,
			false,
			true,
			true,
			true,
		]);
		expect(level.flameTotal).toBe(6);
	});

	test("checkpoints: column 0 plus each month's first column", () => {
		const days = makeDays(Array(40).fill(1), "2026-01-05");
		const level = buildLevel(days, { today: lastDate(days) });
		expect(level.checkpoints).toEqual([
			{ column: 0, date: "2026-01-05", month: 0 },
			{ column: 27, date: "2026-02-01", month: 1 },
		]);
	});

	test("a checkpoint on a pit slides right to the next walkable column", () => {
		const counts = Array(40).fill(1);
		counts[27] = 0; // 2026-02-01 is a pit
		const days = makeDays(counts, "2026-01-05");
		const level = buildLevel(days, { today: lastDate(days) });
		expect(level.checkpoints[1]).toEqual({ column: 28, date: "2026-02-02", month: 1 });
	});

	test("empty input yields an empty level, not a crash", () => {
		expect(buildLevel([])).toEqual({
			columns: [],
			checkpoints: [],
			finishColumn: -1,
			flameTotal: 0,
		});
	});

	test("a gnarly synthetic year is beatable end to end", () => {
		// Nine-day pits, 0→4 cliffs, and rolling hills — worse than any real graph.
		const counts = Array.from({ length: 365 }, (_, i) => {
			if (i % 37 < 9) return 0;
			if (i % 11 === 0) return 20;
			return i % 5;
		});
		const days = makeDays(counts, "2025-07-18");
		const level = buildLevel(days, { today: lastDate(days) });
		const heights = level.columns.map((c) => c.height);

		// Invariant 1: every pit is jumpable.
		expect(maxZeroRun(heights)).toBeLessThanOrEqual(GAME.MAX_GAP);

		// Invariant 2: every climb between solid columns is within MAX_RISE.
		let lastSolid: number | null = null;
		for (const h of heights) {
			if (h === 0) continue;
			if (lastSolid !== null) expect(h).toBeLessThanOrEqual(lastSolid + GAME.MAX_RISE);
			lastSolid = h;
		}

		// Invariant 3: the spawn stretch is walkable jump-free and every respawn is safe.
		for (let i = 0; i < GAME.SPAWN_SAFE_COLS; i++) {
			expect(heights[i]).toBeGreaterThanOrEqual(1);
			if (i > 0) expect(heights[i]! - heights[i - 1]!).toBeLessThanOrEqual(1);
		}
		for (const checkpoint of level.checkpoints) {
			expect(heights[checkpoint.column]).toBeGreaterThanOrEqual(1);
		}

		expect(level.finishColumn).toBe(364);
		expect(level.checkpoints.length).toBeGreaterThanOrEqual(12);
	});
});
