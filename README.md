# 🔥 termheat

> Your GitHub contribution graph, alive in the terminal.

An animated heatmap of your last year on GitHub — breathing colors, a reveal
wipe, and your current streak literally on fire. No auth, no config, no
install:

```bash
npx termheat <your-username>
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

## Usage

```bash
npx termheat <username>              # the whole thing
npx termheat <username> --theme fire # pick a palette
npx termheat <username> --watch      # live dashboard, refreshes every 5 min
npx termheat <username> --shame      # enable gentle judgement
```

### Options

| Flag | What it does |
| --- | --- |
| `-u, --username <name>` | GitHub username (or set it in `~/.termheat.json`) |
| `-t, --theme <theme>` | Color theme: `github` \| `fire` \| `ocean` \| `mono` |
| `-w, --watch` | Auto-refresh (default: every 5 minutes) |
| `-s, --shame` | Gentle shame mode — the longer you idle, the spicier the copy |
| `-n, --no-animation` | Render one static frame (alias: `--static`) |
| `-a, --ascii` | ASCII-only output for basic terminals and fonts |
| `-c, --config` | Show config file path and contents |
| `-h, --help` / `-v, --version` | The usual |

**Keys** (interactive mode): `q` quit · `r` refresh.

### Plays well with others

- Pipe or redirect the output and termheat renders **one static frame and
  exits** — safe for CI, scripts, and your `.bashrc` greeting.
- Honors [`NO_COLOR`](https://no-color.org): drops color, animation, and
  emoji, and switches to an ASCII density ramp (`.. -- ++ ** ##`) so
  intensity stays readable.

## Configuration

Optional. Drop a `~/.termheat.json` and skip the flags:

```json
{
  "username": "your-username",
  "theme": "fire",
  "shame": true,
  "refreshMinutes": 10
}
```

CLI flags always win over the config file.

## Exact counts with a token

The zero-auth path reads GitHub's public contribution calendar, which rounds
activity into intensity buckets. For exact per-day counts, set a token — any
classic token with `read:user` scope works:

```bash
GITHUB_TOKEN=ghp_... npx termheat <your-username>
```

Same UI either way; the token only improves the numbers.

## Development

Built with [Ink](https://github.com/vadimdemedes/ink) + React and developed
with [Bun](https://bun.sh):

```bash
bun install
bun run dev <username>   # run from source
bun test                 # unit tests
```

Releases are automated with [changesets](https://github.com/changesets/changesets):
merging the "Version Packages" PR publishes to npm.

## License

[MIT](LICENSE) © Moeen Mahmud
