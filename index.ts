// smoke CLI: proves fetch → grid → streak end-to-end with a
// static render. Replaced by src/index.tsx + Ink components in Day 2.
//   bun run index.ts <github-username>

import { fetchContributions, GitHubError } from "./src/github";
import { buildHeatmap } from "./src/heatmap";
import {
  currentStreak,
  daysSinceLastContribution,
  longestStreak,
  totalContributions,
} from "./src/streak";

const CHARS = ["░░", "▒▒", "▓▓", "██", "██"] as const;
const COLORS = [
  "\x1b[38;5;238m", // 0: dim gray
  "\x1b[38;5;22m", //  1: deep green
  "\x1b[38;5;28m", //  2
  "\x1b[38;5;40m", //  3
  "\x1b[1;38;5;46m", // 4: bright green, bold
] as const;
const RESET = "\x1b[0m";
const WEEKDAY_LABELS = ["   ", "Mon", "   ", "Wed", "   ", "Fri", "   "];

const username = process.argv[2];
if (!username) {
  console.error("usage: bun run index.ts <github-username>");
  process.exit(1);
}

try {
  const days = await fetchContributions(username);
  const heatmap = buildHeatmap(days);

  console.log(`\n  🔥 termheat — ${username}\n`);
  for (let weekday = 0; weekday < 7; weekday++) {
    const row = heatmap.weeks
      .map((week) => {
        const cell = week[weekday];
        return cell
          ? `${COLORS[cell.level]}${CHARS[cell.level]}${RESET}`
          : "  ";
      })
      .join("");
    console.log(`  ${WEEKDAY_LABELS[weekday]} ${row}`);
  }

  console.log(`\n  Total this year:  ${totalContributions(days)}`);
  console.log(`  Longest streak:   ${longestStreak(days)} days`);
  const idle = daysSinceLastContribution(days);
  console.log(
    `  Last contributed: ${idle === null ? "never 😶" : idle === 0 ? "today" : `${idle} day(s) ago`}`,
  );
  console.log(`  Current streak:   🔥 ${currentStreak(days)} days\n`);
} catch (err) {
  if (err instanceof GitHubError) {
    console.error(`termheat: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
