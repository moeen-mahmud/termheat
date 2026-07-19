/**
 * A dependency-free GIF89a encoder — the whole format in ~150 lines, which is
 * exactly why `--gif` costs no dependency: GIF is palette-indexed (each pixel
 * is one byte into a <=256-color table, and the game's flat theme colors fit
 * that model natively) and its only compression is LZW over those indices.
 *
 * Pure bytes-in/bytes-out: no fs, no game knowledge. replay.ts rasterizes
 * frames into palette indices and this module packs them into a looping GIF.
 */

export interface GifFrame {
	/** One palette index per pixel, row-major, exactly width × height long. */
	indices: Uint8Array;
	/** Frame duration in hundredths of a second. */
	delayCs: number;
}

/** Growable byte sink — number[] would balloon on multi-MB replays. */
class ByteWriter {
	private buf = new Uint8Array(1 << 16);
	private len = 0;

	byte(b: number): void {
		if (this.len === this.buf.length) {
			const next = new Uint8Array(this.buf.length * 2);
			next.set(this.buf);
			this.buf = next;
		}
		this.buf[this.len++] = b;
	}

	bytes(bs: ArrayLike<number>): void {
		for (let i = 0; i < bs.length; i++) this.byte(bs[i] as number);
	}

	/** Little-endian u16 — GIF's native integer layout. */
	u16(v: number): void {
		this.byte(v & 0xff);
		this.byte((v >> 8) & 0xff);
	}

	ascii(s: string): void {
		for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i));
	}

	done(): Uint8Array {
		return this.buf.slice(0, this.len);
	}
}

export function encodeGif(width: number, height: number, palette: readonly string[], frames: GifFrame[]): Uint8Array {
	if (frames.length === 0) throw new Error("encodeGif needs at least one frame");
	if (palette.length < 1 || palette.length > 256)
		throw new Error(`palette must hold 1–256 colors, got ${palette.length}`);
	// The color table's size is a power of two by spec; pad with black.
	const depth = Math.max(1, Math.ceil(Math.log2(palette.length)));
	const tableSize = 1 << depth;

	const out = new ByteWriter();
	out.ascii("GIF89a");
	// Logical screen descriptor: global color table present, full color resolution.
	out.u16(width);
	out.u16(height);
	out.byte(0xf0 | (depth - 1));
	out.byte(0); // background color index
	out.byte(0); // pixel aspect ratio (unspecified)
	for (let i = 0; i < tableSize; i++) {
		const hex = palette[i] ?? "#000000";
		out.bytes([1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)));
	}
	// NETSCAPE2.0 application extension: loop forever.
	out.bytes([0x21, 0xff, 0x0b]);
	out.ascii("NETSCAPE2.0");
	out.bytes([0x03, 0x01]);
	out.u16(0); // 0 = infinite
	out.byte(0);

	for (const frame of frames) {
		if (frame.indices.length !== width * height) {
			throw new Error(`frame has ${frame.indices.length} pixels, expected ${width * height}`);
		}
		// Graphic control extension: the delay lives here, one per frame.
		out.bytes([0x21, 0xf9, 0x04, 0x04]); // disposal 1 (keep), no transparency
		out.u16(frame.delayCs);
		out.bytes([0x00, 0x00]);
		// Image descriptor: full-canvas frame, no local color table.
		out.byte(0x2c);
		out.u16(0);
		out.u16(0);
		out.u16(width);
		out.u16(height);
		out.byte(0);
		writeLzw(out, frame.indices, Math.max(2, depth));
	}
	out.byte(0x3b); // trailer
	return out.done();
}

/**
 * GIF-flavor LZW: codes are packed LSB-first and chopped into <=255-byte
 * sub-blocks. Uses the spec's non-early-change code widths — encoder and
 * decoder must grow the code size at the same dictionary count, so the grow
 * check mirrors what every decoder does after defining an entry.
 */
function writeLzw(out: ByteWriter, indices: Uint8Array, minCodeSize: number): void {
	out.byte(minCodeSize);
	const clearCode = 1 << minCodeSize;
	const eoiCode = clearCode + 1;
	let nextCode = eoiCode + 1;
	let codeSize = minCodeSize + 1;
	let table = new Map<number, number>();

	// LSB-first bit accumulator, flushed through the sub-block buffer.
	let acc = 0;
	let accBits = 0;
	const block = new Uint8Array(255);
	let blockLen = 0;
	const flushBlock = () => {
		if (blockLen === 0) return;
		out.byte(blockLen);
		out.bytes(block.subarray(0, blockLen));
		blockLen = 0;
	};
	const emit = (code: number) => {
		acc |= code << accBits;
		accBits += codeSize;
		while (accBits >= 8) {
			block[blockLen++] = acc & 0xff;
			if (blockLen === 255) flushBlock();
			acc >>= 8;
			accBits -= 8;
		}
	};

	emit(clearCode);
	let prev = indices[0]!;
	for (let i = 1; i < indices.length; i++) {
		const k = indices[i]!;
		// prev < 4096 and k < 256, so the pair packs into one integer key.
		const key = (prev << 8) | k;
		const found = table.get(key);
		if (found !== undefined) {
			prev = found;
			continue;
		}
		emit(prev);
		if (nextCode === 4096) {
			// Dictionary full: reset it, telling the decoder to do the same.
			emit(clearCode);
			table = new Map();
			nextCode = eoiCode + 1;
			codeSize = minCodeSize + 1;
		} else {
			if (nextCode >= 1 << codeSize) codeSize++;
			table.set(key, nextCode++);
		}
		prev = k;
	}
	emit(prev);
	emit(eoiCode);
	if (accBits > 0) {
		block[blockLen++] = acc & 0xff;
		if (blockLen === 255) flushBlock();
	}
	flushBlock();
	out.byte(0); // block terminator
}
