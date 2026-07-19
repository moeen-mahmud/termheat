import { buildHeatmap } from "@/heatmap";
import { APP_NAME, MONTHS } from "@/lib/const";
import type { Theme } from "@/lib/schema";
import type { ContributionDay, Week } from "@/lib/types";
import { currentStreakDates } from "@/streak";
import { FIRE_RAMP } from "@/themes";

/**
 * Renders the shareable SVG card. Pure string-in/string-out — no DOM, no Ink —
 * so it stays unit-testable and identical under Bun and Node.
 *
 * Animation ships as CSS inside the SVG (not SMIL): a chronological reveal
 * wipe (per-week `animation-delay`, echoing the TUI's wipe) and a flame
 * shimmer on streak cells. GitHub READMEs serve SVGs through camo as `<img>`,
 * where embedded CSS animations still run but scripts and external resources
 * don't — which is exactly the constraint this stays inside.
 */
export interface SvgCardOptions {
	username: string;
	days: ContributionDay[];
	theme: Theme;
	/** false = no <style> block at all; the card renders as its final frame. */
	animate?: boolean;
	/** Injectable for deterministic tests; defaults to the local today. */
	today?: string;
}

// Grid geometry (px). GitHub's own calendar uses 10/3, kept for familiarity.
const CELL = 10;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 32; // gutter for weekday labels
const HEADER = 34; // username + streak line
const MONTH_ROW = 14;
const FOOTER = 24; // credit line
const PAD = 12;

// Card chrome, independent of theme: GitHub dark-dimmed canvas. Exported so
// the play run card (run-card.ts) shares the exact same skin.
export const BG = "#0d1117";
export const BORDER = "#30363d";
export const TEXT = "#c9d1d9";
export const MUTED = "#8b949e";

export const FONT = `font-family="-apple-system, 'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif"`;

const REVEAL_MS = 450; // per-column fade duration
const REVEAL_STAGGER_MS = 22; // delay step between columns (~1.2s full wipe)
const FLAME_MS = 2400;
const FLAME_STAGGER_MS = 180; // per-cell phase offset, like the TUI flicker

