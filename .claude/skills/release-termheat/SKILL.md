---
name: release-termheat
description: Build, package, and publish TermHeat to npm — the full release checklist from preflight through bun build --target=node, bin shebang, npm pack inspection, Node smoke test, publish, and git tag. Use this for any release, publish, version-bump, npm-packaging, or "ship it" task in this repo, including the first v1.0.0 publish (Day 3 of PLAN.md) and every roadmap release after it.
---

# Releasing TermHeat

The one rule that shapes everything: **development runs on Bun, but npx users
run the published bundle under Node.** Every release must be smoke-tested with
`node`, not `bun`, before publish.

## 1. Preflight

```bash
git status                 # clean tree, on main
bun test                   # all green
bunx tsc --noEmit          # clean
```

## 2. Version bump

Edit `version` in `package.json` only — `APP_VERSION` in `src/lib/const.ts`
imports it, so the CLI's `--version` and help header follow automatically.
Follow ROADMAP.md's versioning (one flagship per minor).

## 3. Build

```bash
bun run build:node         # bun build src/index.tsx --target=node --outdir=dist --minify
```

React and Ink are bundled into the single output file on purpose: npx latency
is dominated by the number of package downloads, so one self-contained package
beats a small file with runtime deps. Keep the shipped source Node-compatible —
no Bun-only APIs (`Bun.file`, `bun:` imports) in anything under `src/` that
ships; `node:` builtins and `fetch` only.

## 4. Package shape (first release sets this up)

- `bin/termheat` containing `#!/usr/bin/env node` + an import of
  `../dist/index.js` (env-node, never a hardcoded node path)
- `package.json`: `"bin": { "termheat": "bin/termheat" }`,
  `"files": ["dist", "bin"]`, `"engines": { "node": ">=20" }`, and **remove
  `"private": true`** — publishing fails silently confusingly with it present
- No sourcemaps in `dist/` (they multiply package size for zero user value)

## 5. Smoke test the artifact under Node

```bash
node dist/index.js moeen-mahmud | head -20      # static frame, self-exits
node dist/index.js --help; echo "exit=$?"        # exits 0
npm pack --dry-run                               # inspect the file list + unpacked size
```

`npm pack --dry-run` is the release gate: only `dist/`, `bin/`, `package.json`,
README, LICENSE should be listed, and unpacked size should stay well under
1 MB. Anything else leaking in means `files` is wrong.

If exit codes or the non-TTY self-exit differ from the Bun dev runs, stop —
that's a Node-compat break, not a packaging problem.

## 6. Refresh the demo

If `termheat.tape` exists, regenerate the README GIF with VHS so the demo
matches the release (`vhs termheat.tape`). The GIF is the launch asset — never
ship a release whose README shows the previous version's UI.

## 7. Publish and tag

```bash
npm publish --access public    # --access public required on first publish
git tag v<version> && git push --tags
```

Then verify the real user path from a clean directory: `npx termheat@latest
moeen-mahmud`. Confirm cold-start feels instant; if it doesn't, the package
got heavy — check `npm pack` output before the next release.
