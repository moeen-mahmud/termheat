import { fetchContributions } from "@/github";
import { levelFor } from "@/heatmap";
import { THEMES } from "@/lib/const";
import type { Theme } from "@/lib/schema";
import type { ThemeName } from "@/lib/types";
import { themeFor } from "@/themes";
import { Box, render, Text, useApp, useInput, useStdin, useStdout } from "ink";
import { useEffect, useRef, useState } from "react";

/**
 * Gate-zero spike for "Play your year"
 * [space]/[↑] jump (again mid-air = double jump) · [r] restart · [q] quit.
 * Header shows target vs achieved fps; a non-TTY run is immortal, auto-exits
 * after 60 frames, and prints the numbers, so the go/no-go is measurable, not
 * just eyeballed.
 */

const DEFAULT_FPS = 20; // play-test verdict: 20 feels smooth, 15 was okay
const PLAYER_DAY = 10; // player sits this many day-columns in from the left edge
const CHARS_PER_DAY = 2;
const PF_ROWS = 10; // playfield rows; terrain (0–4) + jump apex (3) + headroom

// Canabalt-style speed ramp: fps is render smoothness, THIS is game speed.
// Physics integrates in seconds, so frame rate never changes difficulty.
const SPEED_BASE = 6; // day-columns per second at the start of a run
const SPEED_CAP = 9;
const SPEED_RAMP = 0.06; // +cols/s per second of survival

// Pittman parameterization: pick apex height + time-to-apex, derive the rest.
const APEX_ROWS = 3;
const TIME_TO_APEX = 0.35;
const G_UP = (2 * APEX_ROWS) / TIME_TO_APEX ** 2;
const G_DOWN = 2 * G_UP;
const JUMP_V0 = (2 * APEX_ROWS) / TIME_TO_APEX;
const MAX_FALL_PER_TICK = 0.9; // rows/tick cap so landings never tunnel a floor

// Air control: one extra, smaller jump per airtime (fresh parabola mid-air).
// Bounded on purpose — unlimited air impulses would be Flappy Bird and the
// terrain would stop mattering. Held space auto-repeats into buffered
// presses, so holding = jump on landing + double jump at apex.
const AIR_APEX_ROWS = 2;
const AIR_TIME_TO_APEX = 0.28;
const AIR_JUMP_V0 = (2 * AIR_APEX_ROWS) / AIR_TIME_TO_APEX;
const MAX_JUMPS = 2;

// Input forgiveness — mandatory at coarse tick rates, not polish: a jump
// pressed slightly early fires on landing (buffer), slightly late after a
// ledge still fires (coyote).
const JUMP_BUFFER_S = 0.15;
const COYOTE_S = 0.1;

// Terrain rules: +1 rise is an auto-step, ≥+2 is a wall (death). Spike-only
// mini level-repair keeps arbitrary real graphs survivable; the real
// reachability pass lands in level.ts (Step 1).
const MAX_STEP_UP = 1;
const MAX_RISE = 2; // clearable with a 3-row apex, comfortably
const MAX_GAP = 3; // columns; ~0.43s over a gap vs ~0.6s of airtime

const NO_FLOOR = -10;

interface SpikeProps {
	heights: number[];
	fps: number;
	maxFrames: number;
	theme: Theme;
	mortal: boolean;
}

/** Written every tick so main() can print a summary after unmount. */
const stats = { ticks: 0, actualFps: 0, p95Ms: 0 };

function initialWorld(heights: number[]) {
	return {
		cam: 0,
		elapsed: 0,
		ay: heights[PLAYER_DAY] ?? 0,
		vy: 0,
		airborne: false,
		jumpsUsed: 0,
		jumpBuffer: 0,
		coyote: 0,
		dead: false,
		deathDay: 0,
	};
}

function speedAt(elapsed: number): number {
	return Math.min(SPEED_CAP, SPEED_BASE + SPEED_RAMP * elapsed);
}

