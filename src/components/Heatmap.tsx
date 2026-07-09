import { Box, Text } from "ink";
import { monthLabelRow } from "@/heatmap";
import { revealProgress } from "@/hooks/useAnimation";
import type { AnimationFrame } from "@/hooks/useAnimation";
import { CHARS, WEEKDAY_LABELS } from "@/lib/const";
import type { Heatmap as HeatmapData, Theme } from "@/lib/types";
import { FIRE_RAMP, scaleHex } from "@/themes";

interface HeatmapProps {
  heatmap: HeatmapData;
  theme: Theme;
  /** Dates of the current streak, oldest → newest (see currentStreakDates). */
  streakDates: string[];
  anim: AnimationFrame;
  /** Tick at which the current data arrived; null = no wipe (static render). */
  revealFrom: number | null;
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function Heatmap({
  heatmap,
  theme,
  streakDates,
  anim,
  revealFrom,
}: HeatmapProps) {
  const { weeks } = heatmap;
  const reveal =
    revealFrom === null ? 1 : revealProgress(anim.tick, revealFrom);
  // Whole grid gently breathes between 72% and 100% brightness.
  const breathe = 0.72 + 0.28 * anim.breathe;
  const streakIndex = new Map(streakDates.map((date, i) => [date, i]));

  return (
    <Box flexDirection="column">
      <Text dimColor>{`      ${monthLabelRow(weeks)}`}</Text>
      {WEEKDAYS.map((weekday) => (
        <Box key={weekday}>
          <Text dimColor>{`  ${WEEKDAY_LABELS[weekday]} `}</Text>
          {weeks.map((week, w) => {
            const cell = week[weekday];
            // Chronological wipe: columns appear oldest-first as reveal 0→1.
            if (!cell || w / weeks.length > reveal)
              return <Text key={cell?.date ?? `pad-${w}`}>{"  "}</Text>;

            const fire = cell.count > 0 ? streakIndex.get(cell.date) : undefined;
            let color: string;
            let bold = cell.level === 4;
            if (fire !== undefined) {
              // Streak cells shimmer independently, phase-offset per cell.
              const ramp =
                FIRE_RAMP[
                  Math.floor((fire / streakDates.length) * FIRE_RAMP.length)
                ]!;
              const flicker =
                0.78 + 0.22 * Math.sin(anim.tick * 0.9 + fire * 1.1);
              color = scaleHex(ramp, flicker);
              bold = true;
            } else if (cell.level === 0) {
              color = theme.levels[0]; // empty dots don't breathe
            } else {
              color = scaleHex(theme.levels[cell.level], breathe);
            }
            return (
              <Text key={cell.date} bold={bold} color={color}>
                {CHARS[cell.level]}
              </Text>
            );
          })}
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>{"      Less "}</Text>
        {theme.levels.map((color, level) => (
          <Text key={color} bold={level === 4} color={color}>
            {`${CHARS[level]} `}
          </Text>
        ))}
        <Text dimColor>More</Text>
      </Box>
    </Box>
  );
}
