import { describe, expect, test } from "bun:test";
import { concat, noise, renderSfx, SFX_NAMES, SFX_RATE, type SfxSnapshot, square, tickSounds, wav } from "@/lib/sfx";
import { pickPlayer } from "@/sound";

const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));

describe("wav", () => {
	test("emits a valid 8-bit mono RIFF header", () => {
		const samples = square({ seconds: 0.1, from: 440, to: 440 });
		const bytes = wav(samples);
		const view = new DataView(bytes.buffer);
		expect(ascii(bytes, 0, 4)).toBe("RIFF");
		expect(ascii(bytes, 8, 16)).toBe("WAVEfmt ");
		expect(ascii(bytes, 36, 40)).toBe("data");
		expect(view.getUint16(20, true)).toBe(1); // PCM
		expect(view.getUint16(22, true)).toBe(1); // mono
		expect(view.getUint32(24, true)).toBe(SFX_RATE);
		expect(view.getUint16(34, true)).toBe(8); // bits per sample
		expect(view.getUint32(40, true)).toBe(samples.length);
		expect(bytes.length).toBe(44 + samples.length);
	});

	test("maps the [-1, 1] sample range onto unsigned bytes", () => {
		const bytes = wav(Float32Array.from([-1, 0, 1]));
		expect([...bytes.slice(44)]).toEqual([0, 128, 255]);
	});
});

describe("square", () => {
	test("duration sets the sample count", () => {
		expect(square({ seconds: 0.5, from: 440, to: 440 }).length).toBe(Math.floor(0.5 * SFX_RATE));
	});

	test("duty cycle sets the high fraction — the DMG timbre knob", () => {
		for (const duty of [0.125, 0.25, 0.5]) {
			const samples = square({ seconds: 0.5, from: 440, to: 440, duty });
			const high = samples.filter((s) => s > 0).length / samples.length;
			expect(Math.abs(high - duty)).toBeLessThan(0.02);
		}
	});

	test("the decay envelope ends at silence", () => {
		const samples = square({ seconds: 0.1, from: 440, to: 440 });
		expect(Math.abs(samples.at(-1)!)).toBeLessThan(0.01);
	});
});

describe("noise", () => {
	test("the LFSR is deterministic — same seconds, same bytes", () => {
		expect(noise(0.1)).toEqual(noise(0.1));
	});

	test("produces both polarities (it's noise, not a tone)", () => {
		const samples = noise(0.05);
		expect(samples.some((s) => s > 0)).toBe(true);
		expect(samples.some((s) => s < 0)).toBe(true);
	});
});

describe("renderSfx", () => {
	test("every effect renders as a WAV, and the whole set stays tiny", () => {
		const sfx = renderSfx();
		let total = 0;
		for (const name of SFX_NAMES) {
			expect(ascii(sfx[name], 0, 4)).toBe("RIFF");
			total += sfx[name].length;
		}
		// The zero-asset claim, enforced: all six effects in under 64 kB.
		expect(total).toBeLessThan(65_536);
	});

	test("concat preserves order and length", () => {
		const joined = concat(Float32Array.from([1, 2]), Float32Array.from([3]));
		expect([...joined]).toEqual([1, 2, 3]);
	});
});

describe("tickSounds", () => {
	const at = (over: Partial<SfxSnapshot> = {}): SfxSnapshot => ({
		status: "running",
		jumpsUsed: 0,
		flames: 0,
		stars: 0,
		checkpoint: 0,
		...over,
	});

	test("quiet tick, quiet output", () => {
		expect(tickSounds(at(), at())).toEqual([]);
	});

	test("each counter increase earns its sound", () => {
		expect(tickSounds(at(), at({ jumpsUsed: 1 }))).toEqual(["jump"]);
		expect(tickSounds(at({ flames: 3 }), at({ flames: 4 }))).toEqual(["flame"]);
		expect(tickSounds(at(), at({ stars: 1 }))).toEqual(["star"]);
		expect(tickSounds(at({ checkpoint: 2 }), at({ checkpoint: 3 }))).toEqual(["checkpoint"]);
	});

	test("a double jump's second press sounds too", () => {
		expect(tickSounds(at({ jumpsUsed: 1 }), at({ jumpsUsed: 2 }))).toEqual(["jump"]);
	});

	test("death and win are exclusive — they silence the tick's pickups", () => {
		expect(tickSounds(at({ flames: 1 }), at({ flames: 2, status: "dead" }))).toEqual(["death"]);
		expect(tickSounds(at(), at({ status: "over" }))).toEqual(["death"]);
		expect(tickSounds(at({ stars: 0 }), at({ stars: 1, status: "won" }))).toEqual(["win"]);
	});

	test("nothing plays unless the run was running — dead ticks stay silent", () => {
		expect(tickSounds(at({ status: "dead" }), at({ status: "dead" }))).toEqual([]);
		expect(tickSounds(at({ status: "won" }), at({ status: "won" }))).toEqual([]);
	});
});

describe("pickPlayer", () => {
	const never = () => false;

	test("macOS always has afplay; Windows sits out (spawn latency)", () => {
		expect(pickPlayer("darwin", never)).toBe("afplay");
		expect(pickPlayer("win32", never)).toBeNull();
	});

	test("linux takes the first player found, or goes silent", () => {
		expect(pickPlayer("linux", (cmd) => cmd === "aplay")).toBe("aplay");
		expect(pickPlayer("linux", () => true)).toBe("paplay"); // preference order
		expect(pickPlayer("linux", never)).toBeNull();
	});
});
