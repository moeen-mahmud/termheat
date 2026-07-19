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
const STATS_BASELINE = LABEL_BASELINE + 24;
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
<text x="${PAD}" y="${STATS_BASELINE}" ${FONT}><tspan fill="${theme.accent}" font-size="13" font-weight="600">${outcomeLine(w, level)}</tspan><tspan fill="${MUTED}" font-size="12" dx="8">${deaths} · ${flames}</tspan></text>
<text x="${PAD}" y="${FOOTER_BASELINE}" ${FONT}><tspan fill="${MUTED}" font-size="11">beat this year:</tspan><tspan fill="${theme.accent}" font-size="11" font-family="ui-monospace, monospace" dx="6">npx ${APP_NAME} play ${user}</tspan></text>
</svg>
`;
}
