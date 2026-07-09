import { Box, Text } from "ink";
import { monthLabelRow } from "@/heatmap";
import { revealProgress } from "@/hooks/useAnimation";
import {
  ANIMATION_BREATHE_EXP_LEFT,
  ANIMATION_BREATHE_EXP_RIGHT,
  CHARS,
  DEFAULT_CELL_LEVELS,
  FLICKER_FREQUENCY,
  FLICKER_LEFT,
  FLICKER_PHASE_OFFSET,
  FLICKER_RIGHT,
  WEEKDAY_LABELS,
  WEEKDAYS,
} from "@/lib/const";
import { FIRE_RAMP, scaleHex } from "@/themes";
import type { HeatmapProps } from "@/lib/schema";

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
  const breathe =
    ANIMATION_BREATHE_EXP_LEFT + ANIMATION_BREATHE_EXP_RIGHT * anim.breathe;
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

            const fire =
              cell.count > 0 ? streakIndex.get(cell.date) : undefined;
            let color: string;
            let bold = cell.level === DEFAULT_CELL_LEVELS[4]; // bold the darkest level by default
            if (fire !== undefined) {
              // Streak cells shimmer independently, phase-offset per cell.
              const ramp =
                FIRE_RAMP[
                  Math.floor((fire / streakDates.length) * FIRE_RAMP.length)
                ]!;
              const flicker =
                FLICKER_LEFT +
                FLICKER_RIGHT *
                  Math.sin(
                    anim.tick * FLICKER_FREQUENCY + fire * FLICKER_PHASE_OFFSET,
                  );
              color = scaleHex(ramp, flicker);
              bold = true;
            } else if (cell.level === DEFAULT_CELL_LEVELS[0]) {
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
