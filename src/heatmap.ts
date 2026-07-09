import { MONTHS } from "@/lib/const";
import type { ContributionDay, Heatmap, Level, Week } from "@/lib/types";

/**
 * Buckets a daily count into a GitHub-style intensity level.
 * Thresholds per PLAN.md: 0 / 1–3 / 4–7 / 8–14 / 15+.
 */
export function levelFor(count: number): Level {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 14) return 3;
  return 4;
}

/**
 * Lays out a year of days as GitHub does: columns are weeks, rows are
 * weekdays, Sunday-first. Edge weeks are padded with `null` so the first
 * column starts on whatever weekday the data begins.
 */
export function buildHeatmap(days: ContributionDay[]): Heatmap {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
  const weeks: Week[] = [];
  let week: Week | null = null;
  let total = 0;

  for (const day of sorted) {
    const weekday = dayOfWeek(day.date);
    if (week === null || weekday === 0) {
      week = Array<null>(7).fill(null);
      weeks.push(week);
    }
    week[weekday] = { ...day, level: levelFor(day.count) };
    total += day.count;
  }

  return { weeks, total };
}

/** 0 = Sunday … 6 = Saturday, computed in UTC to match GitHub's date strings. */
export function dayOfWeek(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

/**
 * A header string with month names positioned over the week (column) where
 * each month first appears. Each week column is `cellWidth` characters wide.
 * A label is dropped if it would collide with the previous one (possible when
 * a month spans a single week column); the final label may spill past the
 * grid's right edge, which is harmless in a header row.
 */
export function monthLabelRow(weeks: Week[], cellWidth = 2): string {
  const slots = Array<string>(weeks.length * cellWidth).fill(" ");
  let lastMonth = -1;
  let nextFree = 0;
  weeks.forEach((week, i) => {
    const first = week.find((cell) => cell !== null);
    if (!first) return;
    const month = Number(first.date.slice(5, 7)) - 1;
    if (month === lastMonth) return;
    lastMonth = month;
    const label = MONTHS[month]!;
    const start = i * cellWidth;
    if (start < nextFree) return;
    while (slots.length < start + label.length) slots.push(" ");
    for (let j = 0; j < label.length; j++) slots[start + j] = label[j]!;
    nextFree = start + label.length + 1;
  });
  return slots.join("");
}
