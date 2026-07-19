import { describe, expect, test } from "bun:test";
import { createEngine, type EngineState } from "@/lib/engine";
import { fmtRunTime, monthRow, monthYear, shareCard } from "@/lib/share";
import type { GameLevel } from "@/lib/types";

const DAY_MS = 86_400_000;

/** 90 flat days from July 2025 — three checkpoints (Jul, Aug, Sep). */
function makeLevel(): GameLevel {
	const base = Date.parse("2025-07-01T00:00:00Z");
	const columns = Array.from({ length: 90 }, (_, i) => ({
		date: new Date(base + i * DAY_MS).toISOString().slice(0, 10),
		count: 1,
		level: 1 as const,
		height: 1,
		ghost: false,
		flame: false,
		star: false,
	}));
	return {
		columns,
		checkpoints: [
			{ column: 0, date: "2025-07-01", month: 6 },
			{ column: 31, date: "2025-08-01", month: 7 },
			{ column: 62, date: "2025-09-01", month: 8 },
		],
		finishColumn: 89,
		flameTotal: 10,
		starTotal: 0,
		currentStreak: 0,
	};
}

function makeRun(level: GameLevel, patch: Partial<EngineState>): EngineState {
	return { ...createEngine(level), ...patch };
}

describe("monthRow", () => {
	test("a flawless win is all green", () => {
		const level = makeLevel();
		const w = makeRun(level, { status: "won" });
		expect(monthRow(w, level)).toBe("🟩🟩🟩");
	});

	test("one death yellows a month, two bloody it red", () => {
		const level = makeLevel();
		// Died once in July (col 5), twice in August (cols 40, 45).
		const w = makeRun(level, { status: "won", deaths: 3, deathLog: [5, 40, 45] });
		expect(monthRow(w, level)).toBe("🟨🟥🟩");
	});

	test("months past the run's end are unreached black", () => {
		const level = makeLevel();
		// Ran out of hearts mid-August: checkpoint 1 is the high-water mark.
		const w = makeRun(level, { status: "over", checkpoint: 1, deaths: 2, deathLog: [40, 41] });
		expect(monthRow(w, level)).toBe("🟩🟥⬛");
	});

	test("a death on the checkpoint column belongs to that month", () => {
		const level = makeLevel();
		const w = makeRun(level, { status: "won", deaths: 1, deathLog: [31] });
		expect(monthRow(w, level)).toBe("🟩🟨🟩");
	});
});

describe("fmtRunTime", () => {
	test("under a minute stays in seconds", () => {
		expect(fmtRunTime(48)).toBe("48s");
		expect(fmtRunTime(48.4)).toBe("48s");
	});

	test("over a minute reads m + zero-padded seconds", () => {
		expect(fmtRunTime(83)).toBe("1m23s");
		expect(fmtRunTime(60)).toBe("1m00s");
		expect(fmtRunTime(125.6)).toBe("2m06s");
	});
});

describe("monthYear", () => {
	test("formats month and two-digit year, empty on missing date", () => {
		expect(monthYear("2025-07-19")).toBe("Jul '25");
		expect(monthYear(undefined)).toBe("");
	});
});

describe("shareCard", () => {
	test("a won card carries the clear time and ends with the replay command", () => {
		const level = makeLevel();
		const w = makeRun(level, { status: "won", runS: 48, flames: 7 });
		const card = shareCard(w, level, "moeen-mahmud");
		const lines = card.split("\n");
		expect(lines).toHaveLength(4);
		expect(lines[0]).toBe("termheat · moeen-mahmud's year · Jul '25 → Sep '25");
		expect(lines[2]).toContain("cleared in 48s");
		expect(lines[2]).toContain("🔥 7/10");
		// The viral mechanic: the card IS the replay command.
		expect(lines[3]).toBe("npx termheat play moeen-mahmud");
	});

	test("a lost card names the month that ended the run", () => {
		const level = makeLevel();
		const w = makeRun(level, {
			status: "over",
			checkpoint: 1,
			deaths: 2,
			deathLog: [40, 45],
			deathColumn: 45,
		});
		expect(shareCard(w, level, "moeen-mahmud")).toContain("out of hearts in Aug '25");
	});
});