function Spike({ heights, fps, maxFrames, theme, mortal }: SpikeProps) {
	const { exit } = useApp();
	const { stdout } = useStdout();
	const { isRawModeSupported } = useStdin();
	const [, setFrame] = useState(0);
	const world = useRef(initialWorld(heights));
	const times = useRef<number[]>([]);

	const jumpBufferTicks = Math.max(1, Math.round(JUMP_BUFFER_S * fps));
	const coyoteTicks = Math.max(1, Math.round(COYOTE_S * fps));

	useInput(
		(input, key) => {
			if (input === "q") exit();
			if (input === "r" && world.current.dead) {
				world.current = initialWorld(heights);
				return;
			}
			if (input === " " || key.upArrow) world.current.jumpBuffer = jumpBufferTicks;
		},
		// isRawModeSupported is stdin.isTTY — undefined on a pipe, and useInput
		// only deactivates on a strict === false, so coerce.
		{ isActive: isRawModeSupported === true },
	);

	useEffect(() => {
		const dt = 1 / fps;
		const maxFall = MAX_FALL_PER_TICK * fps;
		const id = setInterval(() => {
			stats.ticks++;
			if (stats.ticks >= maxFrames) {
				exit();
				return;
			}
			times.current.push(performance.now());
			if (times.current.length > 60) times.current.shift();

			const w = world.current;
			if (w.dead) return; // frozen until [r]; input hooks stay live

			const die = (day: number) => {
				w.dead = true;
				w.deathDay = day;
				setFrame((f) => f + 1);
			};

			w.elapsed += dt;
			w.cam += speedAt(w.elapsed) * dt;

			// Two-foot collision: the sprite is one day-column wide but straddles
			// two columns mid-scroll. It stands if either foot has ground and falls
			// only when both feet are over a pit — so what you see touching a block
			// is what the physics believes.
			const px = w.cam + PLAYER_DAY;
			const dayIdx = Math.floor(px) % heights.length;
			const hL = heights[dayIdx] ?? 0;
			const hR = heights[Math.floor(px + 0.999) % heights.length] ?? 0;
			const solid = Math.max(hL, hR);
			const ground = solid > 0 ? solid : NO_FLOOR; // zero-day = pit, no floor

			if (w.jumpBuffer > 0) w.jumpBuffer--;
			if (w.airborne && w.coyote > 0) w.coyote--;

			if (!w.airborne) {
				const rise = ground - w.ay;
				if (rise > MAX_STEP_UP + 0.001 && mortal) {
					die(dayIdx);
					return;
				}
				if (rise > 0) {
					w.ay = ground; // auto-step (and god-mode climb when immortal)
				} else if (rise < 0) {
					w.airborne = true; // ledge or pit edge
					w.vy = 0;
					w.coyote = coyoteTicks;
				}
			}

			if (w.jumpBuffer > 0) {
				if (!w.airborne || w.coyote > 0) {
					w.vy = JUMP_V0;
					w.airborne = true;
					w.jumpsUsed = 1;
					w.jumpBuffer = 0;
					w.coyote = 0;
				} else if (w.jumpsUsed < MAX_JUMPS) {
					w.vy = AIR_JUMP_V0; // fresh, smaller parabola mid-air
					w.jumpsUsed++;
					w.jumpBuffer = 0;
				}
			}

			if (w.airborne) {
				w.ay += w.vy * dt;
				w.vy -= (w.vy > 0 ? G_UP : G_DOWN) * dt;
				if (w.vy < -maxFall) w.vy = -maxFall;
				if (w.vy <= 0 && w.ay <= ground) {
					// Fall speed caps below 1 row/tick, so a legit landing crosses the
					// surface shallowly; a deep overlap means we ran into a wall's side.
					if (ground - w.ay > 1.2 && mortal) {
						die(dayIdx);
						return;
					}
					w.ay = ground;
					w.vy = 0;
					w.airborne = false;
					w.jumpsUsed = 0;
				}
				if (w.ay < -1 && mortal) {
					die(dayIdx);
					return;
				}
			}

			setFrame((f) => f + 1);
		}, 1000 / fps);
		return () => clearInterval(id);
	}, [fps, heights, maxFrames, mortal, coyoteTicks, exit]);

	const w = world.current;
	const width = Math.min((stdout?.columns ?? 80) - 2, 120);
	const baseChar = Math.floor(w.cam * CHARS_PER_DAY);
	const playerChar = Math.floor((w.cam + PLAYER_DAY) * CHARS_PER_DAY) - baseChar;

	// Half-row sprite: quantize altitude to halves; a .5 renders as ▀ in the
	// lower cell + ▄ in the upper cell, doubling the arc's vertical resolution.
	const quantized = Math.round(Math.max(w.ay, 0) * 2) / 2;
	const spriteRow = Math.floor(quantized);
	const spriteHalf = quantized - spriteRow === 0.5;
	const playerColor = w.dead ? "#ff5f1f" : "#ffd23f";

	const t = times.current;
	if (t.length > 5) {
		const deltas = t.slice(1).map((v, i) => v - (t[i] ?? v));
		const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
		stats.actualFps = 1000 / avg;
		stats.p95Ms = [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length * 0.95)] ?? 0;
	}

	const rows = [];
	for (let r = 0; r < PF_ROWS; r++) {
		const rowFromBottom = PF_ROWS - 1 - r;
		const chunks: { text: string; color?: string; bg?: string }[] = [];
		for (let c = 0; c < width; c++) {
			const day = Math.floor((baseChar + c) / CHARS_PER_DAY) % heights.length;
			const h = heights[day] ?? 0;
			const terrain = rowFromBottom < h;
			let ch = terrain ? "█" : " ";
			let color = terrain ? theme.levels[h] : undefined;
			let bg: string | undefined;
			if (c === playerChar || c === playerChar + 1) {
				if (rowFromBottom === spriteRow) {
					ch = spriteHalf ? "▀" : "█";
					color = playerColor;
					bg = spriteHalf && terrain ? theme.levels[h] : undefined;
				} else if (spriteHalf && rowFromBottom === spriteRow + 1) {
					ch = "▄";
					color = playerColor;
					bg = terrain ? theme.levels[h] : undefined;
				}
			}
			const last = chunks[chunks.length - 1];
			if (last && last.color === color && last.bg === bg) last.text += ch;
			else chunks.push({ text: ch, color, bg });
		}
		rows.push(
			<Text key={`row-${rowFromBottom}`}>
				{chunks.map((k, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: chunks are stateless and rebuilt every frame; index is the identity
					<Text key={`${rowFromBottom}-${i}`} color={k.color} backgroundColor={k.bg}>
						{k.text}
					</Text>
				))}
			</Text>,
		);
	}

	return (
		<Box flexDirection="column">
			<Text>
				{w.dead
					? `💀 dead at day ${w.deathDay + 1}/${heights.length} · [r] restart · [q] quit`
					: `⚡ ${stats.actualFps.toFixed(1)}/${fps}fps · p95 ${stats.p95Ms.toFixed(0)}ms · speed ${speedAt(w.elapsed).toFixed(1)} · [space] jump ×2 · [q] quit`}
			</Text>
			{rows}
		</Box>
	);
}

