import { describe, expect, test } from "bun:test";
import { createEngine, type EngineState } from "@/lib/engine";
import type { GameLevel } from "@/lib/types";
import { renderRunCard } from "@/run-card";
import { themeFor } from "@/themes";

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
		currentStreak: 0,
	};
}

function makeRun(level: GameLevel, patch: Partial<EngineState>): EngineState {
	return { ...createEngine(level), ...patch };
}

describe("renderRunCard", () => {
	test("a won run: one tile per month, outcome, and the replay command", () => {
		const level = makeLevel();
		const w = makeRun(level, { status: "won", runS: 48, deaths: 1, deathLog: [40], flames: 7 });
		const svg = renderRunCard({ username: "moeen-mahmud", w, level, theme: themeFor("github") });
		expect(svg).toStartWith("<svg ");
		// Jul clean (green), Aug one death (yellow), Sep clean.
		expect(svg.match(/#2ea043/g)).toHaveLength(2);
		expect(svg.match(/#d29922/g)).toHaveLength(1);
		expect(svg).toContain("cleared in 48s");
		expect(svg).toContain("1 death ·");
		expect(svg).toContain("7/10 flames");
		expect(svg).toContain("Jul '25 → Sep '25");
		expect(svg).toContain("npx termheat play moeen-mahmud");
		// No emoji — resvg renders emoji text runs as tofu.
		expect(svg).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
	});

	test("a lost run darkens unreached months", () => {
		const level = makeLevel();
		const w = makeRun(level, { status: "over", checkpoint: 1, deaths: 2, deathLog: [40, 45], deathColumn: 45 });
		const svg = renderRunCard({ username: "moeen-mahmud", w, level, theme: themeFor("github") });
		expect(svg).toContain("out of hearts in Aug '25");
		expect(svg.match(/#21262d/g)).toHaveLength(1); // Sep never reached
		expect(svg.match(/#f85149/g)).toHaveLength(1); // Aug bled twice
	});

	test("the username is XML-escaped everywhere it appears", () => {
		const level = makeLevel();
		const w = makeRun(level, { status: "won" });
		const svg = renderRunCard({ username: "a<b&c", w, level, theme: themeFor("github") });
		expect(svg).not.toContain("a<b&c");
		expect(svg).toContain("a&lt;b&amp;c");
	});
});
