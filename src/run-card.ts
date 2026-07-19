import { APP_NAME, MONTHS } from "@/lib/const";
import type { EngineState } from "@/lib/engine";
import type { Theme } from "@/lib/schema";
import { type MonthGrade, monthGrades, outcomeLine, yearSpan } from "@/lib/share";
import type { GameLevel } from "@/lib/types";
import { BG, BORDER, escapeXml, FONT, MUTED, TEXT } from "@/svg";

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
const TILE_GAP = 6;
const TILES_TOP = 46;
const LABEL_BASELINE = TILES_TOP + TILE + 13;
// The level itself, drawn under the month tiles: the terrain the run was
// actually played on, one thin bar per day, plus a red tick per death.
const TERRAIN_TOP = LABEL_BASELINE + 10;
const TERRAIN_ROW = 4; // px per terrain height row (heights are 0–4)
const TERRAIN_H = 4 * TERRAIN_ROW;
const STATS_BASELINE = TERRAIN_TOP + TERRAIN_H + 22;
const FOOTER_BASELINE = STATS_BASELINE + 26;

export interface RunCardOptions {
	username: string;
	w: EngineState;
	level: GameLevel;
	theme: Theme;
}

export function renderRunCard({ username, w, level, theme }: RunCardOptions): string {
	const grades = monthGrades(w, level);
	const width = Math.max(420, PAD * 2 + grades.length * (TILE + TILE_GAP) - TILE_GAP);
	const height = FOOTER_BASELINE + PAD;
	const user = escapeXml(username);
	const terrain = terrainStrip(w, level, theme, width);

	const tiles = grades
		.map((grade, i) => {
			const x = PAD + i * (TILE + TILE_GAP);
			const month = MONTHS[level.checkpoints[i]?.month ?? 0] ?? "";
			return (
				`<rect x="${x}" y="${TILES_TOP}" width="${TILE}" height="${TILE}" rx="4" fill="${GRADE_FILL[grade]}"><title>${month}: ${grade}</title></rect>` +
				`<text x="${x + TILE / 2}" y="${LABEL_BASELINE}" text-anchor="middle" fill="${MUTED}" font-size="9">${month}</text>`
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
${terrain}
<text x="${PAD}" y="${STATS_BASELINE}" ${FONT}><tspan fill="${theme.accent}" font-size="13" font-weight="600">${outcomeLine(w, level)}</tspan><tspan fill="${MUTED}" font-size="12" dx="8">${deaths} · ${flames}</tspan></text>
<text x="${PAD}" y="${FOOTER_BASELINE}" ${FONT}><tspan fill="${MUTED}" font-size="11">beat this year:</tspan><tspan fill="${theme.accent}" font-size="11" font-family="ui-monospace, monospace" dx="6">npx ${APP_NAME} play ${user}</tspan></text>
</svg>
`;
}

/**
 * The level itself as a strip: one bar per day at its repaired height, in the
 * theme's honest level colors (ghost bridges dim, pits gaps over a baseline),
 * with a red tick where each death happened. This is what makes the card
 * recognizably YOUR year, not a generic score screen.
 */
function terrainStrip(w: EngineState, level: GameLevel, theme: Theme, width: number): string {
	const days = level.columns.length;
	if (days === 0) return "";
	const innerW = width - PAD * 2;
	const dayW = innerW / days;
	const baseY = TERRAIN_TOP + TERRAIN_H;

	const bars = level.columns
		.map((cell, i) => {
			const h = Math.max(0, Math.min(4, cell.height));
			if (h === 0) return "";
			// +0.4 overdraw closes the sub-pixel seams between neighboring bars.
			const barH = h * TERRAIN_ROW;
			const fill = cell.ghost ? BORDER : theme.levels[cell.level];
			return `<rect x="${(PAD + i * dayW).toFixed(2)}" y="${baseY - barH}" width="${(dayW + 0.4).toFixed(2)}" height="${barH}" fill="${fill}"/>`;
		})
		.filter(Boolean)
		.join("");

	// One tick per death column (a repeated column still reads as one scar).
	const ticks = [...new Set(w.deathLog)]
		.map((col) => {
			const date = level.columns[col]?.date ?? "";
			return `<rect x="${(PAD + col * dayW).toFixed(2)}" y="${TERRAIN_TOP - 3}" width="1.5" height="${TERRAIN_H + 3}" fill="#f85149"><title>died here: ${date}</title></rect>`;
		})
		.join("");

	return `<g><rect x="${PAD}" y="${baseY}" width="${innerW}" height="1" fill="${BORDER}"/>${bars}${ticks}</g>`;
}
