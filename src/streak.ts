import type { ContributionDay } from "@/lib/types";

export function totalContributions(days: ContributionDay[]): number {
	return days.reduce((sum, day) => sum + day.count, 0);
}

/** Longest run of consecutive active days anywhere in the range. */
export function longestStreak(days: ContributionDay[]): number {
	let best = 0;
	let run = 0;
	for (const day of sortByDate(days)) {
		run = day.count > 0 ? run + 1 : 0;
		if (run > best) best = run;
	}
	return best;
}

/**
 * Whole days since the most recent active day (0 = contributed today).
 * Returns null if the range contains no contributions at all.
 * Feeds shame mode: "🐌 You haven't pushed in N days".
 */
export function daysSinceLastContribution(days: ContributionDay[], today: string = localTodayISO()): number | null {
	const sorted = sortByDate(days);
	for (let i = sorted.length - 1; i >= 0; i--) {
		const day = sorted[i]!;
		if (day.date > today) continue;
		if (day.count > 0) return diffDays(day.date, today);
	}
	return null;
}

/**
 * Consecutive active days ending at (or leading up to) today.
 *
 * Lenient semantics, matching GitHub's own profile: an empty *today* doesn't
 * break the streak — the day is still in play until midnight. The streak only
 * resets once a fully elapsed day (yesterday or earlier) has no contributions.
 */
export function currentStreak(days: ContributionDay[], today: string = localTodayISO()): number {
	return currentStreakDates(days, today).length;
}

/**
 * The dates (oldest → newest) making up the current streak. Same lenient
 * semantics as currentStreak — this is the single source of truth for both
 * the counter and the renderer's streak highlight.
 */
export function currentStreakDates(days: ContributionDay[], today: string = localTodayISO()): string[] {
	const sorted = sortByDate(days);
	const dates: string[] = [];
	for (let i = sorted.length - 1; i >= 0; i--) {
		const day = sorted[i]!;
		if (day.date > today) continue; // calendar includes the rest of this week
		if (day.count > 0) dates.push(day.date);
		else if (day.date === today)
			continue; // today is still in play
		else break;
	}
	return dates.reverse();
}

// --- helpers ---

function sortByDate(days: ContributionDay[]): ContributionDay[] {
	return [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Today as YYYY-MM-DD in the user's local timezone — streaks are lived locally. */
export function localTodayISO(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function diffDays(fromISO: string, toISO: string): number {
	const from = Date.parse(`${fromISO}T00:00:00Z`);
	const to = Date.parse(`${toISO}T00:00:00Z`);
	return Math.round((to - from) / 86_400_000);
}
