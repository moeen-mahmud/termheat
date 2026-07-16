# termheat

## 1.1.0

### Minor Changes

- baa07af: Share it: `--export svg` writes a self-contained animated SVG card of your heatmap — reveal wipe and streak flames embedded as CSS, so it animates right inside GitHub READMEs. `--export png` rasterizes the same card via the lazy-optional `@resvg/resvg-js` (install hint when absent, npx cold start unaffected). New `--status` prints a cached sub-100ms one-liner (`🔥 37d ▁▃▅█▇`) with a two-week sparkline for tmux status bars and starship prompts, refreshing stale data in a detached background process. Plus `--out <file>` to control where exports land.

## 1.0.0

### Major Changes

- 5071652: First stable release 🔥

  - `npx termheat <username>` — animated GitHub contribution heatmap in the terminal, zero auth and zero config
  - Breathing grid, chronological reveal wipe, and a fire-ramp glow on your current streak
  - Four themes (`github`, `fire`, `ocean`, `mono`) via `--theme`
  - Gentle, opt-in shame mode (`--shame`) and watch mode (`--watch`)
  - Optional `GITHUB_TOKEN` for exact counts via the GraphQL API
  - Robust everywhere: honors `NO_COLOR`, `--no-animation`/`--static` for static output, `--ascii` for basic terminals, and CI-safe piped output that renders one frame and exits
  - Config file at `~/.termheat.json` for username, theme, shame, and refresh interval
