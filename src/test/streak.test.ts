import { describe, expect, test } from "bun:test";
import {
  currentStreak,
  currentStreakDates,
  daysSinceLastContribution,
  longestStreak,
  totalContributions,
} from "@/streak";
import type { ContributionDay } from "@/lib/types";

function makeDays(startISO: string, counts: number[]): ContributionDay[] {
  const start = Date.parse(`${startISO}T00:00:00Z`);
  return counts.map((count, i) => ({
    date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
    count,
  }));
}

describe("totalContributions", () => {
  test("sums all days", () => {
    expect(totalContributions(makeDays("2026-07-01", [1, 0, 4, 2]))).toBe(7);
  });
});

describe("longestStreak", () => {
  test("finds the longest run, not the last one", () => {
    //                                          ↓ run of 4        ↓ run of 2
    const days = makeDays("2026-06-01", [1, 0, 3, 1, 2, 9, 0, 0, 1, 1, 0]);
    expect(longestStreak(days)).toBe(4);
  });

  test("is 0 when nothing was ever contributed", () => {
    expect(longestStreak(makeDays("2026-06-01", [0, 0, 0]))).toBe(0);
  });

  test("tolerates unsorted input", () => {
    expect(longestStreak(makeDays("2026-06-01", [1, 1, 1, 0]).reverse())).toBe(
      3,
    );
  });
});

describe("daysSinceLastContribution", () => {
  const days = makeDays("2026-07-01", [2, 0, 0]); // active Jul 1, empty Jul 2–3

  test("0 when today is active", () => {
    expect(daysSinceLastContribution(days, "2026-07-01")).toBe(0);
  });

  test("counts whole days back to the last active day", () => {
    expect(daysSinceLastContribution(days, "2026-07-03")).toBe(2);
  });

  test("null when the range has no contributions at all", () => {
    expect(
      daysSinceLastContribution(makeDays("2026-07-01", [0, 0]), "2026-07-02"),
    ).toBeNull();
  });

  test("ignores future-dated cells (calendar includes the rest of this week)", () => {
    const withFuture = makeDays("2026-07-01", [3, 0, 0, 8]); // Jul 4 is "future"
    expect(daysSinceLastContribution(withFuture, "2026-07-03")).toBe(2);
  });
});

describe("currentStreak (lenient: today is in play until midnight)", () => {
  test("counts through an active today", () => {
    const days = makeDays("2026-07-01", [0, 1, 2, 5]); // active Jul 2–4
    expect(currentStreak(days, "2026-07-04")).toBe(3);
  });

  test("an empty today keeps yesterday's streak alive", () => {
    const days = makeDays("2026-07-01", [1, 1, 1, 0]); // empty today Jul 4
    expect(currentStreak(days, "2026-07-04")).toBe(3);
  });

  test("is 0 once yesterday has fully elapsed empty", () => {
    const days = makeDays("2026-07-01", [1, 1, 0, 0]);
    expect(currentStreak(days, "2026-07-04")).toBe(0);
  });

  test("ignores future-dated calendar cells", () => {
    const days = makeDays("2026-07-01", [1, 1, 0, 9]); // Jul 4 is "future"
    // Jul 1–2 streak survives an empty in-play today; the future 9 adds nothing.
    expect(currentStreak(days, "2026-07-03")).toBe(2);
  });

  test("is 0 when nothing was ever contributed", () => {
    expect(currentStreak(makeDays("2026-07-01", [0, 0, 0]), "2026-07-03")).toBe(
      0,
    );
  });
});

describe("currentStreakDates", () => {
  test("returns the streak's dates oldest → newest", () => {
    const days = makeDays("2026-07-01", [0, 1, 2, 5]); // active Jul 2–4
    expect(currentStreakDates(days, "2026-07-04")).toEqual([
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
    ]);
  });

  test("excludes an empty in-play today but keeps the days behind it", () => {
    const days = makeDays("2026-07-01", [1, 1, 1, 0]); // empty today Jul 4
    expect(currentStreakDates(days, "2026-07-04")).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });

  test("is empty once the streak is broken", () => {
    expect(
      currentStreakDates(makeDays("2026-07-01", [1, 1, 0, 0]), "2026-07-04"),
    ).toEqual([]);
  });

  test("agrees with currentStreak", () => {
    const days = makeDays("2026-07-01", [1, 0, 1, 1, 9]);
    expect(currentStreakDates(days, "2026-07-05")).toHaveLength(
      currentStreak(days, "2026-07-05"),
    );
  });
});
