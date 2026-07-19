import { FULL_MONTHS } from "@/lib/const";
import { GAME_EMOS } from "@/lib/icons";

/**
 * Gentle shame mode (--shame): one line derived from how long the user has
 * been idle.
 *
 * The curve escalates slowly on purpose — day one is a rest day, not a crime.
 * Ship-days get a small praise line instead of silence so the flag stays fun
 * to keep enabled (a carrot keeps the stick reachable).
 *
 * @param idleDays whole days since the last contribution — 0 means they
 *   contributed today, null means no contributions anywhere in the visible
 *   year (see daysSinceLastContribution).
 * @returns the line to display, or null to display nothing.
 */
export function shameLine(idleDays: number | null): string | null {
	if (idleDays === null) return `${GAME_EMOS.dyno} 404 contributions found — this year's grid is a blank canvas.`;
	if (idleDays === 0) return `${GAME_EMOS.sparkles} Shipped today. Zero shame detected.`;
	if (idleDays === 1) return `${GAME_EMOS.snail} Quiet for a day — the keyboard misses you.`;
	if (idleDays <= 3) return `${GAME_EMOS.snail} You haven't pushed in ${idleDays} days. The grid is cooling…`;
	if (idleDays <= 6) return `${GAME_EMOS.cold} ${idleDays} days idle. Your green squares are fading to gray.`;
	if (idleDays <= 13) return `${GAME_EMOS.spiderWeb} ${idleDays} days. Cobwebs are forming on \`git push\`.`;
	if (idleDays <= 29) return `${GAME_EMOS.skull} ${idleDays} days of silence. \`git blame\` finds only ghosts.`;
	return `${GAME_EMOS.headstone} ${idleDays} days. Somewhere, an unfinished branch mourns you.`;
}

// --- `termheat play` death lines ---

const PIT_LINES = [
	(d: string) => `${d}: you shipped nothing, and today it shipped you.`,
	(d: string) => `${d}: zero commits, zero ground. The math checks out.`,
	(d: string) => `${d}: turns out rest days have gravity.`,
	(d: string) => `${d}: the calendar left a hole. You found it.`,
] as const;

const WALL_LINES = [
	(d: string) => `${d}: crushed by your own productivity. Poetic.`,
	(d: string) => `${d}: you sprinted face-first into a very good day.`,
	(d: string) => `${d}: past-you built that wall one commit at a time.`,
	(d: string) => `${d}: some days tower over others. Jump next time.`,
] as const;

const DEATH_LINES = ["a zero-day swallowed you", "you ran into a wall of commits"] as const;

/**
 * The one-liner for a death screen, dated with the day that did it.
 *
 * Shame mode gets the roast; without it the line stays dry and factual
 * (shame is opt-in, per the standing principles). The pick is deterministic —
 * hashed from the date, not random — so the same day always roasts you the
 * same way and the engine's same-inputs-same-run property holds end to end.
 */
export function deathLine(dateISO: string, cause: "pit" | "wall", shame: boolean): string {
	const pretty = prettyDate(dateISO);
	if (!shame) {
		return cause === "pit" ? `${pretty}: ${DEATH_LINES[0]}` : `${pretty}: ${DEATH_LINES[1]}`;
	}
	const pool = cause === "pit" ? PIT_LINES : WALL_LINES;
	const seed = Number(dateISO.slice(8, 10)) + Number(dateISO.slice(5, 7));
	return pool[seed % pool.length]!(pretty);
}

/** "2026-03-14" → "March 14th" — a roast needs the full month's gravitas. */
export function prettyDate(dateISO: string): string {
	const day = Number(dateISO.slice(8, 10));
	const month = FULL_MONTHS[Number(dateISO.slice(5, 7)) - 1] ?? "";
	const suffix =
		day % 100 >= 11 && day % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][day % 10 > 3 ? 0 : day % 10] ?? "th");
	return `${month} ${day}${suffix}`;
}