/**
 * Spike-only stand-in for Step 1's reachability repair: clamp climbs to
 * MAX_RISE, clamp pit widths to MAX_GAP, and guarantee solid ground under the
 * player's starting columns. Real graphs jump 0→4 between days — unrepaired,
 * they're an instant kill.
 */
function spikeRepair(raw: number[]): number[] {
	const climbable: number[] = [];
	let prev = 1;
	for (const h of raw) {
		if (h <= 0) {
			climbable.push(0);
			continue;
		}
		const clamped = Math.min(h, prev + MAX_RISE);
		climbable.push(clamped);
		prev = clamped;
	}
	const repaired: number[] = [];
	let zeros = 0;
	for (const h of climbable) {
		if (h === 0) {
			zeros++;
			if (zeros <= MAX_GAP) repaired.push(0);
		} else {
			zeros = 0;
			repaired.push(h);
		}
	}
	for (let i = 0; i <= PLAYER_DAY && i < repaired.length; i++) {
		repaired[i] = Math.max(1, repaired[i] ?? 1);
	}
	return repaired;
}

function syntheticHeights(days: number): number[] {
	return Array.from({ length: days }, (_, i) => {
		if (i % 11 === 0) return 0; // pits
		const wave = Math.sin(i * 0.7) * 2.5 + 2 + Math.sin(i * 0.13) * 1.5;
		return Math.max(0, Math.min(4, Math.round(wave)));
	});
}

async function main(): Promise<void> {
	const argv = process.argv.slice(2);
	let username = "moeen-mahmud";
	let fps = DEFAULT_FPS;
	let framesFlag: number | undefined;
	let synthetic = false;
	let theme: ThemeName = "github";
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;
		if (arg === "--fps") fps = Number(argv[++i]) || DEFAULT_FPS;
		else if (arg === "--frames") framesFlag = Number(argv[++i]) || 60;
		else if (arg === "--synthetic") synthetic = true;
		else if (arg === "--theme") {
			const value = argv[++i];
			if (value && THEMES.includes(value as ThemeName)) theme = value as ThemeName;
		} else if (!arg.startsWith("-")) username = arg;
	}

	const isTTY = process.stdout.isTTY ?? false;
	const maxFrames = framesFlag ?? (isTTY ? Number.POSITIVE_INFINITY : 60);

	let raw: number[];
	if (synthetic) {
		raw = syntheticHeights(365);
	} else {
		const days = await fetchContributions(username);
		raw = [...days].sort((a, b) => (a.date < b.date ? -1 : 1)).map((d) => levelFor(d.count));
	}
	const heights = spikeRepair(raw);

	const app = render(
		<Spike heights={heights} fps={fps} maxFrames={maxFrames} theme={themeFor(theme)} mortal={isTTY} />,
		{ alternateScreen: isTTY, maxFps: 60 },
	);
	await app.waitUntilExit();
	console.log(
		`spike: ${stats.ticks} frames · target ${fps}fps · achieved ${stats.actualFps.toFixed(1)}fps · p95 frame interval ${stats.p95Ms.toFixed(0)}ms`,
	);
}

await main();
