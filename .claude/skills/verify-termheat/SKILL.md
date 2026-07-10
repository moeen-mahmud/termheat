---
name: verify-termheat
description: Run and visually verify the TermHeat TUI end-to-end — interactive PTY testing with simulated keypresses, non-TTY pipe checks, exit-code verification, and the error-state checklist. Use this whenever you need to confirm a change actually works in the running app (not just unit tests), before committing rendering/animation/CLI changes, when asked to "run it", "test it live", "verify", or "smoke test" TermHeat, and when the built-in verify or run skills look for a project-specific recipe.
---

# Verifying TermHeat

TermHeat is an Ink TUI, so "it compiles and tests pass" does not prove the app
works — rendering, animation, key handling, and exit behavior only show up in a
real run. Always finish a verification with at least one live run.

## Baseline (always run first)

```bash
bunx tsc --noEmit        # strict + noUncheckedIndexedAccess must be clean
bun test                 # all tests in src/test/*.test.ts must pass
```

## Non-TTY run (fast, CI-safe)

Piping stdout makes `isRawModeSupported` false → the app renders ONE static,
fully-revealed frame and exits on its own. This is the contract; use it to
check layout and data without any interactivity:

```bash
bun run src/index.tsx moeen-mahmud | head -30
```

What to look for: month-label header, the grid (Ink assumes 80 columns when
piped, so the grid is sliced to the most recent ~36 weeks — that is correct
behavior, not a bug), stats lines, no key hints (they are interactive-only),
and the process must terminate by itself. If it hangs, the non-TTY exit
contract in `App.tsx` broke.

## Interactive run without a human (the PTY trick)

`script -q /dev/null <cmd>` allocates a real PTY, so Ink goes fully
interactive (raw mode, animation, key handling) even though the whole thing is
scripted. Feed keys on stdin after a delay so the animation has time to run:

```bash
(sleep 5; printf 'q') | script -q /dev/null bun run src/index.tsx moeen-mahmud --shame
```

What to look for in the captured output — note the escapes carry **decimal**
RGB (`38;2;255;95;31`), never hex, and animated cells are brightness-scaled by
`scaleHex`, so grepping for a palette hex string will always miss:

```bash
grep -c '38;2;' capture.txt                      # >0 → truecolor reaches the terminal
grep -oE '38;2;[0-9]+;[0-9]+;[0-9]+' capture.txt | sort -u \
  | awk -F';' '$3 > 150 && $3 > $5 * 3 {print}'  # red-dominant triplets = fire ramp
```

- multiple near-identical triplets for one color (e.g. `156;58;19` next to
  `157;59;19`) — that's breathe/flicker varying brightness across frames
- `[q] quit [r] refresh` hints present (interactive-only)
- clean exit after `q` with the cursor restored (no garbled terminal)

Replace `printf 'q'` with `printf 'r'` + a longer sleep to exercise refresh.

## Exit codes — do NOT check through a pipe

`cmd | tail -2; echo $?` reports **tail's** exit status, not the app's. This
has caused a false pass before. Either run without a pipe:

```bash
bun run src/index.tsx this-user-does-not-exist-xyz123; echo "exit=$?"
```

or use zsh's `${pipestatus[1]}` if you must pipe.

## Error-state checklist

| Scenario | Command | Expected |
| --- | --- | --- |
| Unknown user | `bun run src/index.tsx no-such-user-xyz123` | styled `✖` message, exit 1 |
| Bad theme | `bun run src/index.tsx -t neon` | help + error, exit 1 |
| Bad token | `GITHUB_TOKEN=bogus bun run src/index.tsx moeen-mahmud` | token hint, exit 1 |
| Help / version / config | `--help`, `--version`, `-c` | prints and exits 0 |
| Missing username (no config) | `bun run src/index.tsx` | help + error, exit 1 |

## Rules of the repo that verification depends on

- Use **Bun** for everything in dev (`bun run`, `bun test`, `bunx`) — never
  node/npm/jest. The published bundle, however, must run under Node, so when
  verifying a release build use `node dist/index.js` (see release-termheat).
- Data modules (`github.ts`, `heatmap.ts`, `streak.ts`) are pure TS — verify
  them with `bun test` alone; only the Ink layer needs live runs.
