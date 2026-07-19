import { describe, expect, test } from "bun:test";
import { encodeGif } from "@/lib/gif";

/**
 * The encoder is verified by round-trip: a reference GIF-LZW decoder lives in
 * this test (the standard algorithm every browser implements), so if pixels
 * survive encode → decode across code-size growth and a dictionary reset, the
 * bitstream is real GIF — not just bytes that look like one.
 */

function readU16(bytes: Uint8Array, at: number): number {
	return bytes[at]! | (bytes[at + 1]! << 8);
}

/** Walks the container: header, color table, extensions, frames, trailer. */
function parseGif(bytes: Uint8Array) {
	expect(String.fromCharCode(...bytes.slice(0, 6))).toBe("GIF89a");
	const width = readU16(bytes, 6);
	const height = readU16(bytes, 8);
	const packed = bytes[10]!;
	expect(packed & 0x80).toBe(0x80); // global color table present
	const tableSize = 2 << (packed & 0x07);
	let at = 13 + tableSize * 3;

	let looped = false;
	const frames: { delayCs: number; indices: Uint8Array }[] = [];
	let delayCs = 0;
	while (bytes[at] !== 0x3b) {
		const marker = bytes[at]!;
		if (marker === 0x21) {
			const label = bytes[at + 1]!;
			if (label === 0xff) looped = true; // NETSCAPE loop extension
			if (label === 0xf9) delayCs = readU16(bytes, at + 4);
			at += 2;
			while (bytes[at] !== 0) at += bytes[at]! + 1; // skip sub-blocks
			at++;
		} else if (marker === 0x2c) {
			const fw = readU16(bytes, at + 5);
			const fh = readU16(bytes, at + 7);
			expect(fw).toBe(width);
			expect(fh).toBe(height);
			at += 10;
			const minCodeSize = bytes[at++]!;
			const data: number[] = [];
			while (bytes[at] !== 0) {
				const len = bytes[at]!;
				for (let i = 1; i <= len; i++) data.push(bytes[at + i]!);
				at += len + 1;
			}
			at++;
			frames.push({ delayCs, indices: decodeLzw(minCodeSize, Uint8Array.from(data), fw * fh) });
		} else {
			throw new Error(`unexpected block 0x${marker.toString(16)} at ${at}`);
		}
	}
	return { width, height, looped, frames };
}

/** Reference GIF-LZW decoder — LSB-first codes, grow-after-define widths. */
function decodeLzw(minCodeSize: number, data: Uint8Array, pixelCount: number): Uint8Array {
	const clear = 1 << minCodeSize;
	const eoi = clear + 1;
	const freshDict = () => Array.from({ length: eoi + 1 }, (_, i) => (i < clear ? [i] : []));
	let dict = freshDict();
	let codeSize = minCodeSize + 1;
	let last: number[] | null = null;
	const out: number[] = [];

	let acc = 0;
	let accBits = 0;
	let at = 0;
	while (out.length < pixelCount) {
		while (accBits < codeSize) {
			acc |= data[at++]! << accBits;
			accBits += 8;
		}
		const code = acc & ((1 << codeSize) - 1);
		acc >>= codeSize;
		accBits -= codeSize;

		if (code === clear) {
			dict = freshDict();
			codeSize = minCodeSize + 1;
			last = null;
			continue;
		}
		if (code === eoi) break;
		let entry: number[];
		if (code < dict.length) {
			entry = dict[code]!;
			if (last !== null) dict.push([...last, entry[0]!]);
		} else {
			entry = [...last!, last![0]!]; // the KwKwK case
			dict.push(entry);
		}
		out.push(...entry);
		last = entry;
		if (dict.length === 1 << codeSize && codeSize < 12) codeSize++;
	}
	return Uint8Array.from(out);
}

const PALETTE = ["#0d1117", "#39d353", "#f85149", "#ffd23f"];

describe("encodeGif", () => {
	test("a two-frame gif round-trips pixels, delays, and the loop flag", () => {
		const a = Uint8Array.from({ length: 6 * 4 }, (_, i) => i % 4);
		const b = Uint8Array.from({ length: 6 * 4 }, (_, i) => (i + 2) % 4);
		const gif = encodeGif(6, 4, PALETTE, [
			{ indices: a, delayCs: 10 },
			{ indices: b, delayCs: 150 },
		]);
		expect(gif.at(-1)).toBe(0x3b);
		const parsed = parseGif(gif);
		expect(parsed.width).toBe(6);
		expect(parsed.height).toBe(4);
		expect(parsed.looped).toBeTrue();
		expect(parsed.frames).toHaveLength(2);
		expect(parsed.frames[0]!.delayCs).toBe(10);
		expect(parsed.frames[1]!.delayCs).toBe(150);
		expect(parsed.frames[0]!.indices).toEqual(a);
		expect(parsed.frames[1]!.indices).toEqual(b);
	});

	test("a large noisy frame survives code-size growth and a dictionary reset", () => {
		// An LCG makes the frame noisy enough to push LZW past 4096 dictionary
		// entries (forcing a mid-stream clear code) without Math.random.
		let seed = 42;
		const noisy = Uint8Array.from({ length: 200 * 200 }, () => {
			seed = (seed * 1103515245 + 12345) & 0x7fffffff;
			return seed % PALETTE.length;
		});
		const gif = encodeGif(200, 200, PALETTE, [{ indices: noisy, delayCs: 10 }]);
		expect(parseGif(gif).frames[0]!.indices).toEqual(noisy);
	});

	test("flat frames compress hard — the whole point of palette + LZW", () => {
		const flat = new Uint8Array(200 * 200).fill(1);
		const gif = encodeGif(200, 200, PALETTE, [{ indices: flat, delayCs: 10 }]);
		expect(parseGif(gif).frames[0]!.indices).toEqual(flat);
		expect(gif.length).toBeLessThan(500); // 40k pixels in a few hundred bytes
	});

	test("rejects mismatched frame sizes and empty input", () => {
		expect(() => encodeGif(2, 2, PALETTE, [])).toThrow("at least one frame");
		expect(() => encodeGif(2, 2, PALETTE, [{ indices: new Uint8Array(3), delayCs: 1 }])).toThrow("expected 4");
	});
});
