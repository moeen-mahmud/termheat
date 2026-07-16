---
"termheat": minor
---

Share it: `--export svg` writes a self-contained animated SVG card of your heatmap — reveal wipe and streak flames embedded as CSS, so it animates right inside GitHub READMEs. `--export png` rasterizes the same card via the lazy-optional `@resvg/resvg-js` (install hint when absent, npx cold start unaffected). New `--status` prints a cached sub-100ms one-liner (`🔥 37d ▁▃▅█▇`) with a two-week sparkline for tmux status bars and starship prompts, refreshing stale data in a detached background process. Plus `--out <file>` to control where exports land.
