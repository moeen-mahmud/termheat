import { levelFor } from "@/heatmap";
import {
	APP_NAME,
	ASCII_SPARK_CHARS,
	MAX_LEVEL,
	SPARK_CHARS,
	STATUS_REFRESH_INTERVAL_MS,
	STATUS_WINDOW_DAYS,
} from "@/lib/const";
import type { CacheEntry } from "@/lib/schema";
import type { ContributionDay } from "@/lib/types";
import { currentStreak, localTodayISO } from "@/streak";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The --status path: a one-line cached summary cheap enough for a tmux status
 * bar or starship prompt to call every few seconds. Never blocks on the
 * network when a cache exists — index.tsx prints from here and, if the entry
 * is stale, refetches in a detached child (stale-while-revalidate).
 *
 * Unlike ~/.termheat.json (user-authored — corrupt is an error), the cache is
 * disposable: unreadable or corrupt just means empty, and the next fetch
 * rewrites it.
 */

export type StatusCache = Record<string, CacheEntry>;

export function cachePath(): string {
	return join(homedir(), `.${APP_NAME}-cache.json`);
}

export async function readCache(path: string = cachePath()): Promise<StatusCache> {
	let raw: string;
	try {
		raw = await readFile(path, "utf8");
	} catch {
		return {};
	}
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
		const cache: StatusCache = {};
		for (const [username, entry] of Object.entries(parsed as Record<string, unknown>)) {
			if (isCacheEntry(entry)) cache[username] = entry;
		}
		return cache;
	} catch {
		return {};
	}
}

export async function writeCacheEntry(
	username: string,
	days: ContributionDay[],
	path: string = cachePath(),
	now: Date = new Date(),
): Promise<void> {
	const cache = await readCache(path);
	cache[username] = { fetchedAt: now.toISOString(), days };
	await writeFile(path, JSON.stringify(cache), "utf8");
}

export function isStale(entry: CacheEntry, ttlMinutes: number, now: Date = new Date()): boolean {
	const fetched = Date.parse(entry.fetchedAt);
	if (Number.isNaN(fetched)) return true;
	return now.getTime() - fetched > ttlMinutes * STATUS_REFRESH_INTERVAL_MS;
}

/** The one-liner itself: `🔥 37d ▁▃▅█▇` (or `37d .-=+#` under --ascii). */
export function statusLine(days: ContributionDay[], opts: { ascii?: boolean; today?: string } = {}): string {
	const today = opts.today ?? localTodayISO();
	const streak = currentStreak(days, today);
	const window = days
		.filter((day) => day.date <= today)
		.sort((a, b) => (a.date < b.date ? -1 : 1))
		.slice(-STATUS_WINDOW_DAYS)
		.map((day) => day.count);
	const ramp = opts.ascii ? ASCII_SPARK_CHARS : SPARK_CHARS;
	const flame = opts.ascii ? "" : "🔥 ";
	return `${flame}${streak}d ${sparkline(window, ramp)}`;
}

/**
 * Maps one count per day onto ramp glyphs, quietest → loudest: one glyph per
 * count, in order.
 *
 * Scaling is absolute, through the grid's own levelFor buckets — never
 * relative to the window's max. Two product reasons: a day's glyph is the
 * same fact the heatmap shows for that cell (the sparkline is the grid's last
 * two weeks in miniature), and it's stable — relative scaling re-heights old
 * days as the window slides past a spike, so the status bar would rewrite
 * history every morning. Consistency reads as a steady skyline; one huge day
 * doesn't flatten the week around it.
 */
export function sparkline(counts: number[], ramp: readonly string[] = SPARK_CHARS): string {
	const loudest = ramp.length - 1;
	return counts.map((count) => ramp[Math.round((levelFor(count) / MAX_LEVEL) * loudest)]!).join("");
}

function isCacheEntry(value: unknown): value is CacheEntry {
	if (typeof value !== "object" || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.fetchedAt === "string" &&
		Array.isArray(entry.days) &&
		entry.days.every(
			(day: unknown) =>
				typeof day === "object" &&
				day !== null &&
				typeof (day as ContributionDay).date === "string" &&
				typeof (day as ContributionDay).count === "number",
		)
	);
}
