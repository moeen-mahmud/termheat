# 🔥 termheat

> Your GitHub contribution graph, alive in the terminal. Now playable.

An animated heatmap of your last year on GitHub — breathing colors, a reveal
wipe, and your current streak literally on fire. No auth, no config, no
install:

```bash
npx termheat <your-username>       # your year, animated
npx termheat play <your-username>  # your year, as a platformer 🎮
```

![termheat demo](https://raw.githubusercontent.com/moeen-mahmud/termheat/main/demo.gif)

## Why

Every other terminal contribution tool prints a static grid and exits. Most
demand a token first. termheat is different:

- **Zero auth** — works instantly for any public profile. Set `GITHUB_TOKEN`
  and it upgrades to exact counts via the GraphQL API, but a token is never a
  gate.
- **Animated** — the grid breathes, fresh data wipes in chronologically, and
  the cells of your current streak flicker in fire colors.
- **Honest about your habits** — streak counter, idle-day tracking, and an
  opt-in `--shame` mode that judges you (gently).
- **Playable** — `termheat play` turns the same graph into a side-scrolling
  platformer. Your contributions are the terrain. Your gaps are the pits.

## Usage

```bash
npx termheat <username>              # the whole thing
npx termheat <username> --theme fire # pick a palette
npx termheat <username> --watch      # live dashboard, refreshes every 5 min
npx termheat <username> --shame      # enable gentle judgement
npx termheat play <username>         # play your year (see below)
```

### Options

| Commands | What it does |
| --- | --- |
| `play` | 🎮 Play your year. A platformer where your graph is the level |

| Flag | What it does |
| --- | --- |
| `-u, --username <name>` | GitHub username (or set it in `~/.termheat.json`) |
| `-t, --theme <theme>` | Color theme: `github` \| `fire` \| `ocean` \| `mono` |
| `-w, --watch` | Auto-refresh (default: every 5 minutes) |
| `-s, --shame` | Gentle shame mode — the longer you idle, the spicier the copy |
| `-n, --no-animation` | Render one static frame (alias: `--static`) |
| `-a, --ascii` | ASCII-only output for basic terminals and fonts |
| `-e, --export <fmt>` | Write a shareable animated card: `svg` \| `png` |
| `-o, --out <file>` | Where `--export` / `--gif` writes (default: `./termheat-<user>.<fmt>`) |
| `-g, --gif` | (`play` only) Record the run and save it as a looping replay GIF |
| `-m, --mute` | (`play` only) Start with sound off — `[m]` in-game toggles it |
| `-S, --status` | Cached one-line status for tmux/starship: `🔥 37d ▁▃▅█▇` |
| `-c, --config` | Show config file path and contents |
| `-h, --help` / `-v, --version` | The usual |

**Keys** (interactive mode): `q` quit · `r` refresh.

### Plays well with others

- Pipe or redirect the output and termheat renders **one static frame and
  exits** — safe for CI, scripts, and your `.bashrc` greeting.
- Honors [`NO_COLOR`](https://no-color.org): drops color, animation, and
  emoji, and switches to an ASCII density ramp (`.. -- ++ ** ##`) so
  intensity stays readable.

## 🎮 Play your year

```bash
npx termheat play <your-username>
```

Your contribution graph **is** the level. Contribution intensity is terrain
height, zero-days are pits, and the run goes January → today, where the
finish flag waits at your latest commit. One button: **[space]** jumps, tap
again mid-air for a double jump.

Any public username is a level — which means someone else's year is a level
too. `npx termheat play torvalds` and see how the other half lives.

### Consistency is power

The game reads your habits and turns them into mechanics:

- **♥ Hearts** — your current streak is your health bar: 2 hearts, plus one
  per streak week. Ship daily, die less.
- **♦ Flames** — every 3+ day streak in the year burns as collectible flames.
- **★ Star** — a 15+ contribution day shines gold. Grab it and for three
  seconds the level can't touch you: walls become steps and pits grow a
  floor, so you sprint straight across the lava. Unless the timer runs out
  mid-pit. Mario rules.
- **⚑ Checkpoints** — month labels are respawn points. Impossible stretches
  of empty days get dim *ghost bridges*, so every real graph is beatable —
  but ghost terrain is ghost-colored; the game never lies about your gaps.
- **Death lines are dated.** With `--shame`, the game roasts you with the
  actual date you failed to ship: *"March 14th: you shipped nothing, and
  today it shipped you."*

### You play as a glyph with character

In terminal tradition — the player has been a glyph since rogue drew `@` in
1980. Your username hash picks your default from the roster (`@` the rogue,
`☻` the smiley, `♞` the knight, `Ω` the omega, and more), **[tab]** on the
title screen cycles it, and your pick persists to `~/.termheat.json`. Death
leaves a `☠` where the level got you.

### Share your run

Every run ends in a Wordle-style card whose last line is the replay command:

```text
termheat · moeen's year · Jul '25 → Jul '26
🟩🟩🟨🟩🟩🟩🟨🟩🟩🟩🟩🟩🟩
cleared in 48s · ☠ 2 · 🔥 87/224
npx termheat play moeen
```

One tile per month, graded Wordle-style: 🟩 clean · 🟨 one death · 🟥 a
struggle · ⬛ never got there.

Two ways to take it further:

```bash
npx termheat play <user> --export svg   # end-of-run card as an image —
                                        # your level with deaths scarred in
npx termheat play <user> --gif          # record the run, save a looping
                                        # replay GIF (zero dependencies)
```

### It sounds like a Game Boy

Jump blips, pickup arpeggios, a death crunch, and a fanfare when you reach
today — synthesized the way the DMG did it (square waves and noise, nothing
else) and still zero dependencies: termheat generates the WAVs at startup and
plays them through your OS. On by default in a real terminal; `[m]` or
`--mute` for the office. Piped and CI runs are always silent.

**Keys** (in game): `space` jump / double jump · `r` respawn or restart ·
`m` sound on/off · `q` quit · `tab` (title screen) change glyph.

## Share it

### Animated SVG card

```bash
npx termheat <your-username> --export svg
```

Writes `termheat-<username>.svg` — the same heatmap as a self-contained card,
with the reveal wipe and streak-flame shimmer embedded as CSS. It animates
anywhere SVG renders, **including GitHub READMEs**. Commit it to your profile
repo and embed:

```markdown
![my contributions](termheat-your-username.svg)
```

Themes apply (`--theme fire --export svg`), and `--no-animation` exports a
static frame. Renderers that don't run CSS (and viewers with
`prefers-reduced-motion` set) gracefully get the finished grid.

### PNG

```bash
npx termheat <your-username> --export png #svg --out <dir>/termheat-<username>.png/svg
```

Rasterization needs [`@resvg/resvg-js`](https://github.com/nrwl/resvg-js),
which is **not** installed with termheat — an ~8 MB native binary would slow
every npx cold start for a feature most runs don't use. Install it once where
you run termheat (`npm install @resvg/resvg-js`) and PNG export lights up.

### Status one-liner

```bash
npx termheat <your-username> --status
# 🔥 37d ▁▃▅▂▁▁▄▅█▇▃▂▅█
```

Current streak plus a two-week sparkline, printed from a local cache
(`~/.termheat-cache.json`) so it returns instantly — stale data refreshes in a
detached background process, never blocking your prompt. Built for status
bars:

**tmux** (`~/.tmux.conf`):

```tmux
set -g status-interval 60
set -g status-right "#(npx termheat --status) | %H:%M"
```

**starship** (`~/.config/starship.toml`):

```toml
[custom.termheat]
command = "npx termheat --status"
when = true
shell = "sh"
```

Both recipes assume your username lives in `~/.termheat.json` so no argument
is needed. Add `--ascii` if your bar font lacks the block glyphs.

## Configuration

Optional. Drop a `~/.termheat.json` and skip the flags:

```json
{
  "username": "your-username",
  "theme": "fire",
  "shame": true,
  "refreshMinutes": 10,
  "sprite": "knight"
}
```

CLI flags always win over the config file. `sprite` is your `play` glyph —
it's written automatically when you pick one with [tab] on the title screen,
so you'll rarely edit it by hand.

## Exact counts with a token

The zero-auth path reads GitHub's public contribution calendar, which rounds
activity into intensity buckets. For exact per-day counts, set a token — any
classic token with `read:user` scope works:

```bash
GITHUB_TOKEN=ghp_... npx termheat <your-username>
```

Same UI either way; the token only improves the numbers.

## Development

Built with [Ink](https://github.com/vadimdemedes/ink) and developed
with [Bun](https://bun.sh). Running termheat needs Node ≥ 22 (Ink 7's floor):

```bash
bun install
bun run dev <username>   # run from source
bun test                 # unit tests
```

Releases are automated with [changesets](https://github.com/changesets/changesets):
merging the "chore(release): version package" PR publishes to npm.

## License

[MIT](LICENSE) © Moeen Mahmud
