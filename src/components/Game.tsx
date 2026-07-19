import { Hud } from "@/components/Hud";
import { COLUMN_WIDTH } from "@/lib/const";
import { createEngine, respawn, step } from "@/lib/engine";
import { PF_ROWS, PLAYER_SCREEN_DAY } from "@/lib/game-consts";
import type { GameProps } from "@/lib/schema";
import { FIRE_RAMP, scaleHex } from "@/themes";
import { Box, Text, useApp, useInput, useStdin, useStdout } from "ink";
import { useEffect, useRef, useState } from "react";

/**
 * The `termheat play` renderer. All simulation lives in engine.ts; this
 * component owns the clock (one setInterval at `fps`), forwards key presses
 * as one-shot inputs, and paints the current EngineState. Rendering follows
 * the spike's proven shape: one <Text> per row of color-run chunks, and a
 * half-row ▀/▄ sprite that doubles the jump arc's vertical resolution.
 */

interface Chunk {
	text: string;
	color?: string;
	bg?: string;
}

export function Game({ level, username, theme, interactive, maxFrames, fps }: GameProps) {
	const { exit } = useApp();
	const { stdout } = useStdout();
	const { isRawModeSupported } = useStdin();
	const [, setFrame] = useState(0);
	const world = useRef(createEngine(level));
	const jumpPressed = useRef(false);

	useInput(
		(input, key) => {
			if (input === "q") exit();
			if (input === " " || key.upArrow) jumpPressed.current = true;
			if (input === "r" && world.current.status === "dead") {
				jumpPressed.current = false; // a buffered press must not fire at spawn
				respawn(world.current, level);
			}
		},
		// isRawModeSupported is stdin.isTTY — undefined on a pipe, and useInput
		// only deactivates on a strict === false, so coerce.
		{ isActive: interactive && isRawModeSupported === true },
	);

	useEffect(() => {
		const dt = 1 / fps;
		let ticks = 0;
		const id = setInterval(() => {
			ticks++;
			if (ticks >= maxFrames) {
				exit();
				return;
			}
			const jump = jumpPressed.current;
			jumpPressed.current = false;
			step(world.current, level, dt, { jump });
			// Demo mode (non-TTY smoke runs): nobody can press [r], keep rolling.
			if (!interactive && world.current.status === "dead") respawn(world.current, level);
			setFrame((f) => f + 1);
		}, 1000 / fps);
		return () => clearInterval(id);
	}, [fps, level, maxFrames, interactive, exit]);

	const w = world.current;
	const columns = level.columns;
	const width = Math.min((stdout?.columns ?? 80) - 2, 120);
	const widthDays = Math.floor(width / COLUMN_WIDTH);

	// Camera holds the player at a fixed screen column from frame one — cam
	// starts negative (void scrolls in from the left), because a clamped
	// camera makes the opening seconds read as "the sprite climbs across a
	// frozen screen" instead of "the world rolls". Only the right edge clamps,
	// so the finish pillar parks at the screen edge while you run to it.
	const cam = Math.min(w.x - PLAYER_SCREEN_DAY, Math.max(0, columns.length - widthDays));
	const baseChar = Math.floor(cam * COLUMN_WIDTH);
	const playerChar = Math.floor(w.x * COLUMN_WIDTH) - baseChar;

	// Half-row sprite: quantize altitude to halves; a .5 renders as ▀ in the
	// lower cell + ▄ in the one above, doubling the arc's vertical resolution.
	const quantized = Math.round(Math.max(w.y, 0) * 2) / 2;
	const spriteRow = Math.floor(quantized);
	const spriteHalf = quantized - spriteRow === 0.5;
	const playerColor = w.status === "dead" ? FIRE_RAMP[0] : FIRE_RAMP[3];
	const ghostColor = scaleHex(theme.levels[2], 0.5);
	// Flames flicker by cycling the fire ramp — a pure function of elapsed
	// time (the animation contract), and what makes ▲ read as fire at speed.
	const flameColor = FIRE_RAMP[Math.floor(w.elapsed * 8) % FIRE_RAMP.length];

	const rows = [];
	for (let r = 0; r < PF_ROWS; r++) {
		const rowFromBottom = PF_ROWS - 1 - r;
		const chunks: Chunk[] = [];
		for (let c = 0; c < width; c++) {
			const day = Math.floor((baseChar + c) / COLUMN_WIDTH);
			const cell = columns[day];
			const height = cell?.height ?? 0;
			const terrain = cell !== undefined && rowFromBottom < height;
			const terrainDrawn = terrain && (!cell.ghost || rowFromBottom === height - 1);
			const terrainColor = cell?.ghost ? ghostColor : theme.levels[cell?.level ?? 0];

			let ch = " ";
			let color: string | undefined;
			let bg: string | undefined;
			if (terrainDrawn) {
				ch = cell.ghost ? "▀" : "█"; // ghost bridges are thin floating slabs
				color = terrainColor;
			}
			if (cell?.flame && !w.collected.has(day) && rowFromBottom === height) {
				// ♦, not ▲ — play-test verdict: triangles read as spikes/danger,
				// and a collectible must invite touch, not warn against it.
				ch = "♦";
				color = flameColor;
			}
			if (day === level.finishColumn && rowFromBottom >= height) {
				ch = "░"; // today — a shimmer pillar marks the finish
				color = theme.accent;
			}
			if (c === playerChar || c === playerChar + 1) {
				if (rowFromBottom === spriteRow) {
					ch = spriteHalf ? "▀" : "█";
					color = playerColor;
					bg = spriteHalf && terrainDrawn ? terrainColor : undefined;
				} else if (spriteHalf && rowFromBottom === spriteRow + 1) {
					ch = "▄";
					color = playerColor;
					bg = terrainDrawn ? terrainColor : undefined;
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
			<Hud w={w} level={level} username={username} accent={theme.accent} />
			{rows}
		</Box>
	);
}
