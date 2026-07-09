import { describe, expect, test } from "bun:test";
import { buildHeatmap, dayOfWeek, levelFor, monthLabelRow } from "@/heatmap";
import type { ContributionDay } from "@/lib/types";

function makeDays(startISO: string, counts: number[]): ContributionDay[] {
  const start = Date.parse(`${startISO}T00:00:00Z`);
  return counts.map((count, i) => ({
    date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
    count,
  }));
}

describe("levelFor", () => {
  test("buckets counts at PLAN.md thresholds", () => {
    expect(levelFor(0)).toBe(0);
    expect(levelFor(1)).toBe(1);
    expect(levelFor(3)).toBe(1);
    expect(levelFor(4)).toBe(2);
    expect(levelFor(7)).toBe(2);
    expect(levelFor(8)).toBe(3);
    expect(levelFor(14)).toBe(3);
    expect(levelFor(15)).toBe(4);
    expect(levelFor(100)).toBe(4);
  });
});

describe("buildHeatmap", () => {
  test("14 days starting on a Sunday fill exactly two full weeks", () => {
    // 2026-06-28 is a Sunday
    const heatmap = buildHeatmap(makeDays("2026-06-28", Array(14).fill(1)));
    expect(heatmap.weeks).toHaveLength(2);
    expect(
      heatmap.weeks.every((week) => week.every((cell) => cell !== null)),
    ).toBe(true);
  });

  test("data starting mid-week pads the first column with nulls", () => {
    // 2026-07-01 is a Wednesday (weekday 3)
    const heatmap = buildHeatmap(makeDays("2026-07-01", [5, 5, 5, 5]));
    const first = heatmap.weeks[0]!;
    expect(first.slice(0, 3)).toEqual([null, null, null]);
    expect(first[3]?.date).toBe("2026-07-01");
    expect(first[3]?.level).toBe(2);
  });

  test("totals sum every day and unsorted input is tolerated", () => {
    const days = makeDays("2026-06-28", [1, 0, 2, 3]).reverse();
    expect(buildHeatmap(days).total).toBe(6);
  });
});

describe("dayOfWeek", () => {
  test("uses UTC so cells land in GitHub's columns regardless of local tz", () => {
    expect(dayOfWeek("2026-06-28")).toBe(0); // Sunday
    expect(dayOfWeek("2026-07-04")).toBe(6); // Saturday
  });
});

describe("monthLabelRow", () => {
  test("places each month name over the week where it first appears", () => {
    // 5 weeks from Sunday 2026-06-07: Jun weeks 0–3, Jul starts week 4
    const heatmap = buildHeatmap(makeDays("2026-06-07", Array(35).fill(1)));
    const row = monthLabelRow(heatmap.weeks);
    expect(row.startsWith("Jun")).toBe(true);
    expect(row.indexOf("Jul")).toBe(8); // week 4 × cellWidth 2
  });

  test("drops a label that would collide with the previous one", () => {
    // Jun gets only week 0, so Jul's label (week 1, slot 2) would overwrite
    // Jun's third letter — Jul is dropped rather than rendering "JuJul".
    const heatmap = buildHeatmap(makeDays("2026-06-28", Array(21).fill(1)));
    expect(monthLabelRow(heatmap.weeks)).toBe("Jun   ");
  });

  test("a label in the last column spills past the edge instead of vanishing", () => {
    // 5 weeks from Sunday 2026-06-07: Jul leads the final column (slot 8),
    // and its 3 chars exceed the 10-slot grid width by 1.
    const heatmap = buildHeatmap(makeDays("2026-06-07", Array(35).fill(1)));
    expect(monthLabelRow(heatmap.weeks)).toBe("Jun     Jul");
  });

  test("respects a custom cell width", () => {
    const heatmap = buildHeatmap(makeDays("2026-06-07", Array(35).fill(1)));
    expect(monthLabelRow(heatmap.weeks, 3).indexOf("Jul")).toBe(12);
  });
});
