# TermHeat — Plan 🔥

> Animated terminal heatmap for your GitHub contributions.
> `npx termheat`

---

## What It Is

A full-screen terminal app that renders your GitHub contribution graph as a live, animated visual. Think of it as a **screensaver for developers** — beautiful, motivating, runs in your terminal.

---

## Core Features (v1)

- **Fetch real GitHub contribution data** via GitHub GraphQL API (public profile, no auth needed)
- **Render an animated heatmap** in the terminal — cells light up, pulse, fade
- **Current streak counter** — "🔥 14-day streak"
- **Gentle shame mode** — "🐌 You haven't pushed in 3 days"
- **Refresh interval** — auto-polls every N minutes (`--watch` flag)
- **Minimal & aesthetic** — works in any modern terminal (iTerm, Kitty, Alacritty, Terminal.app, Windows Terminal)

---

## Stack

| Layer        | Choice                                                         | Why                                              |
| ------------ | -------------------------------------------------------------- | ------------------------------------------------ |
| Runtime      | **Bun**                                                        | Fast startup, built-in TS support, single binary |
| CLI          | **Bun CLI** (no framework)                                     | Simple, no deps                                  |
| Rendering    | **Bare terminal** (ANSI escape codes + `process.stdout.write`) | Zero dependencies, full terminal control         |
| Or:          | **Blessed/Cursed** or **Ink** (React for terminal)             | If you want a richer rendering layer             |
| API          | **GitHub GraphQL** (`api.github.com/graphql`)                  | Contributions data is only available via GraphQL |
| Config       | `~/.termheat.json`                                             | Store GitHub username, theme, refresh interval   |
| Distribution | **npm** (`npx termheat`)                                       | Zero-install for users                           |

---

## v1 File Structure

```
termheat/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Entry point, CLI arg parsing
│   ├── github.ts         # GitHub GraphQL client
│   ├── renderer.ts       # Terminal rendering engine
│   ├── heatmap.ts        # Contribution data → grid layout
│   ├── animation.ts      # Frame timing, pulse effects
│   ├── config.ts         # ~/.termheat.json read/write
│   ├── streak.ts         # Streak calculation logic
│   └── themes.ts         # Color themes (GitHub green, fire, ocean, mono, etc.)
├── bin/
│   └── termheat          # Shebang entry point
└── README.md
```

---

## Data Flow

```
GitHub GraphQL API
       ↓
   github.ts     →  Fetches contribution days (last 365 days)
       ↓
   heatmap.ts    →  Converts to a 53-week × 7-day grid + contribution levels (0–4)
       ↓
   streak.ts     →  Calculates current streak, longest streak, total commits
       ↓
   renderer.ts   →  Renders grid → ANSI escape codes
       ↓
   animation.ts  →  Wraps render in animation loop (frame timing)
       ↓
   Terminal      →  stdout
```

---

## GitHub GraphQL Query

```graphql
query ($username: String!) {
  user(login: $username) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
            color
          }
        }
      }
    }
  }
}
```

No auth required for public profiles. Just pass the username.

---

## CLI Design (v1)

```
Usage: termheat [username] [options]

Options:
  -u, --username <name>    GitHub username (required if not in config)
  -w, --watch              Auto-refresh every N minutes (default: 5)
  -t, --theme <theme>      Color theme (github | fire | ocean | mono)
  -s, --shame              Enable gentle shame mode
  -c, --config             Open config file
  -h, --help               Show help
  --version                Show version

Examples:
  npx termheat moeen-mahmud
  npx termheat moeen-mahmud --watch
  npx termheat moeen-mahmud --theme fire --shame
```

---

## Rendering Details

### Grid Layout

```
┌──────────────────────────────────────────────────────────┐
│  🔥 TermHeat - moeen-mahmud                               │
│                                                          │
│  Current streak: 14 days                                 │
│  Total contributions this year: 847                      │
│                                                          │
│        Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  │
│  Mon    ░░   ░░   ▓▓   ██   ██   ██   ██   ░░   ░░   ░░  │
│  Tue    ░░   ██   ██   ██   ██   ██   ██   ██   ░░   ░░  │
│  Wed    ░░   ██   ██   ██   ██   ██   ██   ██   ██   ░░  │
│  Thu    ░░   ██   ██   ██   ██   ██   ██   ██   ██   ██  │
│  Fri    ░░   ██   ██   ██   ██   ██   ██   ██   ██   ░░  │
│  Sat    ██   ██   ██   ██   ██   ██   ██   ██   ██   ░░  │
│  Sun    ░░   ▓▓   ██   ██   ██   ██   ██   ░░   ▓▓   ░░  │
│                                                          │
│  Less ░░▓▓████ More    [q] quit    [r] refresh           │
└──────────────────────────────────────────────────────────┘
```

### Contribution Levels → Characters

| Level | Count     | Character | Color               |
| ----- | --------- | --------- | ------------------- |
| 0     | 0 commits | `░░`      | Dim gray            |
| 1     | 1–3       | `▒▒`      | Light green         |
| 2     | 4–7       | `▓▓`      | Medium green        |
| 3     | 8–14      | `██`      | Dark green          |
| 4     | 15+       | `██`      | Bright green (bold) |

### Animation Effects (v1)

- **Pulse wave** — cells fill from bottom-right to top-left over 2 seconds
- **Breathe** — entire grid gently pulses brightness
- **Streak highlight** — current streak cells glow

### Themes

- **github** — Default GitHub green scale
- **fire** — Red → Orange → Yellow gradient
- **ocean** — Teal → Blue → Purple
- **mono** — Monochrome grayscale

---

## v1.5 Ideas (scope-creep later)

- Multi-user display (watch your team's grid side by side)
- Sparkline below the grid showing trend (up/down)
- Export as SVG for sharing on social
- CLI notifications when you break your streak
- `--json` flag for piping into other tools
- GitHub Actions auto-deploy — run `termheat` in your CI and save as artifact

---

## Build Plan

### Day 1 (tonight)

1. Scaffold project: `bun init`, package.json, tsconfig
2. `github.ts` — GraphQL query, fetch, parse
3. `heatmap.ts` — Grid computation (53×7)
4. `streak.ts` — Streak calculation
5. `config.ts` — Config file I/O

### Day 2 (tomorrow)

6. `renderer.ts` — ANSI escape rendering (grid, text, counters)
7. `animation.ts` — Animation loop with `setInterval`/`requestAnimationFrame` equivalent for terminal
8. `themes.ts` — 3–4 themes
9. `index.ts` — CLI wiring, arg parsing
10. Polish: resize handling, Ctrl+C cleanup, error states

### Day 3

11. npm publish, README, demo GIF
12. `bun run build && npm publish`

---

## Distribution

```bash
npx termheat moeen-mahmud
```

One command. No install. Just works.

Package: `termheat` on npm.

---

## What Makes This Special

- **Zero dependencies** — pure TS, no npm bloat
- **Beautiful** — people expect terminals to be ugly. Aesthetic heatmap animation surprises everyone
- **Shareable** — screenshot it, it looks cool
- **Useful** — developers care about streaks. It's gamification without a gamification UI
- **Micro-product** — small enough to finish, big enough to ship

---

_Plan written 2026-07-09. Name suggested by Aritra (moeen-mahmud). 🚀_
