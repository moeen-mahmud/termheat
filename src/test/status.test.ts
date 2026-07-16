import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ASCII_SPARK_CHARS as ASCII_RAMP, SPARK_CHARS as RAMP, STATUS_WINDOW_DAYS } from "@/lib/const";

// Widened views: toContain() against an `as const` tuple wants the literal union.
const SPARK_CHARS: readonly string[] = RAMP;
const ASCII_SPARK_CHARS: readonly string[] = ASCII_RAMP;
import type { ContributionDay } from "@/lib/types";
import { isStale, readCache, sparkline, statusLine, writeCacheEntry } from "@/status";

const TODAY = "2026-07-15";

function daysEndingToday(counts: number[]): ContributionDay[] {
	const end = Date.parse(`${TODAY}T00:00:00Z`);
	return counts.map((count, i) => {
		const date = new Date(end - (counts.length - 1 - i) * 86_400_000).toISOString().slice(0, 10);
		return { date, count };
	});
}

async function tempCachePath(): Promise<string> {
	return join(await mkdtemp(join(tmpdir(), "termheat-test-")), "cache.json");
}

describe("cache round-trip", () => {
	test("missing file reads as empty, then persists an entry", async () => {
		const path = await tempCachePath();
		expect(await readCache(path)).toEqual({});
		const days = daysEndingToday([1, 2]);
		await writeCacheEntry("octocat", days, path, new Date("2026-07-15T10:00:00Z"));
		const cache = await readCache(path);
		expect(cache.octocat?.days).toEqual(days);
		expect(cache.octocat?.fetchedAt).toBe("2026-07-15T10:00:00.000Z");
	});

	test("corrupt cache is disposable — reads as empty, never throws", async () => {
		const path = await tempCachePath();
		await Bun.write(path, "{not json");
		expect(await readCache(path)).toEqual({});
		await Bun.write(path, `{"octocat":{"fetchedAt":42,"days":"nope"}}`);
		expect(await readCache(path)).toEqual({});
	});

	test("writing a second user keeps the first", async () => {
		const path = await tempCachePath();
		await writeCacheEntry("a", daysEndingToday([1]), path);
		await writeCacheEntry("b", daysEndingToday([2]), path);
		const cache = await readCache(path);
		expect(Object.keys(cache).sort()).toEqual(["a", "b"]);
	});
});

describe("isStale", () => {
	const entry = { fetchedAt: "2026-07-15T10:00:00Z", days: [] };

	test("fresh within the TTL, stale after it", () => {
		expect(isStale(entry, 30, new Date("2026-07-15T10:29:00Z"))).toBe(false);
		expect(isStale(entry, 30, new Date("2026-07-15T10:31:00Z"))).toBe(true);
	});

	test("unparseable timestamp counts as stale", () => {
		expect(isStale({ fetchedAt: "garbage", days: [] }, 30)).toBe(true);
	});
});

// The scaling curve inside sparkline is a design choice; these tests pin only
// the contract every reasonable curve must satisfy.
describe("sparkline contract", () => {
	test("one glyph per count, all drawn from the ramp", () => {
		const line = sparkline([0, 1, 5, 20], SPARK_CHARS);
		expect([...line].length).toBe(4);
		for (const glyph of line) expect(SPARK_CHARS).toContain(glyph);
	});

	test("empty input → empty string", () => {
		expect(sparkline([], SPARK_CHARS)).toBe("");
	});

	test("zero is the quietest glyph", () => {
		expect(sparkline([0], SPARK_CHARS)).toBe(SPARK_CHARS[0]!);
	});

	test("more contributions never render quieter", () => {
		const counts = [0, 1, 3, 8, 15, 40];
		const line = [...sparkline(counts, SPARK_CHARS)];
		const indices = line.map((glyph) => SPARK_CHARS.indexOf(glyph));
		for (let i = 1; i < indices.length; i++) {
			expect(indices[i]!).toBeGreaterThanOrEqual(indices[i - 1]!);
		}
	});

	test("works with the ascii ramp too", () => {
		const line = sparkline([0, 2, 9], ASCII_SPARK_CHARS);
		for (const glyph of line) expect(ASCII_SPARK_CHARS).toContain(glyph);
	});
});

describe("statusLine", () => {
	// 20 days: 0s then a 3-day tail streak (today active)
	const days = daysEndingToday([...Array(17).fill(0), 2, 5, 3]);

	test("matches the 🔥 <n>d <spark> shape and caps the window", () => {
		const line = statusLine(days, { today: TODAY });
		expect(line).toMatch(/^🔥 3d .+$/);
		const spark = line.split(" ")[2]!;
		expect([...spark].length).toBe(STATUS_WINDOW_DAYS);
	});

	test("ascii mode drops the emoji and uses the ascii ramp", () => {
		const line = statusLine(days, { today: TODAY, ascii: true });
		expect(line).toMatch(/^3d .+$/);
		expect(line).not.toContain("🔥");
		for (const glyph of line.split(" ")[1]!) expect(ASCII_SPARK_CHARS).toContain(glyph);
	});

	test("future calendar days don't pad the sparkline", () => {
		const withFuture = [...days, { date: "2026-07-16", count: 0 }];
		const spark = statusLine(withFuture, { today: TODAY }).split(" ")[2]!;
		expect([...spark].length).toBe(STATUS_WINDOW_DAYS);
	});
});
