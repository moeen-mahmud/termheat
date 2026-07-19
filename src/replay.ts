import { createEngine, type EngineState, respawn, step } from "@/lib/engine";
import {
	HEART_COLOR,
	PLAYER_SCREEN_DAY,
	REPLAY,
	REPLAY_FRAME_HEIGHT,
	REPLAY_FRAME_WIDTH,
	STAR_COLOR,
	TICK_INPUT,
} from "@/lib/game-consts";
import { encodeGif, type GifFrame } from "@/lib/gif";
import type { ReplayGifOptions, Theme } from "@/lib/schema";
import type { GameLevel } from "@/lib/types";
import { BG } from "@/svg";
import { FIRE_RAMP, scaleHex } from "@/themes";

/**
 * `--gif` replay rendering: feed a recorded input log back through the real
 * engine (same step(), same respawn(), fixed dt) and rasterize what the
 * terminal showed into palette-indexed pixels for the GIF encoder. No frames
 * are captured while playing — recording a run costs one small integer per
 * tick, and this module re-derives every pixel offline after the run ends.
 *
 * Pure data-in/data-out: no Ink, no fs. export.ts owns the disk.
 *
 * Re-runs a recorded log through the engine. Exported on its own so tests can
 * assert the determinism the whole feature stands on: same level + same log
 * = the same final state as the live run, tick for tick.
 */
export function simulateLog(
	level: GameLevel,
	log: readonly number[],
	fps: number,
	onTick?: (w: EngineState, tick: number) => void,
): EngineState {
	const w = createEngine(level);
	const dt = 1 / fps;
	for (const [tick, code] of log.entries()) {
		// respawn() guards on status "dead" itself, exactly like the live run.
		if (code === TICK_INPUT.respawn) respawn(w, level);
		else step(w, level, dt, { jump: code === TICK_INPUT.jump });
		onTick?.(w, tick);
	}
	return w;
}

export function renderReplayGif({ level, theme, log, fps }: ReplayGifOptions): Uint8Array {
	const pal = buildPalette(theme);
	const delayCs = Math.round((100 * REPLAY.SAMPLE_EVERY) / fps);
	const frames: GifFrame[] = [];
	// Identical consecutive frames (death pauses, the end screen) merge into
	// one longer delay — a still second costs zero extra bytes. The cap keeps
	// a player who idles on the death line from freezing the GIF with them.
	const push = (indices: Uint8Array, delay: number) => {
		const last = frames.at(-1);
		if (last && sameFrame(last.indices, indices)) {
			last.delayCs = Math.min(last.delayCs + delay, REPLAY.STILL_CAP_CS);
			return;
		}
		frames.push({ indices, delayCs: delay });
	};

	const final = simulateLog(level, log, fps, (w, tick) => {
		if (tick % REPLAY.SAMPLE_EVERY === 0) push(rasterize(w, level, pal), delayCs);
	});
	if (frames.length === 0) frames.push({ indices: rasterize(final, level, pal), delayCs });
	frames.at(-1)!.delayCs += REPLAY.HOLD_CS;
	return encodeGif(REPLAY_FRAME_WIDTH, REPLAY_FRAME_HEIGHT, pal.colors, frames);
}

interface ScenePalette {
	colors: string[];
	bg: number;
	levels: number[];
	ghost: number;
	fluid: number;
	fire: number[];
	accent: number;
	heart: number;
	star: number;
}

function buildPalette(theme: Theme): ScenePalette {
	const colors: string[] = [];
	const seen = new Map<string, number>();
	const idx = (hex: string): number => {
		const found = seen.get(hex);
		if (found !== undefined) return found;
		seen.set(hex, colors.length);
		colors.push(hex);
		return colors.length - 1;
	};
	const ghostHex = scaleHex(theme.levels[2], 0.5);
	const fluidHex = theme.name === "fire" ? FIRE_RAMP[0] : theme.name === "ocean" ? theme.levels[2] : ghostHex;
	return {
		bg: idx(BG),
		levels: theme.levels.map(idx),
		ghost: idx(ghostHex),
		fluid: idx(fluidHex),
		fire: FIRE_RAMP.map(idx),
		accent: idx(theme.accent),
		heart: idx(HEART_COLOR),
		star: idx(STAR_COLOR),
		colors,
	};
}

