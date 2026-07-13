# termheat

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
