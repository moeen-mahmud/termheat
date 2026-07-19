/**
 * The playable glyph roster. In terminal tradition the player has been a
 * glyph since rogue drew `@` in 1980 — so instead of pixels, you pick a
 * character with character. Every glyph is a single-width BMP codepoint from
 * the same font territory the game already relies on (`♥♦⚑░`), so anything
 * that renders the level renders the player.
 *
 * Identity is deterministic by default: your username hashes to your glyph,
 * the way GitHub identicons work — no config needed for "that one is me".
 * [tab] on the title screen cycles the roster, and the pick persists to
 * ~/.termheat.json under `sprite`.
 */

export interface PlayerSprite {
	/** Stable id — what `~/.termheat.json` stores. */
	name: string;
	glyph: string;
	/** Title-screen flavor ("you play as ☻ the smiley"). */
	title: string;
}

export const SPRITES: readonly PlayerSprite[] = [
	{ name: "rogue", glyph: "@", title: "the rogue" },
	{ name: "smiley", glyph: "☻", title: "the smiley" },
	{ name: "knight", glyph: "♞", title: "the knight" },
	{ name: "omega", glyph: "Ω", title: "the omega" },
	{ name: "bolt", glyph: "ϟ", title: "the bolt" },
	{ name: "serpent", glyph: "§", title: "the serpent" },
	{ name: "coin", glyph: "¤", title: "the coin" },
	{ name: "note", glyph: "♪", title: "the note" },
] as const;

/** 32-bit FNV-1a — tiny, deterministic, and plenty for picking a glyph. */
function fnv1a(text: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

/**
 * The player's sprite: an explicit pick by name (from config) wins; anything
 * else — including a stale name from an older roster — falls back to the
 * username hash, so every user always has a stable default.
 */
export function spriteFor(username: string, name?: string): PlayerSprite {
	const picked = SPRITES.find((s) => s.name === name);
	return picked ?? SPRITES[fnv1a(username.toLowerCase()) % SPRITES.length]!;
}

/** The next roster entry, wrapping — the [tab] cycle on the title screen. */
export function nextSprite(current: PlayerSprite): PlayerSprite {
	const at = SPRITES.findIndex((s) => s.name === current.name);
	return SPRITES[(at + 1) % SPRITES.length]!;
}
