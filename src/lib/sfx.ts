import type { GameStatus } from "@/lib/types";

/**
 * Game Boy sound synthesis for `termheat play`, zero dependencies — the GIF
 * encoder decision, applied to audio. Where others would ship .wav assets and
 * an npm player, the DMG's sound hardware is simple enough to model directly:
 * two square-wave channels with four duty cycles, and a 15-bit LFSR noise
 * channel. This module is the pure half (samples in, WAV bytes out, no I/O),
 * so every sound is bun-testable and deterministic; sound.ts owns the tmpdir
 * files and the `afplay` spawns.
 *
 * 8-bit mono at 22 kHz is authenticity, not a compromise — all six effects
 * together are ~40 kB, synthesized at startup, nothing shipped.
 */

export const SFX_RATE = 22_050;

export const SFX_NAMES = ["jump", "flame", "star", "checkpoint", "death", "win"] as const;
export type SfxName = (typeof SFX_NAMES)[number];

/**
 * DMG channel 1/2: a square wave with a linear pitch sweep and a decay
 * envelope. `duty` is the fraction of each cycle spent high — the DMG offered
 * 12.5/25/50/75%, and each has a distinct timbre (25% is *the* classic
 * jump "boing"; 12.5% is thin and sparkly).
 */
export function square(opts: {
	seconds: number;
	/** Start pitch, Hz. */
	from: number;
	/** End pitch, Hz — equal to `from` for a steady note. */
	to: number;
	duty?: number;
	gain?: number;
}): Float32Array {
	const { seconds, from, to, duty = 0.5, gain = 0.5 } = opts;
	const n = Math.floor(seconds * SFX_RATE);
	const out = new Float32Array(n);
	let phase = 0;
	for (let i = 0; i < n; i++) {
		const t = i / n;
		phase = (phase + (from + (to - from) * t) / SFX_RATE) % 1;
		// Linear decay per note — the DMG's volume envelope, and what makes
		// square waves read as plucky chiptune instead of alarm clock.
		out[i] = (phase < duty ? 1 : -1) * gain * (1 - t);
	}
	return out;
}

/** DMG channel 4: pseudo-random noise from the real 15-bit LFSR polynomial. */
export function noise(seconds: number, gain = 0.4): Float32Array {
	const n = Math.floor(seconds * SFX_RATE);
	const out = new Float32Array(n);
	let lfsr = 0x7fff;
	for (let i = 0; i < n; i++) {
		if (i % 2 === 0) {
			const bit = (lfsr ^ (lfsr >> 1)) & 1;
			lfsr = (lfsr >> 1) | (bit << 14);
		}
		out[i] = (lfsr & 1 ? 1 : -1) * gain * (1 - i / n);
	}
	return out;
}

export function concat(...parts: Float32Array[]): Float32Array {
	const out = new Float32Array(parts.reduce((sum, p) => sum + p.length, 0));
	let offset = 0;
	for (const p of parts) {
		out.set(p, offset);
		offset += p.length;
	}
	return out;
}

/**
 * Samples → a complete WAV file: a 44-byte RIFF header plus 8-bit unsigned
 * PCM. That's the entire "encoder" — the OS player does the rest.
 */
export function wav(samples: Float32Array): Uint8Array {
	const n = samples.length;
	const bytes = new Uint8Array(44 + n);
	const view = new DataView(bytes.buffer);
	const ascii = (offset: number, text: string) => {
		for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
	};
	ascii(0, "RIFF");
	view.setUint32(4, 36 + n, true);
	ascii(8, "WAVEfmt ");
	view.setUint32(16, 16, true); // fmt chunk size
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, 1, true); // mono
	view.setUint32(24, SFX_RATE, true);
	view.setUint32(28, SFX_RATE, true); // byte rate: 8-bit mono = sample rate
	view.setUint16(32, 1, true); // block align
	view.setUint16(34, 8, true); // bits per sample
	ascii(36, "data");
	view.setUint32(40, n, true);
	for (let i = 0; i < n; i++) bytes[44 + i] = Math.round((samples[i]! * 0.5 + 0.5) * 255);
	return bytes;
}

/** A steady note — sugar over `square` for melodies. */
const note = (freq: number, seconds: number, duty = 0.5) => square({ seconds, from: freq, to: freq, duty });

/**
 * The six effects, as WAV bytes. Melodies are plain note tables — retuning a
 * sound is editing data, not code. Each effect keeps its own timbre lane so
 * they read apart by ear: jump sweeps, pickups are duty-cycle blips (thin
 * 12.5% = the rarer star), the checkpoint dings low, death is the noise
 * channel, and the fanfare is the only phrase longer than a quarter second.
 */
export function renderSfx(): Record<SfxName, Uint8Array> {
	return {
		// A fast upward sweep at 25% duty — the canonical 8-bit jump.
		jump: wav(square({ seconds: 0.12, from: 220, to: 880, duty: 0.25 })),
		// Two rising blips: C6 → G6.
		flame: wav(concat(note(1047, 0.05), note(1568, 0.08))),
		// Power-up arpeggio, C5 E5 G5 C6, thin 12.5% duty so it sparkles.
		star: wav(concat(...[523, 659, 784, 1047].map((f) => note(f, 0.06, 0.125)))),
		// Flag plant: a low two-note ding (C5 → G5) under the pickup register.
		checkpoint: wav(concat(note(523, 0.06), note(784, 0.12))),
		// Noise burst, then a falling square — crunch, then tumble.
		death: wav(concat(noise(0.15), square({ seconds: 0.25, from: 440, to: 110 }))),
		// You made it to today: C E G C, then G–C an octave up to land it.
		win: wav(
			concat(
				note(523, 0.09),
				note(659, 0.09),
				note(784, 0.09),
				note(1047, 0.14),
				note(784, 0.09),
				note(1047, 0.3),
			),
		),
	};
}

/** The engine fields a tick's sounds are diffed from — see `tickSounds`. */
export interface SfxSnapshot {
	status: GameStatus;
	jumpsUsed: number;
	flames: number;
	/** `w.stars.size` — grab count is exact where the decaying `starS` isn't. */
	stars: number;
	checkpoint: number;
}

/**
 * Which sounds one `step()` earned, as a pure diff of engine state — the
 * engine itself stays sound-free (and the deterministic --gif replay with
 * it). Terminal events silence the tick's other sounds: a death *is* the
 * event, whatever else the tick collected.
 */
export function tickSounds(before: SfxSnapshot, after: SfxSnapshot): SfxName[] {
	if (before.status !== "running") return [];
	if (after.status === "won") return ["win"];
	if (after.status === "dead" || after.status === "over") return ["death"];
	const out: SfxName[] = [];
	if (after.jumpsUsed > before.jumpsUsed) out.push("jump");
	if (after.flames > before.flames) out.push("flame");
	if (after.stars > before.stars) out.push("star");
	if (after.checkpoint > before.checkpoint) out.push("checkpoint");
	return out;
}
