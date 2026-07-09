import type { Theme } from "@/lib/schema";
import type { ThemeName } from "@/lib/types";

/**
 * Current-streak cells burn in this ramp regardless of theme (user decision:
 * the 🔥 stat should be visible in the grid itself). Oldest → newest,
 * red-orange → yellow: the hottest color sits on today.
 */
export const FIRE_RAMP = ["#ff5f1f", "#ff8c42", "#ffb627", "#ffd23f"] as const;

const THEME_MAP: Record<ThemeName, Theme> = {
  github: {
    name: "github",
    // GitHub's actual dark-mode contribution palette.
    levels: ["#30363d", "#0e4429", "#006d32", "#26a641", "#39d353"],
    accent: "#39d353",
  },
  fire: {
    name: "fire",
    levels: ["#30363d", "#7f1d1d", "#c2410c", "#f97316", "#fbbf24"],
    accent: "#f97316",
  },
  ocean: {
    name: "ocean",
    levels: ["#30363d", "#164e63", "#0e7490", "#38bdf8", "#a5b4fc"],
    accent: "#38bdf8",
  },
  mono: {
    name: "mono",
    levels: ["#30302f", "#585858", "#8a8a8a", "#bcbcbc", "#ffffff"],
    accent: "#ffffff",
  },
};

export function themeFor(name: ThemeName): Theme {
  return THEME_MAP[name];
}

/**
 * Scales a `#rrggbb` color's brightness toward black. factor 1 = unchanged,
 * 0 = black. This is what makes cells "breathe": the animation varies the
 * factor over time instead of swapping palette entries.
 */
export function scaleHex(hex: string, factor: number): string {
  const f = Math.max(0, Math.min(1, factor));
  const channels = [1, 3, 5].map((i) => {
    const value = Math.round(parseInt(hex.slice(i, i + 2), 16) * f);
    return value.toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}
