# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TermHeat** — an animated terminal heatmap of GitHub contributions, distributed as `npx termheat`. Full design in `PLAN.md` (read it before implementing anything). The codebase is currently a fresh `bun init` scaffold; `index.ts` is a stub and the `src/` modules described below do not exist yet.

Hard constraints from the plan:

- **Ink + React only** — rendering is done with [Ink](https://github.com/vadimdemedes/ink) components (`<Box>`, `<Text>`, `useInput`). Ink and React are the only runtime dependencies; don't add CLI frameworks, color libraries (Ink has `<Text color>`), or fetch wrappers.
- **No auth** — contribution data comes from the GitHub GraphQL API (`api.github.com/graphql`) for public profiles; the exact query is in PLAN.md.
- User config lives in `~/.termheat.json` (username, theme, refresh interval).

## Commands

```bash
bun install          # install dev dependencies
bun run index.ts     # run the CLI
bun test             # run tests (bun:test)
bun test <file>      # run a single test file
bun test -t "name"   # run tests matching a name
```

Use Bun as the dev toolchain (`bun <file>`, `bun test`, `bunx`) — never `node`, `npm`, `jest`, or `vitest`. Bun auto-loads `.env`. In shipped source, however, stick to Node-compatible APIs (`node:fs/promises`, `fetch`) since npx users run the published bundle under Node.

## Planned architecture (from PLAN.md)

Data flows one way: plain-TS data modules feed React state, Ink renders it.

```text
github.ts        fetch contribution days (last 365) via GraphQL
   → heatmap.ts       convert to 53-week × 7-day grid, levels 0–4
   → streak.ts        current/longest streak, totals
   → <App />          data as state, watch-mode refetch, useInput ([q]/[r])
   → useAnimation     frame state: pulse phase, breathe brightness
   → <Heatmap />      grid → <Box>/<Text> cells (components/, .tsx)
```

Keep `github.ts`, `heatmap.ts`, and `streak.ts` as pure TypeScript with no Ink/React imports — they take data in and return data out, so they stay unit-testable with `bun test` without rendering. Components live in `src/components/`, hooks in `src/hooks/`. Supporting modules: `config.ts` (`~/.termheat.json` I/O), `themes.ts` (github/fire/ocean/mono color scales), `src/index.tsx` (CLI arg parsing, `render(<App />)`). A `bin/termheat` shebang entry point handles npm distribution. When creating these files, follow this structure rather than growing the root `index.ts`.

CLI flags, contribution-level → character/color mapping, and the box-drawing layout are all specified in PLAN.md — treat it as the spec.

## TypeScript

`tsconfig.json` is strict, with `noUncheckedIndexedAccess` enabled — indexing into the 53×7 grid arrays yields `T | undefined`, so handle that explicitly. `jsx` is already set to `react-jsx`, so `.tsx` files need no React import for JSX. `noEmit` is on; Bun runs `.tsx` directly, there is no build step for development. Publishing is the only build: `bun build src/index.tsx --target=node` (npx users run under Node, not Bun — don't use Bun-only APIs like `Bun.file` in code paths that ship to npm).
