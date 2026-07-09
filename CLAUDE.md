# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TermHeat** — an animated terminal heatmap of GitHub contributions, distributed as `npx termheat`. Full design in `PLAN.md` (read it before implementing anything). Data modules, Ink components, and the CLI entry (`src/index.tsx`) are implemented; remaining work is Day 3 of the plan (npm packaging: `bin/termheat` shebang, publish build, README).

Hard constraints from the plan:

- **Ink + React only** — rendering is done with [Ink](https://github.com/vadimdemedes/ink) components (`<Box>`, `<Text>`, `useInput`). Ink and React are the only runtime dependencies; don't add CLI frameworks, color libraries (Ink has `<Text color>` with hex support), or fetch wrappers.
- **Zero-auth by default** — without a token, `github.ts` scrapes GitHub's public HTML calendar fragment; with `GITHUB_TOKEN` set it uses the GraphQL API for exact counts. Same output shape either way.
- User config lives in `~/.termheat.json` (username, theme, refresh interval).

## Commands

```bash
bun install                        # install dev dependencies
bun run src/index.tsx <username>   # run the CLI (bun run dev)
bun test                           # run tests (bun:test)
bun test <file>                    # run a single test file
bun test -t "name"                 # run tests matching a name
```

Use Bun as the dev toolchain (`bun <file>`, `bun test`, `bunx`) — never `node`, `npm`, `jest`, or `vitest`. Bun auto-loads `.env`. In shipped source, however, stick to Node-compatible APIs (`node:fs/promises`, `fetch`) since npx users run the published bundle under Node.

## Architecture

Data flows one way: plain-TS data modules feed React state, Ink renders it.

```text
github.ts        fetch contribution days (last 365), GraphQL or HTML scrape
   → heatmap.ts       convert to 53-week × 7-day grid, levels 0–4, month labels
   → streak.ts        current/longest streak dates, totals, idle days
   → <App />          data as state, watch-mode refetch, useInput ([q]/[r])
   → useAnimation     one tick counter; breathe/reveal derived per render
   → <Heatmap />      grid → <Box>/<Text> cells; <StatsBar /> counters + shame
```

Animation contract: `useAnimation` owns the only `setInterval`; everything visual (reveal wipe, breathe brightness via `scaleHex`, fire flicker on streak cells) is a pure function of its `tick`. When stdout isn't a TTY the hook is static and `<App />` exits after the first fetched frame, so piped/CI runs terminate.

Keep `github.ts`, `heatmap.ts`, and `streak.ts` as pure TypeScript with no Ink/React imports — they take data in and return data out, so they stay unit-testable with `bun test` without rendering. Components live in `src/components/`, hooks in `src/hooks/`.

Layout conventions:

- **`src/lib/`** holds shared plumbing, one concern per file: `types.ts` (domain types incl. `Theme`), `const.ts` (endpoints, `THEMES`, `VERSION`, cell chars), `schema.ts` (`TermheatConfig` shape), `env.ts` (environment reads), `query.ts` (GraphQL documents), `args.ts` (pure CLI flag parser), `shame.ts` (shame-mode copy), `api-instance.ts` (thin fetch wrapper). `apiInstance` intentionally returns the raw `Response` without throwing on non-2xx — status codes are semantic (404 → `UserNotFoundError`, 401 → token hint) and body decoding differs per transport (`.json()` vs `.text()`), so both belong to the caller in `github.ts`.
- **Tests live in `src/test/*.test.ts`**, not next to sources.
- **Import through the `@/` alias** (maps to `src/`, see tsconfig `paths`) — no `../` relative imports between modules.

Supporting modules: `config.ts` (`~/.termheat.json` I/O), `themes.ts` (github/fire/ocean/mono palettes as hex, `FIRE_RAMP` streak glow, `scaleHex` brightness math), `src/index.tsx` (arg/config merge — flags > file > defaults — and `render(<App />)`). A `bin/termheat` shebang entry point (Day 3) handles npm distribution.

CLI flags, contribution-level → character/color mapping, and the box-drawing layout are all specified in PLAN.md — treat it as the spec.

## TypeScript

`tsconfig.json` is strict, with `noUncheckedIndexedAccess` enabled — indexing into the 53×7 grid arrays yields `T | undefined`, so handle that explicitly. `jsx` is already set to `react-jsx`, so `.tsx` files need no React import for JSX. `noEmit` is on; Bun runs `.tsx` directly, there is no build step for development. Publishing is the only build: `bun build src/index.tsx --target=node` (npx users run under Node, not Bun — don't use Bun-only APIs like `Bun.file` in code paths that ship to npm).
