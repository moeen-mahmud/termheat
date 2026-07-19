import { describe, expect, test } from "bun:test";
import { shameLine } from "@/lib/shame";

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
