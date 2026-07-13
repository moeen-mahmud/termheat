---
name: release-termheat
description: Build, package, and publish TermHeat to npm — the full release checklist from preflight through bun build --target=node, bin shebang, npm pack inspection, Node smoke test, publish, and git tag. Use this for any release, publish, version-bump, npm-packaging, or "ship it" task in this repo, including the first v1.0.0 publish (Day 3 of PLAN.md) and every roadmap release after it.
---

# Releasing TermHeat

The one rule that shapes everything: **development runs on Bun, but npx users
run the published bundle under Node.** Every release must be smoke-tested with
`node`, not `bun`, before publish.

Releases are automated with **changesets** — nobody edits `version` by hand
and nobody runs `npm publish` locally. The human loop is: write a changeset,
merge to main, merge the bot's "Version Packages" PR.

## 1. Preflight

```bash
git status                 # clean tree, on main
bun test                   # all green
bunx tsc --noEmit          # clean
```

## 2. Version bump = write a changeset

Never edit `version` in `package.json` directly. Add a markdown file to
`.changeset/` (or run `bunx changeset`):

```md
---
"termheat": minor
---

One-paragraph, user-facing description — it becomes the CHANGELOG entry.
```

Follow ROADMAP.md's versioning (one flagship per minor). `APP_VERSION` in
`src/lib/const.ts` imports package.json, so `--version` and the help header
follow whatever the bot bumps. Check the plan with `bunx changeset status`.

The pipeline (`.github/workflows/release.yml`, changesets/action): pushing a
changeset to main opens/updates a "Version Packages" PR; merging that PR runs
`bun run release` (build + `changeset publish`) and pushes the git tag.
Requires the `NPM_TOKEN` repo secret. Steps 3–5 below are the **local
pre-merge verification** — CI runs the same build, but never merge the
Version PR without having done them once.

## 3. Build

```bash
bun run build:node         # bun build src/index.tsx --target=node --outdir=dist --minify
```

React and Ink are bundled into the single output file on purpose: npx latency
is dominated by the number of package downloads, so one self-contained package
beats a small file with runtime deps. Keep the shipped source Node-compatible —
no Bun-only APIs (`Bun.file`, `bun:` imports) in anything under `src/` that
ships; `node:` builtins and `fetch` only.

## 4. Package shape (already set up — verify, don't rebuild)

- `bin/termheat.js` containing `#!/usr/bin/env node` + an import of
  `../dist/index.js`. The `.js` extension is load-bearing: with
  `"type": "module"` Node only treats `.js` files as ESM, so an extensionless
  bin would break the `import`.
- `package.json`: `"bin": { "termheat": "bin/termheat.js" }`,
  `"files": ["dist", "bin"]`, `"engines": { "node": ">=20" }`, no
  `"private": true`, and no `typescript` in `peerDependencies` (npm 7+
  auto-installs peers — it would download tsc for every npx user)
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

The demo GIF regenerates in CI whenever `termheat.tape` changes
(`.github/workflows/demo.yml`); trigger it manually (workflow_dispatch) after
any visual change. The GIF is the launch asset — never ship a release whose
README shows the previous version's UI.

## 7. Publish = merge the Version PR

Merging the changesets "Version Packages" PR publishes to npm (access is
`public` via `.changeset/config.json`) and pushes the `v<version>` tag —
no local `npm publish`, no manual tagging.

Then verify the real user path from a clean directory: `npx termheat@latest
moeen-mahmud`. Confirm cold-start feels instant; if it doesn't, the package
got heavy — check `npm pack` output before the next release.
