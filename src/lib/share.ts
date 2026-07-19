import { MONTHS } from "@/lib/const";
import type { EngineState } from "@/lib/engine";
import { GAME_EMOS } from "@/lib/icons";
import type { GameLevel } from "@/lib/types";

/**
 * The Wordle-style end-of-run share card. Zero backend by design: the card is
 * plain text the player copies out of the terminal, and its last line IS the
 * replay command — any public username is a level, so "my year is harder than
 * yours" ships inside every paste.
 *
 * Pure data-in/data-out (no Ink) so every line is bun-testable, and so Step
 * 4b can reuse it for the `--export` run card.
 */

/**
 * One grade per month checkpoint, Wordle-style by deaths:
 * clean clear 🟩 · one death 🟨 · a struggle 🟥 · never reached ⬛.
 * The terminal card maps grades to emoji; the SVG run card maps the same
 * grades to tile colors — one judgement, two skins.
 */
export type MonthGrade = keyof typeof GRADE;

const GRADE = {
	clean: "🟩",
	scraped: "🟨",
	bloody: "🟥",
	unreached: "⬛",
} as const;

export function monthGrades(w: EngineState, level: GameLevel): MonthGrade[] {
	const checkpoints = level.checkpoints;
	// A death belongs to the last checkpoint at or before its column.
	const deathsPerMonth = checkpoints.map(() => 0);
	for (const col of w.deathLog) {
		let owner = 0;
		for (let i = 0; i < checkpoints.length; i++) {
			if (checkpoints[i]!.column <= col) owner = i;
		}
		deathsPerMonth[owner]!++;
	}
	// Winning means every month was reached; otherwise the checkpoint index is
	// exactly how far the run got (it only ever advances).
	const reached = w.status === "won" ? checkpoints.length - 1 : w.checkpoint;
	return checkpoints.map((_, i) => {
		if (i > reached) return "unreached";
		const deaths = deathsPerMonth[i]!;
		return deaths === 0 ? "clean" : deaths === 1 ? "scraped" : "bloody";
	});
}

export function monthRow(w: EngineState, level: GameLevel): string {
	return monthGrades(w, level)
		.map((grade) => GRADE[grade])
		.join("");
}

/** 48 → "48s", 83 → "1m23s" — compact enough to live inside one shared line. */
export function fmtRunTime(seconds: number): string {
	const whole = Math.round(seconds);
	if (whole < 60) return `${whole}s`;
	return `${Math.floor(whole / 60)}m${String(whole % 60).padStart(2, "0")}s`;
}

/** "2025-07-19" → "Jul '25" */
export const monthYear = (dateISO?: string): string =>
	dateISO ? `${MONTHS[Number(dateISO.slice(5, 7)) - 1] ?? ""} '${dateISO.slice(2, 4)}` : "";

/** "cleared in 48s" or "out of hearts in Aug '25" — shared by both cards. */
export function outcomeLine(w: EngineState, level: GameLevel): string {
	return w.status === "won"
		? `cleared in ${fmtRunTime(w.runS)}`
		: `out of hearts in ${monthYear(level.columns[w.deathColumn ?? 0]?.date)}`;
}

/** "Jul '25 → Jul '26" — the span the level covers. */
export function yearSpan(level: GameLevel): string {
	return `${monthYear(level.columns[0]?.date)} → ${monthYear(level.columns.at(-1)?.date)}`;
}

export function shareCard(w: EngineState, level: GameLevel, username: string): string {
	const span = yearSpan(level);
	const outcome = outcomeLine(w, level);
	return [
		`termheat · ${username}'s year · ${span}`,
		monthRow(w, level),
		`${outcome} · ${GAME_EMOS.skull} ${w.deaths} · ${GAME_EMOS.flame} ${w.flames}/${level.flameTotal}`,
		`npx termheat play ${username}`,
	].join("\n");
}
