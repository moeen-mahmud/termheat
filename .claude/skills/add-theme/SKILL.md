---
name: add-theme
description: Add a new color theme (palette) to TermHeat following the repo's theme registry conventions — THEMES const, THEME_MAP, hex format rules, and the live-verification pass. Use this whenever adding, tweaking, or reviewing a theme or palette, when a contributor PR adds one, or when a task mentions colors, palettes, THEME_MAP, FIRE_RAMP, or scaleHex in this repo. Themes are the project's #1 planned community-contribution path (ROADMAP.md v1.3), so expect to apply this often.
---

# Adding a theme to TermHeat

A theme is data, not code: 5 hex levels + an accent. Two files change, and the
help text / flag validation update themselves.

## 1. `src/lib/const.ts` — register the name

Add the name to `THEMES`. Everything else derives from this array:
`ThemeName` (in `types.ts`) is `(typeof THEMES)[number]`, the `--theme` flag
validation in `args.ts` checks membership, and `HELP` joins the array — so
there is nothing to update manually in the CLI layer.

```ts
export const THEMES = ["github", "fire", "ocean", "mono", "neon"] as const;
```

TypeScript now errors on `THEME_MAP` until step 2 adds the entry — that's the
registry keeping itself honest (`Record<ThemeName, Theme>` is exhaustive).

## 2. `src/themes.ts` — add the palette to `THEME_MAP`

```ts
neon: {
  name: "neon",
  levels: ["#30363d", "#3b0764", "#7e22ce", "#c026d3", "#f0abfc"],
  accent: "#c026d3",
},
```

Hard rules (breaking these breaks the animation math, not just aesthetics):

- **Every color must be 6-digit lowercase `#rrggbb`.** `scaleHex` parses
  channel pairs at string positions 1/3/5 — shorthand (`#fff`), named colors,
  and alpha channels all silently corrupt the breathe effect.
- **`levels[0]` is the empty-day color and does not breathe.** Keep it muted
  (the shared `"#30363d"` works on dark terminals) so zero-days recede — the
  "flat blocks, quiet zeroes" design decision.
- **Levels 1→4 must read as increasing intensity** against a dark background;
  contribution level maps directly to the palette index.
- **Streak cells ignore the theme.** Current-streak cells always render in
  `FIRE_RAMP` (a deliberate product decision: the 🔥 must be visible in every
  theme). Don't try to theme the fire.
- `accent` is used for emphasis text (streak counter, title highlights) — pick
  the palette's most saturated mid-tone.

## 3. Tests — `src/test/themes.test.ts`

Extend the existing suite so the new theme is covered by the same invariants
as the others: `themeFor(name)` returns it, it has exactly 5 levels, and every
color matches `/^#[0-9a-f]{6}$/`.

## 4. Verify live (colors lie in the abstract)

```bash
bun test src/test/themes.test.ts && bunx tsc --noEmit
bun run src/index.tsx moeen-mahmud -t neon
```

In a real terminal check: levels are distinguishable at a glance, level 0
recedes, the breathe effect is visible but not strobing, and the fire ramp
still stands out against the new palette. Also confirm the theme name appears
in `bun run src/index.tsx --help` (it derives from `THEMES` automatically).
