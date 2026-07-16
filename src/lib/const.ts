import { version } from "../../package.json";

// --- Constants used throughout the project. ---

export const APP_NAME = "termheat";

export const APP_VERSION = version;

export const THEMES = ["github", "fire", "ocean", "mono"] as const;

export const DEFAULT_THEME = "github" as const;

export const EXPORT_FORMATS = ["svg", "png"] as const;

export const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export const CONTRIBUTIONS_URL = (username: string) =>
	`https://github.com/users/${encodeURIComponent(username)}/contributions`;

// Flat blocks, quiet zeroes: color carries intensity, empty days recede.
// Colors live in src/themes.ts — Ink renders them, no raw ANSI here.
export const CHARS = ["··", "██", "██", "██", "██"] as const;
// --ascii / NO_COLOR fallback: glyph density carries intensity where block
// characters or color can't be relied on.
export const ASCII_CHARS = ["..", "--", "++", "**", "##"] as const;
export const WEEKDAY_LABELS = ["   ", "Mon", "   ", "Wed", "   ", "Fri", "   "];
export const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

// --status sparkline ramps, quietest → loudest. Lengths may differ; the
// sparkline maps counts onto whichever ramp it's given.
export const SPARK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;
export const ASCII_SPARK_CHARS = [".", "-", "=", "+", "*", "#"] as const;
export const STATUS_WINDOW_DAYS = 14;
/** Cache older than this triggers a detached background refetch. */
export const STATUS_TTL_MINUTES = 30;

export const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

export const ASCII_SPINNER = ["|", "/", "-", "\\"] as const;

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export const FPS = 8;
export const ANIMATION_BREATHE_EXP_LEFT = 0.72; // 72% brightness at the left of the sine wave
export const ANIMATION_BREATHE_EXP_RIGHT = 0.28; // 100% brightness at the right of the sine wave
export const FLICKER_LEFT = 0.78; // 78% brightness at the left of the sine wave
export const FLICKER_RIGHT = 0.22; // 100% brightness at the right of the sine wave
export const FLICKER_FREQUENCY = 0.9; // flicker frequency in Hz
export const FLICKER_PHASE_OFFSET = 1.1; // phase offset for flicker in radians

export const DEFAULT_CELL_LEVELS = [0, 1, 2, 3, 4] as const;

export const REVEAL_SECONDS = 2;
export const BREATHE_SECONDS = 4;
export const STD_OUT_COLUMNS = 80;
export const DEFAULT_REFRESH_INTERVAL_SECONDS = 60_000;
export const VISIBLE_HEATMAP_COLUMNS_MIN = 7;
export const VISIBLE_HEATMAP_FIT = 4; // minimum number of weeks to show when fitting to terminal width
export const COLUMN_WIDTH = 2; // two chars per day, no padding
