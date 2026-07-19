import { describe, expect, test } from "bun:test";
import { deathLine, prettyDate, shameLine } from "@/lib/shame";

describe("shameLine", () => {
	test("an empty year gets the blank-canvas line, not a nag", () => {
		expect(shameLine(null)).toContain("404");
	});

	test("shipping today earns praise, not silence", () => {
		expect(shameLine(0)).toContain("Zero shame");
	});

	test("one idle day is the gentlest tier", () => {
		expect(shameLine(1)).toContain("🐌");
		expect(shameLine(1)).not.toContain("1 days"); // no clumsy pluralization
	});

	test("escalates through the tiers at their boundaries", () => {
		expect(shameLine(3)).toContain("🐌");
		expect(shameLine(4)).toContain("🥶");
		expect(shameLine(6)).toContain("🥶");
		expect(shameLine(7)).toContain("🕸️");
		expect(shameLine(13)).toContain("🕸️");
		expect(shameLine(14)).toContain("💀");
		expect(shameLine(29)).toContain("💀");
		expect(shameLine(30)).toContain("🪦");
		expect(shameLine(365)).toContain("🪦");
	});

	test("nag tiers state the exact idle-day count", () => {
		for (const days of [2, 5, 10, 20, 100]) {
			expect(shameLine(days)).toContain(`${days} days`);
		}
	});

	test("never returns an empty string — a line or null, nothing between", () => {
		for (const input of [null, 0, 1, 2, 7, 50]) {
			const line = shameLine(input);
			expect(line === null || line.length > 0).toBe(true);
		}
	});
});

describe("deathLine", () => {
	test("without shame the line is dry and factual", () => {
		expect(deathLine("2026-03-14", "pit", false)).toBe("March 14th: a zero-day swallowed you");
		expect(deathLine("2026-03-14", "wall", false)).toBe("March 14th: you ran into a wall of commits");
	});

	test("shame lines are dated and deterministic — same day, same roast", () => {
		const line = deathLine("2026-03-14", "pit", true);
		expect(line).toContain("March 14th");
		expect(deathLine("2026-03-14", "pit", true)).toBe(line);
		// Different dates can pick different lines, but all stay dated.
		expect(deathLine("2026-07-01", "wall", true)).toContain("July 1st");
	});

	test("ordinal suffixes survive the awkward teens", () => {
		expect(prettyDate("2026-01-01")).toBe("January 1st");
		expect(prettyDate("2026-08-22")).toBe("August 22nd");
		expect(prettyDate("2026-04-03")).toBe("April 3rd");
		expect(prettyDate("2026-11-11")).toBe("November 11th");
		expect(prettyDate("2026-12-13")).toBe("December 13th");
		expect(prettyDate("2026-05-31")).toBe("May 31st");
	});
});
