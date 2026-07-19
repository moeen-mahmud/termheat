import { APP_NAME, MONTHS } from "@/lib/const";
import type { EngineState } from "@/lib/engine";
import type { Theme } from "@/lib/schema";
import { type MonthGrade, monthGrades, outcomeLine, yearSpan } from "@/lib/share";
import type { GameLevel } from "@/lib/types";
import { BG, BORDER, escapeXml, FONT, MUTED, TEXT } from "@/svg";
import { FIRE_RAMP, scaleHex } from "@/themes";

/**
 * The `termheat play --export` run card: the Wordle-style share string as an
 * SVG, in the same GitHub dark-dimmed chrome as the v1.1 heatmap card. Pure
 * string-in/string-out like renderSvgCard — export.ts owns disk and PNG.
 *
 * No emoji anywhere: resvg's font fallback renders emoji runs as tofu, so
 * grades are colored tiles and the stats are plain text (the same reason
 * svg.ts draws its flame as a path).
 */

/** GitHub's own palette for the grades the share string spells with emoji. */
const GRADE_FILL: Record<MonthGrade, string> = {
	clean: "#2ea043",
	scraped: "#d29922",
	bloody: "#f85149",
	unreached: "#21262d",
};

const PAD = 16;
const TILE = 26;
const TILES_TOP = 46;
const LABEL_BASELINE = TILES_TOP + TILE + 13;
// The level itself, drawn under the month tiles as a miniature game scene —
// terrain, flames, flags, the finish pillar, and the player where the run
// ended. The card is wide enough to give every day at least DAY_MIN_PX.
const SCENE_TOP = LABEL_BASELINE + 12;
const ROW_PX = 5; // px per terrain height row (heights are 0–4)
const SKY_PX = 14; // headroom above the tallest terrain: flags, flames, player
const SCENE_H = SKY_PX + 4 * ROW_PX;
const STATS_BASELINE = SCENE_TOP + SCENE_H + 20;
const FOOTER_BASELINE = STATS_BASELINE + 26;
const DAY_MIN_PX = 2;

export interface RunCardOptions {
	username: string;
	w: EngineState;
	level: GameLevel;
	theme: Theme;
}

