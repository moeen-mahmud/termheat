---
name: add-cli-flag
description: Add or modify a TermHeat CLI flag the repo's way — the five files that must change together (commands.ts, schema.ts, args.ts, index.tsx, args.test.ts) and the conventions each one follows. Use this whenever adding a new flag or option (e.g. --export, --year, --status, --no-animation), renaming a flag, changing a flag's argument handling, or when a task mentions argv, parseArgs, CommandMaps, or CLI options in this repo.
---

# Adding a CLI flag to TermHeat

One flag touches five files. Missing any one of them produces a flag that
parses but doesn't show in `--help`, or type-checks but is silently ignored.
Work through them in this order.

## 1. `src/lib/commands.ts` — declare the flag's spelling

Add an entry to `CommandMaps` with `short` and `long`. This is the single
source of truth for flag strings — nothing else in the repo hardcodes `"-x"` /
`"--example"` literals, so help text and the parser can never drift apart.

```ts
export const CommandMaps = {
  // ...
  export: { short: "-e", long: "--export" },
};
```

Check the chosen short letter isn't taken (currently: h v w s c u t).

## 2. `src/lib/schema.ts` — extend `CliArgs`

Booleans are required with a `false` default; value-taking flags are optional
(`?`). `errors: string[]` already exists — never add a throwing path.

## 3. `src/lib/args.ts` — parse it and document it

- Add a `case CommandMaps.<name>.short: case CommandMaps.<name>.long:` to the
  switch in `parseArgs`.
- Boolean flags just set the field. Value flags read `argv[++i]`, validate,
  and on failure push a human-readable message to `args.errors` — `parseArgs`
  is deliberately pure (no `process`, no `exit`, no I/O) so the whole flag
  surface stays unit-testable; `src/index.tsx` owns printing and exit codes.
- Add a line to the `HELP` template using `CommandMaps.<name>.short/.long`
  (never literal strings). If the flag has a fixed value set, derive the list
  from a const the way `--theme` derives from `THEMES`.

## 4. `src/index.tsx` — wire it up

- Merge with config-file values using the established precedence:
  **flags > `~/.termheat.json` > defaults**.
- A flag's presence should mean exactly what it says — e.g. `--watch` is not
  implied by `refreshMinutes` existing in config (that mistake was made and
  reverted once). Pass the resolved value into `<App />` via `AppProps`
  (in `schema.ts`) if it affects runtime behavior.
- If the option should also persist in the config file, add it to `TermheatConfig` in
  `schema.ts` and handle it in `config.ts`.

## 5. `src/test/args.test.ts` — pin the behavior

Minimum coverage for a new flag:
- short and long forms both parse
- value flags: missing value produces an entry in `errors` (not a throw)
- value flags with a fixed set: invalid value produces a helpful error naming
  the valid options
- the flag doesn't swallow a following positional username

## Verify

```bash
bun test src/test/args.test.ts
bunx tsc --noEmit
bun run src/index.tsx --help        # flag appears, aligned with the others
```

Then do a live run exercising the flag (see the verify-termheat skill).
