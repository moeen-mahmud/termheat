// smoke CLI: proves fetch → grid → streak end-to-end with a
// static render. Replaced by src/index.tsx + Ink components in Day 2.
//   bun run index.ts <github-username>

import { fetchContributions, GitHubError } from "@/github";
import { buildHeatmap } from "@/heatmap";
import {
  CHARS,
  COLORS,
  FIRE,
  MONTHS,
  RESET,
  WEEKDAY_LABELS,
} from "@/lib/const";
import type { Week } from "@/lib/types";
import {
  currentStreakDates,
  daysSinceLastContribution,
  longestStreak,
  totalContributions,
} from "@/streak";

/** Month names positioned over the week (column) where each month begins. */
function monthLabelRow(weeks: Week[]): string {
  const slots = Array<string>(weeks.length * 2).fill(" ");
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const first = week.find((cell) => cell !== null);
    if (!first) return;
    const month = Number(first.date.slice(5, 7)) - 1;
    if (month === lastMonth) return;
    lastMonth = month;
    const label = MONTHS[month]!;
    if (i * 2 + label.length > slots.length) return; // no room at the right edge
    for (let j = 0; j < label.length; j++) slots[i * 2 + j] = label[j]!;
  });
  return slots.join("");
}

const username = process.argv[2];
if (!username) {
  console.error("usage: bun run index.ts <github-username>");
  process.exit(1);
}

try {
  const days = await fetchContributions(username);
  const heatmap = buildHeatmap(days);

  const streakDates = currentStreakDates(days);
  const fireFor = new Map(
    streakDates.map((date, i) => [
      date,
      FIRE[Math.floor((i / streakDates.length) * FIRE.length)]!,
    ]),
  );

  console.log(`\n  🔥 termheat — ${username}\n`);
  console.log(`      ${monthLabelRow(heatmap.weeks)}`);
  for (let weekday = 0; weekday < 7; weekday++) {
    const row = heatmap.weeks
      .map((week) => {
        const cell = week[weekday];
        if (!cell) return "  ";
        const color = fireFor.get(cell.date) ?? COLORS[cell.level];
        return `${color}${CHARS[cell.level]}${RESET}`;
      })
      .join("");
    console.log(`  ${WEEKDAY_LABELS[weekday]} ${row}`);
  }

  const legend = COLORS.map((c, i) => `${c}${CHARS[i]}${RESET}`).join(" ");
  console.log(`\n      Less ${legend} More`);

  console.log(`\n  Total this year:  ${totalContributions(days)}`);
  console.log(`  Longest streak:   ${longestStreak(days)} days`);
  const idle = daysSinceLastContribution(days);
  console.log(
    `  Last contributed: ${idle === null ? "never 😶" : idle === 0 ? "today" : `${idle} day(s) ago`}`,
  );
  console.log(`  Current streak:   🔥 ${streakDates.length} days\n`);
} catch (err) {
  if (err instanceof GitHubError) {
    console.error(`termheat: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
