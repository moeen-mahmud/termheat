import { describe, expect, test } from "bun:test";
import { THEMES } from "@/lib/const";
import { FIRE_RAMP, scaleHex, themeFor } from "@/themes";

const HEX = /^#[0-9a-f]{6}$/;

describe("themeFor", () => {
	test("every declared theme name resolves to a full palette", () => {
		for (const name of THEMES) {
			const theme = themeFor(name);
			expect(theme.name).toBe(name);
			expect(theme.levels).toHaveLength(5);
			for (const color of theme.levels) expect(color).toMatch(HEX);
			expect(theme.accent).toMatch(HEX);
		}
	});
});

describe("FIRE_RAMP", () => {
	test("is valid hex, oldest → newest", () => {
		for (const color of FIRE_RAMP) expect(color).toMatch(HEX);
	});
});

describe("scaleHex", () => {
	test("factor 1 leaves the color unchanged", () => {
		expect(scaleHex("#39d353", 1)).toBe("#39d353");
	});

	test("factor 0 is black", () => {
		expect(scaleHex("#39d353", 0)).toBe("#000000");
	});

	test("scales each channel proportionally", () => {
		expect(scaleHex("#ff8040", 0.5)).toBe("#804020");
	});

	test("clamps out-of-range factors", () => {
		expect(scaleHex("#336699", 2)).toBe("#336699");
		expect(scaleHex("#336699", -1)).toBe("#000000");
	});
});
