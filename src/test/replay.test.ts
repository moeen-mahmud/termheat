import { createEngine, type EngineState, respawn, step } from "@/lib/engine";
import { PF_ROWS, REPLAY, TICK_INPUT } from "@/lib/game-consts";
import type { GameLevel } from "@/lib/types";
import { renderReplayGif, simulateLog } from "@/replay";
import { themeFor } from "@/themes";
import { describe, expect, test } from "bun:test";

const FPS = 20;
const DAY_MS = 86_400_000;

/** 90 days, height 1, with a pit at columns 20–22 — a no-jump run dies there. */
function makeLevel(): GameLevel {
	const base = Date.parse("2025-07-01T00:00:00Z");
	const columns = Array.from({ length: 90 }, (_, i) => ({
		date: new Date(base + i * DAY_MS).toISOString().slice(0, 10),
		count: 1,
		level: 1 as const,
		height: i >= 20 && i <= 22 ? 0 : 1,
		ghost: false,
		flame: i === 30,
	}));
	return {
		columns,
		checkpoints: [
			{ column: 0, date: "2025-07-01", month: 6 },
			{ column: 31, date: "2025-08-01", month: 7 },
		],
		finishColumn: 89,
		flameTotal: 1,
		currentStreak: 0, // 2 base hearts → two pit deaths end the run
	};
}

/**
 * Plays the engine live exactly the way Game.tsx does — all mutation at
 * ticks, one TICK_INPUT code recorded per tick — so the test proves the
 * recording semantics, not just that the same function equals itself.
 */
function recordRun(level: GameLevel, plan: (w: EngineState, tick: number) => number) {
	const w = createEngine(level);
	const log: number[] = [];
	const dt = 1 / FPS;
	for (let tick = 0; tick < 2000; tick++) {
		if (w.status === "won" || w.status === "over") break;
		const code = plan(w, tick);
		if (code === TICK_INPUT.respawn) {
			respawn(w, level);
			log.push(TICK_INPUT.respawn);
		} else {
			step(w, level, dt, { jump: code === TICK_INPUT.jump });
			log.push(code);
		}
	}
	return { w, log };
}

/** No jumps, instant [r] on death — dies in the pit until out of hearts. */
const fatalist = (w: EngineState) => (w.status === "dead" ? TICK_INPUT.respawn : TICK_INPUT.idle);

describe("simulateLog", () => {
	test("replaying a recorded run reproduces the live run, state for state", () => {
		const level = makeLevel();
		const live = recordRun(level, fatalist);
		expect(live.w.status).toBe("over"); // sanity: the fixture actually kills
		expect(live.w.deaths).toBe(2);

		const replayed = simulateLog(level, live.log, FPS);
		// Not sampled fields — the whole state, physics scratch included.
		expect({ ...replayed, collected: [...replayed.collected] }).toEqual({
			...live.w,
			collected: [...live.w.collected],
		});
	});

	test("a run with jumps replays identically too", () => {
		const level = makeLevel();
		// Hop roughly every second — enough to clear the pit on some lives.
		const hopper = (w: EngineState, tick: number) =>
			w.status === "dead" ? TICK_INPUT.respawn : tick % 19 === 0 ? TICK_INPUT.jump : TICK_INPUT.idle;
		const live = recordRun(level, hopper);
		const replayed = simulateLog(level, live.log, FPS);
		expect(replayed.status).toBe(live.w.status);
		expect(replayed.x).toBe(live.w.x);
		expect(replayed.runS).toBeCloseTo(live.w.runS, 10);
		expect(replayed.deathLog).toEqual(live.w.deathLog);
		expect([...replayed.collected]).toEqual([...live.w.collected]);
	});

	test("a respawn code while running is a no-op, like the engine's own guard", () => {
		const level = makeLevel();
		const w = simulateLog(level, [TICK_INPUT.respawn, TICK_INPUT.idle], FPS);
		expect(w.status).toBe("running");
		expect(w.deaths).toBe(0);
	});
});

describe("renderReplayGif", () => {
	const theme = themeFor("fire");

	test("a recorded run renders as a looping GIF at the scene size", () => {
		const level = makeLevel();
		const { log } = recordRun(level, fatalist);
		const gif = renderReplayGif({ level, theme, log, fps: FPS });
		expect(String.fromCharCode(...gif.slice(0, 6))).toBe("GIF89a");
		expect(gif[6]! | (gif[7]! << 8)).toBe(REPLAY.VIEW_DAYS * REPLAY.DAY_PX);
		expect(gif[8]! | (gif[9]! << 8)).toBe(PF_ROWS * REPLAY.ROW_PX);
		expect(gif.at(-1)).toBe(0x3b);
	});

	test("still frames merge — idling on the death screen costs no bytes", () => {
		const level = makeLevel();
		const { log } = recordRun(level, fatalist);
		const gif = renderReplayGif({ level, theme, log, fps: FPS });
		// 60 extra idle ticks while dead: the world is frozen, so every sampled
		// frame is identical and dedupes into the previous one's delay.
		const idleTail = renderReplayGif({ level, theme, log: [...log, ...Array(60).fill(TICK_INPUT.idle)], fps: FPS });
		expect(idleTail.length).toBe(gif.length);
	});

	test("an empty log still produces one valid frame", () => {
		const level = makeLevel();
		const gif = renderReplayGif({ level, theme, log: [], fps: FPS });
		expect(String.fromCharCode(...gif.slice(0, 6))).toBe("GIF89a");
		expect(gif.at(-1)).toBe(0x3b);
	});
});
