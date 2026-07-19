import { levelFor } from "@/heatmap";
import { GAME } from "@/lib/game-consts";
import type { ContributionDay, GameLevel, LevelCheckpoint, LevelColumn } from "@/lib/types";
import { localTodayISO } from "@/streak";

/**
 * Turns a year of contributions into a beatable platformer level.
 *
 * Pure data in, data out — no Ink, no I/O — so the whole fairness argument
 * is unit-testable. The honest graph drives *color* (`level`), while a
 * repaired copy drives *collision* (`height`): real graphs contain 0→4
 * cliffs and month-long pits that no jump arc can clear, so a pre-pass
 * clamps climbs to MAX_RISE and spans long pits with ghost bridges. The
 * player sees their true year; physics plays the fair one.
 */

export interface BuildLevelOptions {
	/** ISO date the level ends at. Defaults to the local today. */
	today?: string;
	/** How many leading columns are forced walkable. Defaults to GAME.SPAWN_SAFE_COLS. */
	spawnSafeCols?: number;
}

export function buildLevel(days: ContributionDay[], opts: BuildLevelOptions = {}): GameLevel {
	const today = opts.today ?? localTodayISO();
	const spawnSafeCols = opts.spawnSafeCols ?? GAME.SPAWN_SAFE_COLS;

	// The calendar fragment includes the rest of the current week — the level
	// ends at today's cell, so future days never become columns.
	const sorted = days.filter((d) => d.date <= today).sort((a, b) => (a.date < b.date ? -1 : 1));
	if (sorted.length === 0) {
		return { columns: [], checkpoints: [], finishColumn: -1, flameTotal: 0 };
	}

	// Repair pipeline: spawn pad → clamp cliffs → bridge pits, in that order.
	// The pad goes first so it counts as real ground for the clamp — otherwise
	// a level opening with pits-then-cliff would leave the cliff unclamped
	// (the first solid column is exempt) and the spawn would face a wall.
	// Bridges come last: they sit at min(prev, next) height, which is only
	// guaranteed reachable once the exit side is clamped to ≤ prev + MAX_RISE.
	const padded = sorted.map((d) => levelFor(d.count) as number);
	const ghosts = new Set<number>();
	for (let i = 0; i < Math.min(spawnSafeCols, padded.length); i++) {
		if (padded[i]! < 1) {
			padded[i] = 1;
			ghosts.add(i);
		}
	}
	// Spawn runway: no wall inside the spawn zone — every step is an auto-step,
	// so the run starts with a few seconds of pure running before the level may
	// demand its first jump (a +2 rise one column after spawn is a ~0.17s
	// reaction test, and worse, an instant respawn-death loop). Lowering (never
	// raising) playable height keeps everything walkable, and the clamp pass
	// below re-establishes MAX_RISE at the zone's exit.
	for (let i = 1; i < Math.min(spawnSafeCols, padded.length); i++) {
		if (padded[i]! > padded[i - 1]! + 1) padded[i] = padded[i - 1]! + 1;
	}
	const { heights, ghosts: bridgeGhosts } = bridgeGaps(clampClimbs(padded));
	for (const ghost of bridgeGhosts) ghosts.add(ghost);

	const flames = flameDates(sorted);
	const columns: LevelColumn[] = sorted.map((d, i) => ({
		date: d.date,
		level: levelFor(d.count),
		height: heights[i]!,
		flame: flames.has(d.date),
		ghost: ghosts.has(i),
	}));

	return {
		columns,
		checkpoints: findCheckpoints(columns),
		finishColumn: columns.length - 1,
		flameTotal: flames.size,
	};
}

/**
 * Every date belonging to a streak — FLAME_MIN_STREAK+ consecutive active
 * days — burns as a collectible flame. The *current* streak alone would put
 * every collectible in the last few columns before today; consistency
 * anywhere in the year deserves its fire. Expects days sorted by date.
 */
