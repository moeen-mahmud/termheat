import { Box, Text } from "ink";
import { shameLine } from "@/lib/shame";
import type { ContributionDay, Theme } from "@/lib/types";
import {
  daysSinceLastContribution,
  longestStreak,
  totalContributions,
} from "@/streak";

interface StatsBarProps {
  days: ContributionDay[];
  streakLength: number;
  theme: Theme;
  shame: boolean;
  watch: boolean;
  refreshMinutes: number;
  /** True while a background refetch is in flight. */
  refreshing: boolean;
  interactive: boolean;
}

export function StatsBar({
  days,
  streakLength,
  theme,
  shame,
  watch,
  refreshMinutes,
  refreshing,
  interactive,
}: StatsBarProps) {
  const idle = daysSinceLastContribution(days);
  const nag = shame ? shameLine(idle) : null;
  const lastContributed =
    idle === null ? "never 😶" : idle === 0 ? "today" : `${idle} day(s) ago`;

  return (
    <Box flexDirection="column" marginTop={1} marginLeft={2}>
      <Text>
        Total this year:  <Text bold>{totalContributions(days)}</Text>
      </Text>
      <Text>
        Longest streak:   <Text bold>{longestStreak(days)} days</Text>
      </Text>
      <Text>Last contributed: {lastContributed}</Text>
      <Text>
        Current streak:{"   "}
        <Text bold color={theme.accent}>
          🔥 {streakLength} days
        </Text>
      </Text>
      {nag && (
        <Box marginTop={1}>
          <Text color="yellow">{nag}</Text>
        </Box>
      )}
      {interactive && (
        <Box marginTop={1}>
          <Text dimColor>
            [q] quit  [r] refresh
            {watch && `  ⟳ auto-refresh every ${refreshMinutes}m`}
            {refreshing && "  · refreshing…"}
          </Text>
        </Box>
      )}
    </Box>
  );
}