export function renderRunCard({ username, w, level, theme }: RunCardOptions): string {
	const grades = monthGrades(w, level);
	const days = level.columns.length;
	const width = Math.max(420, PAD * 2 + days * DAY_MIN_PX);
	const dayW = (width - PAD * 2) / days;
	const height = FOOTER_BASELINE + PAD;
	const user = escapeXml(username);

	// Month tiles sit above their checkpoint's column in the scene, so the
	// grade row doubles as a map: the tile IS where that month starts below.
	// Neighbors keep a minimum spacing — a mid-month spawn (Jul 19) puts the
	// first two checkpoints under a month apart, and the tiles must not merge.
	let prevX = Number.NEGATIVE_INFINITY;
	const tiles = grades
		.map((grade, i) => {
			const cp = level.checkpoints[i];
			const month = MONTHS[cp?.month ?? 0] ?? "";
			let x = Math.min(PAD + (cp?.column ?? 0) * dayW, width - PAD - TILE);
			x = Math.max(x, prevX + TILE + 4);
			prevX = x;
			return (
				`<rect x="${x.toFixed(1)}" y="${TILES_TOP}" width="${TILE}" height="${TILE}" rx="4" fill="${GRADE_FILL[grade]}"><title>${month}: ${grade}</title></rect>` +
				`<text x="${(x + TILE / 2).toFixed(1)}" y="${LABEL_BASELINE}" text-anchor="middle" fill="${MUTED}" font-size="9">${month}</text>`
			);
		})
		.join("\n");

	const deaths = `${w.deaths} ${w.deaths === 1 ? "death" : "deaths"}`;
	const flames = `${w.flames}/${level.flameTotal} flames`;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="termheat play run of ${user}">
<rect width="${width}" height="${height}" rx="6" fill="${BG}" stroke="${BORDER}"/>
<text x="${PAD}" y="${PAD + 16}" ${FONT}><tspan fill="${TEXT}" font-size="14" font-weight="600">@${user}</tspan><tspan fill="${MUTED}" font-size="12" dx="8">played their year</tspan></text>
<text x="${width - PAD}" y="${PAD + 16}" text-anchor="end" fill="${MUTED}" font-size="12" ${FONT}>${yearSpan(level)}</text>
${tiles}
${gameScene(w, level, theme, dayW)}
<text x="${PAD}" y="${STATS_BASELINE}" ${FONT}><tspan fill="${theme.accent}" font-size="13" font-weight="600">${outcomeLine(w, level)}</tspan><tspan fill="${MUTED}" font-size="12" dx="8">${deaths} · ${flames}</tspan></text>
<text x="${PAD}" y="${FOOTER_BASELINE}" ${FONT}><tspan fill="${MUTED}" font-size="11">beat this year:</tspan><tspan fill="${theme.accent}" font-size="11" font-family="ui-monospace, monospace" dx="6">npx ${APP_NAME} play ${user}</tspan></text>
</svg>
`;
}

/**
 * The level as a miniature of the game itself, not a bar chart: terrain at
 * its repaired height in honest level colors, ghost bridges as thin floating
 * slabs, pit fluid per tileset, the flames still out there, checkpoint flags,
 * the finish pillar, a red scar per death column — and you, standing where
 * the run ended. This is what makes the card recognizably YOUR run.
 */
function gameScene(w: EngineState, level: GameLevel, theme: Theme, dayW: number): string {
	const days = level.columns.length;
	if (days === 0) return "";
	const baseY = SCENE_TOP + SCENE_H;
	const won = w.status === "won";
	const ghost = scaleHex(theme.levels[2], 0.5);
	const fluid = theme.name === "fire" ? FIRE_RAMP[0] : theme.name === "ocean" ? theme.levels[2] : ghost;
	const dayX = (col: number) => PAD + col * dayW;
	const topOf = (col: number) => baseY - Math.max(0, Math.min(4, level.columns[col]?.height ?? 0)) * ROW_PX;

	const terrain = level.columns
		.map((cell, i) => {
			const x = dayX(i).toFixed(2);
			// +0.4 overdraw closes the sub-pixel seams between neighboring bars.
			const wd = (dayW + 0.4).toFixed(2);
			if (cell.height <= 0) return `<rect x="${x}" y="${baseY - 2}" width="${wd}" height="2" fill="${fluid}"/>`;
			const barH = Math.min(4, cell.height) * ROW_PX;
			// Ghost bridges are thin floating slabs in the game — same here.
			if (cell.ghost) return `<rect x="${x}" y="${baseY - barH}" width="${wd}" height="2" fill="${ghost}"/>`;
			return `<rect x="${x}" y="${baseY - barH}" width="${wd}" height="${barH}" fill="${theme.levels[cell.level]}"/>`;
		})
		.join("");

	// Flames still burning = the ones this run didn't collect. A ♦ in the
	// terminal, a rotated square here — an invitation to run it again.
	const flames = level.columns
		.map((cell, i) => {
			if (!cell.flame || w.collected.has(i)) return "";
			const cx = dayX(i) + dayW / 2;
			const cy = topOf(i) - 4;
			// Dimmed so a flame-dense year stays a backdrop, not confetti — the
			// player, flags, and scars must win the foreground.
			return `<rect x="${(cx - 1.3).toFixed(2)}" y="${(cy - 1.3).toFixed(2)}" width="2.6" height="2.6" fill="${FIRE_RAMP[2]}" opacity="0.55" transform="rotate(45 ${cx.toFixed(2)} ${cy.toFixed(2)})"/>`;
		})
		.join("");

	// Checkpoint flags (the spawn needs none — you start standing on it):
	// accent once passed, dim ahead, exactly like the in-game ⚑.
	const progressCol = won ? (level.checkpoints.at(-1)?.column ?? 0) : (level.checkpoints[w.checkpoint]?.column ?? 0);
	const flags = level.checkpoints
		.slice(1)
		.map((cp) => {
			const x = dayX(cp.column).toFixed(2);
			const top = topOf(cp.column) - 9;
			// A light pole reads as structure against any tileset (fire terrain
			// and a fire-theme accent are the same hue); only the pennant grades.
			const color = cp.column <= progressCol ? theme.accent : ghost;
			return (
				`<rect x="${x}" y="${top}" width="1" height="9" fill="${MUTED}"/>` +
				`<path d="M${x} ${top} l5 2.2 l-5 2.2 Z" fill="${color}"/>`
			);
		})
		.join("");

	// Today's column — the ░ shimmer pillar the whole run points at.
	const finish = `<rect x="${dayX(level.finishColumn).toFixed(2)}" y="${SCENE_TOP}" width="${Math.max(2, dayW).toFixed(2)}" height="${SCENE_H}" fill="${theme.accent}" opacity="0.5"/>`;

	// One scar per death column (a repeated column still reads as one).
	const ticks = [...new Set(w.deathLog)]
		.map((col) => {
			const date = level.columns[col]?.date ?? "";
			return `<rect x="${dayX(col).toFixed(2)}" y="${SCENE_TOP + 3}" width="1.5" height="${SCENE_H - 3}" fill="#f85149"><title>died here: ${date}</title></rect>`;
		})
		.join("");

	// The player, drawn last so nothing covers them: bright at the finish on a
	// win, ember-red at the death column on a loss (the game's dead-sprite
	// color). A BG outline and a "you are here" pin keep the sprite findable
	// even on a fire-theme skyline that shares its hue.
	const endCol = won ? level.finishColumn : (w.deathColumn ?? w.deathLog.at(-1) ?? 0);
	const cx = dayX(endCol) + dayW / 2;
	const px = cx - 2.5;
	const py = topOf(endCol) - 7;
	const player =
		`<g><path d="M${(cx - 2.5).toFixed(2)} ${py - 7} l5 0 l-2.5 4 Z" fill="${TEXT}"/>` +
		`<rect x="${px.toFixed(2)}" y="${py}" width="5" height="7" rx="1" fill="${won ? FIRE_RAMP[3] : FIRE_RAMP[0]}" stroke="${BG}" stroke-width="1">` +
		`<title>${won ? "you — made it" : "you — out of hearts here"}</title></rect>` +
		`<rect x="${(cx + 0.6).toFixed(2)}" y="${py + 2}" width="1.2" height="1.2" fill="${BG}"/></g>`;

	return `<g><rect x="${PAD}" y="${baseY}" width="${days * dayW}" height="1" fill="${BORDER}"/>${terrain}${flames}${flags}${finish}${ticks}${player}</g>`;
}
