import { describe, expect, test } from "bun:test";
import type { ContributionDay } from "@/lib/types";
import { defaultSvgFilename, escapeXml, monthLabels, renderSvgCard } from "@/svg";
import { buildHeatmap } from "@/heatmap";
import { themeFor } from "@/themes";
import { FIRE_RAMP } from "@/themes";

const TODAY = "2026-07-15";

/** days.length consecutive days ending at TODAY, counts supplied per-day. */
function daysEndingToday(counts: number[]): ContributionDay[] {
	const end = Date.parse(`${TODAY}T00:00:00Z`);
	return counts.map((count, i) => {
		const date = new Date(end - (counts.length - 1 - i) * 86_400_000).toISOString().slice(0, 10);
		return { date, count };
	});
}

const theme = themeFor("github");

describe("renderSvgCard", () => {
	const days = daysEndingToday([0, 2, 5, 0, 1, 8, 3]);
	const svg = renderSvgCard({ username: "octocat", days, theme, today: TODAY });

	test("is a self-contained svg document", () => {
		expect(svg.startsWith("<svg ")).toBe(true);
		expect(svg).toContain(`xmlns="http://www.w3.org/2000/svg"`);
		expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
		// no external fetches — required for GitHub's camo proxy
		expect(svg).not.toMatch(/<image|href="http|url\(/);
	});

	test("renders one rect per day plus chrome", () => {
		const dayRects = svg.match(/<title>\d{4}-\d{2}-\d{2}:/g) ?? [];
		expect(dayRects.length).toBe(days.length);
	});

	test("includes username, total, and credit line", () => {
		expect(svg).toContain("@octocat");
		expect(svg).toContain("19 contributions in the last year");
		expect(svg).toContain("made with npx termheat");
	});

	test("streak cells burn in the fire ramp, not the theme palette", () => {
		// counts end [1, 8, 3] and today has 3 → current streak spans 3 days
		expect(svg).toContain("3 day streak");
		expect(svg).toContain(`class="fire"`);
		const firesInSvg = FIRE_RAMP.filter((hex) => svg.includes(hex));
		expect(firesInSvg.length).toBeGreaterThan(0);
	});

	test("streak badge uses a vector flame, never the emoji", () => {
		// resvg and other static renderers tofu whole text runs containing emoji
		expect(svg).not.toContain("🔥");
		expect(svg).toContain("<path fill=");
	});

	test("grid visibility never depends on animation running", () => {
		// hidden state must live in @keyframes (fill-mode), not on .wk itself,
		// so static renderers show the finished grid instead of a blank card
		expect(svg).not.toMatch(/\.wk\{[^}]*opacity:0/);
		expect(svg).toContain("animation:reveal");
		expect(svg).toMatch(/@keyframes reveal\{from\{opacity:0\}/);
	});

	test("embeds the reveal + flame animation as CSS", () => {
		expect(svg).toContain("<style>");
		expect(svg).toContain("@keyframes reveal");
		expect(svg).toContain("@keyframes flame");
		expect(svg).toContain("prefers-reduced-motion");
	});

	test("animate: false ships a static frame with no style block", () => {
		const still = renderSvgCard({ username: "octocat", days, theme, animate: false, today: TODAY });
		expect(still).not.toContain("<style>");
		expect(still).not.toContain("animation-delay");
		expect(still).toContain("@octocat");
	});

	test("no streak → friendly copy instead of 🔥 0", () => {
		const idle = renderSvgCard({
			username: "octocat",
			days: daysEndingToday([3, 0, 0]),
			theme,
			today: TODAY,
		});
		expect(idle).toContain("no current streak");
		expect(idle).not.toContain(`class="fire"`);
	});

	test("escapes hostile usernames", () => {
		const evil = renderSvgCard({
			username: `<script>"&`,
			days,
			theme,
			today: TODAY,
		});
		expect(evil).not.toContain("<script>");
		expect(evil).toContain("&lt;script&gt;&quot;&amp;");
	});
});

describe("monthLabels", () => {
	test("labels each month once at its first column", () => {
		// ~120 days ending 2026-07-15 spans mid-Mar→Jul
		const { weeks } = buildHeatmap(daysEndingToday(Array(120).fill(1)));
		const labels = monthLabels(weeks);
		const names = labels.map((l) => l.label);
		expect(names).toEqual(["Mar", "Apr", "May", "Jun", "Jul"]);
		// strictly increasing column positions, at least 3 apart
		for (let i = 1; i < labels.length; i++) {
			expect(labels[i]!.week - labels[i - 1]!.week).toBeGreaterThanOrEqual(3);
		}
	});

	test("drops a label that would crowd its neighbor", () => {
		// 10 days spanning a month boundary: two months, second starts 1-2 columns in
		const { weeks } = buildHeatmap(daysEndingToday(Array(10).fill(1)));
		const labels = monthLabels(weeks);
		expect(labels.length).toBe(1);
	});
});

describe("escapeXml", () => {
	test("escapes the four XML metacharacters", () => {
		expect(escapeXml(`a<b>&"c`)).toBe("a&lt;b&gt;&amp;&quot;c");
	});
});

describe("defaultSvgFilename", () => {
	test("names the file after the user", () => {
		expect(defaultSvgFilename("octocat")).toBe("termheat-octocat.svg");
	});
});
