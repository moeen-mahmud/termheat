import { describe, expect, test } from "bun:test";
import { nextSprite, SPRITES, spriteFor } from "@/lib/sprites";

describe("SPRITES roster", () => {
	test("names and glyphs are unique, glyphs are single-width chars", () => {
		expect(new Set(SPRITES.map((s) => s.name)).size).toBe(SPRITES.length);
		expect(new Set(SPRITES.map((s) => s.glyph)).size).toBe(SPRITES.length);
		for (const s of SPRITES) {
			// One UTF-16 code unit = BMP and never an emoji surrogate pair —
			// the terminal-width safety line the whole game renders inside.
			expect(s.glyph.length).toBe(1);
		}
	});
});

describe("spriteFor", () => {
	test("the username hash picks a stable default", () => {
		const pick = spriteFor("torvalds");
		expect(spriteFor("torvalds")).toBe(pick);
		expect(spriteFor("ToRvAlDs")).toBe(pick); // usernames are case-insensitive
		expect(SPRITES).toContain(pick);
	});

	test("different users can land on different glyphs", () => {
		const picks = new Set(
			["torvalds", "octocat", "defunkt", "sindresorhus", "moeen-mahmud", "vadimdemedes"].map(
				(u) => spriteFor(u).name,
			),
		);
		expect(picks.size).toBeGreaterThan(1);
	});

	test("a config pick by name wins over the hash", () => {
		expect(spriteFor("torvalds", "knight").glyph).toBe("♞");
	});

	test("a stale roster name falls back to the hash, never crashes", () => {
		expect(spriteFor("torvalds", "dragon-removed-in-v3")).toBe(spriteFor("torvalds"));
	});
});

describe("nextSprite", () => {
	test("cycles the whole roster and wraps around", () => {
		let s = SPRITES[0]!;
		const seen = [s.name];
		for (let i = 1; i < SPRITES.length; i++) {
			s = nextSprite(s);
			seen.push(s.name);
		}
		expect(new Set(seen).size).toBe(SPRITES.length);
		expect(nextSprite(s)).toBe(SPRITES[0]!);
	});
});