/** One frame of the game, as the terminal draws it — camera math included. */
function rasterize(w: EngineState, level: GameLevel, pal: ScenePalette): Uint8Array {
	const { DAY_PX, ROW_PX, VIEW_DAYS } = REPLAY;
	const px = new Uint8Array(REPLAY_FRAME_WIDTH * REPLAY_FRAME_HEIGHT).fill(pal.bg);
	const fill = (x: number, y: number, fw: number, fh: number, color: number) => {
		const x0 = Math.max(0, Math.round(x));
		const y0 = Math.max(0, Math.round(y));
		const x1 = Math.min(REPLAY_FRAME_WIDTH, Math.round(x + fw));
		const y1 = Math.min(REPLAY_FRAME_HEIGHT, Math.round(y + fh));
		for (let yy = y0; yy < y1; yy++) px.fill(color, yy * REPLAY_FRAME_WIDTH + x0, yy * REPLAY_FRAME_WIDTH + x1);
	};

	const cols = level.columns;
	// Same camera as Game.tsx: player parked at a fixed screen column, only
	// the right edge clamps so the finish pillar can be run down.
	const cam = Math.min(w.x - PLAYER_SCREEN_DAY, Math.max(0, cols.length - VIEW_DAYS));
	const first = Math.floor(cam);
	const flicker = pal.fire[Math.floor(w.elapsed * 8) % pal.fire.length]!;

	for (let d = first; d <= first + VIEW_DAYS; d++) {
		const cell = cols[d];
		if (cell === undefined) continue;
		const x = (d - cam) * DAY_PX;
		const h = Math.max(0, Math.min(4, cell.height));
		const top = REPLAY_FRAME_HEIGHT - h * ROW_PX;
		if (h === 0) fill(x, REPLAY_FRAME_HEIGHT - 3, DAY_PX, 3, pal.fluid);
		else if (cell.ghost)
			fill(x, top, DAY_PX, 3, pal.ghost); // thin floating slab
		else fill(x, top, DAY_PX, h * ROW_PX, pal.levels[cell.level]!);
		if (cell.flame && !w.collected.has(d)) {
			diamond(px, x + DAY_PX / 2, top - 5, flicker);
		}
		if (cell.star && !w.stars.has(d)) {
			// Star wins the cell over a flame, matching the terminal draw order.
			diamond(px, x + DAY_PX / 2, top - 5, pal.star);
		}
		if (d === level.finishColumn) {
			// The ░ shimmer pillar: a dotted column from the sky to the terrain.
			for (let y = 2; y < top - 1; y += 4) fill(x + 3, y, 2, 2, pal.accent);
		}
	}

	// Checkpoint flags: accent once passed, dim ahead (the in-game ⚑ rule).
	const anchorCol = level.checkpoints[w.checkpoint]?.column ?? 0;
	for (const cp of level.checkpoints.slice(1)) {
		if (cp.column < first || cp.column > first + VIEW_DAYS) continue;
		const x = (cp.column - cam) * DAY_PX;
		const groundTop = REPLAY_FRAME_HEIGHT - Math.max(0, Math.min(4, cols[cp.column]?.height ?? 0)) * ROW_PX;
		const color = cp.column <= anchorCol ? pal.accent : pal.ghost;
		fill(x, groundTop - 12, 1, 12, color);
		fill(x + 1, groundTop - 12, 5, 2, color);
		fill(x + 1, groundTop - 10, 3, 2, color);
	}

	// The player: one day-column wide, one row tall, ember-red while dead —
	// and cycling the fire ramp while starred, same as the terminal sprite.
	const spriteX = (w.x - cam) * DAY_PX;
	const spriteTop = REPLAY_FRAME_HEIGHT - Math.max(w.y, 0) * ROW_PX - ROW_PX;
	const alive = w.status !== "dead" && w.status !== "over";
	fill(spriteX, spriteTop, DAY_PX, ROW_PX, alive ? (w.starS > 0 ? flicker : pal.fire[3]!) : pal.fire[0]!);
	fill(spriteX + DAY_PX - 3, spriteTop + 2, 2, 2, pal.bg); // the eye, facing the run

	// Hearts HUD, top-left: filled = left, dim = spent.
	for (let i = 0; i < w.heartsMax; i++) {
		fill(3 + i * 6, 3, 4, 4, i < w.hearts ? pal.heart : pal.ghost);
	}
	return px;
}

/** A ♦, manhattan-distance style — the flame collectible at pixel scale. */
function diamond(px: Uint8Array, cx: number, cy: number, color: number): void {
	const x0 = Math.round(cx);
	const y0 = Math.round(cy);
	for (let dy = -2; dy <= 2; dy++) {
		const span = 2 - Math.abs(dy);
		for (let dx = -span; dx <= span; dx++) {
			const x = x0 + dx;
			const y = y0 + dy;
			if (x >= 0 && x < REPLAY_FRAME_WIDTH && y >= 0 && y < REPLAY_FRAME_HEIGHT)
				px[y * REPLAY_FRAME_WIDTH + x] = color;
		}
	}
}

function sameFrame(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}