export function flameDates(days: ContributionDay[], minStreak: number = GAME.FLAME_MIN_STREAK): Set<string> {
	const flames = new Set<string>();
	let run: string[] = [];
	const commit = () => {
		if (run.length >= minStreak) for (const date of run) flames.add(date);
		run = [];
	};
	for (const day of days) {
		if (day.count > 0) run.push(day.date);
		else commit();
	}
	commit();
	return flames;
}

/**
 * Walking left → right, caps every climb at MAX_RISE rows above the last
 * *solid* column (pits don't count — you jump over them from the last ground
 * you stood on). Descents are never touched: falling any distance is fine.
 */
export function clampClimbs(heights: number[], maxRise: number = GAME.MAX_RISE): number[] {
	const out = [...heights];
	let lastSolid: number | null = null;
	for (let i = 0; i < out.length; i++) {
		const h = out[i]!;
		if (h === 0) continue;
		if (lastSolid !== null && h > lastSolid + maxRise) out[i] = lastSolid + maxRise;
		lastSolid = out[i]!;
	}
	return out;
}

/**
 * Finds every zero-run longer than maxGap and spans it with ghost platforms
 * at min(neighbor) height, so no remaining pit exceeds the jump arc. Which
 * columns inside the run become platforms is placeGhostBridge's call.
 */
export function bridgeGaps(
	heights: number[],
	maxGap: number = GAME.MAX_GAP,
): { heights: number[]; ghosts: Set<number> } {
	const out = [...heights];
	const ghosts = new Set<number>();
	let i = 0;
	while (i < out.length) {
		if (out[i]! > 0) {
			i++;
			continue;
		}
		let end = i;
		while (end < out.length && out[end] === 0) end++;
		const runLength = end - i;
		if (runLength > maxGap) {
			const prev = i > 0 ? out[i - 1]! : 1;
			const next = end < out.length ? out[end]! : 1;
			const height = Math.max(1, Math.min(prev, next));
			for (const offset of placeGhostBridge(runLength, maxGap)) {
				out[i + offset] = height;
				ghosts.add(i + offset);
			}
		}
		i = end;
	}
	return { heights: out, ghosts };
}

/**
 * Decides which columns inside a too-long pit become ghost platforms.
 *
 * Contract: given a run of `runLength` consecutive pit columns (offsets
 * 0 … runLength-1) with solid ground on both sides, return the offsets to
 * turn into platforms such that no remaining stretch of consecutive pit
 * columns — including the stretches touching either end of the run — is
 * longer than `maxGap`.
 *
 * Strategy: stepping stones, as sparse as fairness allows. A platform is
 * dropped only when the stretch of pit behind the player is about to exceed
 * maxGap and the run's far edge isn't already within jumping reach — so a
 * dead month stays a scary sequence of max-length jumps instead of becoming
 * a paved corridor that hides the shame.
 */
export function placeGhostBridge(runLength: number, maxGap: number = GAME.MAX_GAP): number[] {
	const stones: number[] = [];
	let sinceSolid = 0;
	for (let offset = 0; offset < runLength; offset++) {
		if (runLength - offset <= maxGap - sinceSolid) break; // far edge is in reach
		sinceSolid++;
		if (sinceSolid > maxGap) {
			stones.push(offset);
			sinceSolid = 0;
		}
	}
	return stones;
}

/**
 * Column 0 plus each month's first *walkable* column. If the 1st of a month
 * is a pit, the checkpoint slides right to the next solid column — otherwise
 * respawning there would be an instant-death loop.
 */
function findCheckpoints(columns: LevelColumn[]): LevelCheckpoint[] {
	const checkpoints: LevelCheckpoint[] = [];
	const push = (from: number) => {
		for (let i = from; i < columns.length; i++) {
			const col = columns[i]!;
			if (col.height > 0) {
				if (checkpoints.at(-1)?.column !== i) {
					checkpoints.push({ column: i, date: col.date, month: Number(col.date.slice(5, 7)) - 1 });
				}
				return;
			}
		}
	};
	push(0);
	columns.forEach((col, i) => {
		if (i > 0 && col.date.slice(8) === "01") push(i);
	});
	return checkpoints;
}
