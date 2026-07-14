# TermHeat Roadmap 🗺️

> One flagship feature per minor version. Each release should be a self-contained
> announcement, not a grab-bag.

TermHeat's positioning, informed by a survey of the space (July 2026): every
existing terminal contribution tool renders one static frame and exits, and most
require `gh` auth or a token. Nothing animates, nothing gamifies, nothing has
personality. TermHeat's combination — `npx`, zero-auth, animated, streak-gamified,
playful — is the unclaimed spot this roadmap defends.

## Standing principles

These apply to every version and outrank any feature below:

1. `npx termheat <user>` stays **zero-auth, zero-config, and fast to first paint**.
   `GITHUB_TOKEN` is always an upgrade, never a gate.
2. New runtime dependencies only when a flagship feature earns one — and lazy or
   optional wherever possible, so npx cold start never pays for a feature you
   didn't use.
3. The HTML scrape parser stays defensive, covered by fixture tests, and degrades
   with a helpful "set GITHUB_TOKEN" hint — never a stack trace.
4. Shame mode stays witty and opt-in. Praise on ship-days, humor on idle days,
   never mean-spirited.
5. Every release ships with a refreshed VHS demo GIF and a copy-pasteable
   one-line announcement.

---

## v1.0.0 — Launch

_The `npx termheat <username>` one-liner is flawless and screenshot-ready._

- [x] npm packaging: `bin/termheat.js` shebang, single-file `bun build --target=node`
      bundle (React + Ink bundled in, 856 kB unpacked, no sourcemaps)
- [x] Release automation: changesets + GitHub Actions (CI, Version-Packages PR,
      auto-publish on merge with Node smoke tests as the gate)
- [x] README led by a demo GIF, scripted with a checked-in `termheat.tape` (VHS)
      and regenerated in CI so it never goes stale
- [x] Robustness: honor `NO_COLOR`, add `--no-animation` / `--static`, and an
      `--ascii` cell fallback for basic terminals and fonts
- [ ] Launch week: Show HN, r/commandline, Terminal Trove

## v1.1.0 — Share it

_Flagship: `termheat --export svg`._

- [ ] SVG export — pure template-literal `<rect>` rendering reusing the existing
      data modules and theme palettes, with the reveal-wipe animation embedded as
      SMIL/CSS so the card is **animated wherever SVG renders** (including GitHub
      READMEs). Includes streak counter and a "made with npx termheat" credit line.
- [ ] `--export png` via `@resvg/resvg-js` as a lazy optional dependency
      (dynamic import + friendly install hint when absent)
- [ ] `termheat --status` — a sub-100ms cached one-liner (`🔥 37d ▁▃▅█▇` with a
      hand-rolled sparkline) backed by a local cache file with async refresh
- [ ] Docs recipes: tmux status bar and starship custom module using `--status`

## v1.2.0 — Your profile README, alive

_Flagship: `termheat-action` on the GitHub Actions Marketplace. No backend, ever._

- [ ] A GitHub Action that runs the SVG export with the runner's built-in
      `GITHUB_TOKEN` (no rate-limit worries) and commits the animated heatmap
      card to your profile README repo on a cron schedule — fully user-side,
      auto-updating, zero servers
- [ ] Live streak badge, still backend-free: the action also writes a shields.io
      endpoint-badge JSON into the repo, so
      `![](https://img.shields.io/endpoint?url=…raw.githubusercontent…)` shows
      your current streak
- [ ] Card theme variants matching the CLI themes; copy-paste README snippets in docs

## v1.3.0 — Time travel

_Flagship: `[←]/[→]` year paging._

- [ ] Multi-year heatmaps — works **zero-auth** (the public calendar fragment
      accepts date ranges) and via batched GraphQL queries with a token
- [ ] `--year 2024` flag; interactive `[←]`/`[→]` keys page through years;
      `--all` renders a condensed since-account-creation view
- [ ] Community themes: palettes move to a data-driven registry and
      CONTRIBUTING.md invites theme PRs — the easiest first contribution

## v1.4.0 — Depth

_Flagship: `termheat <user1> <user2>` head-to-head._

- [ ] Side-by-side compare: dual grids and a streak duel
- [ ] With `GITHUB_TOKEN`: contribution breakdown panel (commits / PRs / issues /
      reviews) and a "top repos this year" table
- [ ] Surface private-contribution counts when the token allows (zero-auth path
      stays calendar-only by design)

## v1.5.0 — Wrapped + Zen

_Flagship: `termheat wrapped` — shipped before December._

- [ ] Year-in-review splash: big-text intro, persona ("Night Owl",
      "Weekend Warrior"), longest streak, busiest day and month, top repos —
      engineered for screenshots, with `--export` producing the shareable card
- [ ] `--zen` screensaver mode: infinite slow-breathe loop, cycling themes, and a
      commit-rain particle effect on streak cells — all pure functions of the
      existing animation tick
- [ ] One hidden easter egg. No, it's not documented here either.

---

## Deferred (deliberately)

| Idea                                  | Why not                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Hosted badge/image endpoint           | Needs a server — violates the no-backend principle. The v1.2 endpoint-JSON trick covers it. |
| Sixel/kitty pixel-graphics grid       | Low ROI over truecolor blocks; fragments terminal support; fights Ink's renderer.           |
| In-CLI GIF recording                  | VHS does it better — we ship a `.tape` file instead.                                        |
| Copy-image-to-clipboard               | OSC 52 is text-only; per-OS shellouts aren't worth it.                                      |
| `termheat remind` notification daemon | Platform-specific and heavy; revisit after v1.5 if daily-driver traction shows.             |