export function renderSvgCard(opts: SvgCardOptions): string {
	const { username, days, theme, animate = true } = opts;
	const { weeks, total } = buildHeatmap(days);
	const streakDates = opts.today ? currentStreakDates(days, opts.today) : currentStreakDates(days);
	const streakIndex = new Map(streakDates.map((date, i) => [date, i]));

	const gridW = weeks.length * STEP - GAP;
	const width = LEFT + gridW + PAD * 2;
	const gridTop = PAD + HEADER + MONTH_ROW;
	const height = gridTop + 7 * STEP - GAP + FOOTER + PAD;
	const gridLeft = PAD + LEFT;

	const cells = weeks
		.map((week, w) => {
			const rects = week
				.map((cell, weekday) => {
					if (!cell) return "";
					const fire = cell.count > 0 ? streakIndex.get(cell.date) : undefined;
					let fill: string;
					let cls = "";
					if (fire !== undefined) {
						fill = FIRE_RAMP[Math.floor((fire / streakDates.length) * FIRE_RAMP.length)]!;
						if (animate)
							cls = ` class="fire" style="animation-delay:${(fire * FLAME_STAGGER_MS) % FLAME_MS}ms"`;
					} else {
						fill = theme.levels[cell.level];
					}
					return `<rect x="0" y="${weekday * STEP}" width="${CELL}" height="${CELL}" rx="2" fill="${fill}"${cls}><title>${cell.date}: ${cell.count} contribution${cell.count === 1 ? "" : "s"}</title></rect>`;
				})
				.filter(Boolean)
				.join("");
			const delay = animate ? ` style="animation-delay:${w * REVEAL_STAGGER_MS}ms"` : "";
			return `<g class="wk" transform="translate(${gridLeft + w * STEP},${gridTop})"${delay}>${rects}</g>`;
		})
		.join("\n");

	const months = monthLabels(weeks)
		.map(
			({ label, week }) =>
				`<text x="${gridLeft + week * STEP}" y="${gridTop - 5}" fill="${MUTED}" font-size="10">${label}</text>`,
		)
		.join("");

	const weekdays = [1, 3, 5] // Mon / Wed / Fri, like the TUI gutter
		.map(
			(d) =>
				`<text x="${PAD}" y="${gridTop + d * STEP + CELL - 2}" fill="${MUTED}" font-size="10">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]}</text>`,
		)
		.join("");

	// A vector flame instead of the 🔥 emoji: resvg's font fallback renders a
	// whole text run as tofu when it hits an emoji glyph, and color-emoji
	// support varies across SVG renderers anyway. Paths render everywhere.
	// Icon sits at the fixed right edge; the text end-anchors just left of it,
	// so no font-dependent width estimation is needed.
	const hasStreak = streakDates.length > 0;
	const streakText = hasStreak ? `${streakDates.length} day streak` : "no current streak";
	const streakTextX = hasStreak ? width - PAD - 17 : width - PAD;
	const flameIcon = hasStreak
		? `<g transform="translate(${width - PAD - 13},${PAD + 4}) scale(0.8)"><path fill="${FIRE_RAMP[1]}" fill-rule="evenodd" d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16Zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15Z"/></g>`
		: "";
	const moreWidth = 30; // room reserved right of the swatches for "More"
	const legend = theme.levels
		.map(
			(color, i) =>
				`<rect x="${width - PAD - moreWidth - (5 - i) * STEP}" y="${height - PAD - CELL - 1}" width="${CELL}" height="${CELL}" rx="2" fill="${color}"/>`,
		)
		.join("");

	// The hidden state lives inside the keyframes (fill-mode both), NOT on .wk
	// itself: renderers that ignore CSS animation (resvg, Quick Look, some
	// markdown previews) then fall back to opacity 1 and show the finished
	// grid, while browsers play the wipe. Never gate visibility on animation.
	const style = animate
		? `<style>
.wk{animation:reveal ${REVEAL_MS}ms ease-out both}
@keyframes reveal{from{opacity:0}to{opacity:1}}
.fire{animation:flame ${FLAME_MS}ms ease-in-out infinite}
@keyframes flame{0%,100%{opacity:1}50%{opacity:.68}}
@media (prefers-reduced-motion:reduce){.wk,.fire{animation:none}}
</style>`
		: "";

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub contributions of ${escapeXml(username)}">
${style}<rect width="${width}" height="${height}" rx="6" fill="${BG}" stroke="${BORDER}"/>
<text x="${PAD}" y="${PAD + 16}" ${FONT}><tspan fill="${TEXT}" font-size="14" font-weight="600">@${escapeXml(username)}</tspan><tspan fill="${MUTED}" font-size="12" dx="8">${total.toLocaleString("en-US")} contributions in the last year</tspan></text>
<text x="${streakTextX}" y="${PAD + 16}" text-anchor="end" fill="${theme.accent}" font-size="13" font-weight="600" ${FONT}>${streakText}</text>${flameIcon}
<g ${FONT}>${months}</g>
<g ${FONT}>${weekdays}</g>
${cells}
<g ${FONT}><text x="${PAD}" y="${height - PAD - 3}" fill="${MUTED}" font-size="10">made with npx ${APP_NAME}</text>
<text x="${width - PAD - moreWidth - 5 * STEP - 6}" y="${height - PAD - 3}" text-anchor="end" fill="${MUTED}" font-size="10">Less</text>${legend}
<text x="${width - PAD - moreWidth + 2}" y="${height - PAD - 3}" fill="${MUTED}" font-size="10">More</text></g>
</svg>
`;
}

/**
 * Month label per column where a new month first appears — the positional
 * twin of heatmap.ts's text-oriented monthLabelRow. Labels closer than three
 * columns to the previous one are dropped so partial edge months can't
 * overlap their neighbor.
 */
export function monthLabels(weeks: Week[]): { label: string; week: number }[] {
	const labels: { label: string; week: number }[] = [];
	let lastMonth = -1;
	let lastWeek = -Infinity;
	weeks.forEach((week, i) => {
		const first = week.find((cell) => cell !== null);
		if (!first) return;
		const month = Number(first.date.slice(5, 7)) - 1;
		if (month === lastMonth) return;
		lastMonth = month;
		if (i - lastWeek < 3) return;
		labels.push({ label: MONTHS[month]!, week: i });
		lastWeek = i;
	});
	return labels;
}

export function escapeXml(text: string): string {
	return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Kept for callers that want a suggested filename. */
export function defaultSvgFilename(username: string): string {
	return `${APP_NAME}-${username}.svg`;
}
