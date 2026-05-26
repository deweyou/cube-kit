# CubeKit

A Rubik's cube tooling monorepo — timer, scramble generator, scramble visualizer, algorithm list, and practice apps — targeting web, H5, and WeChat miniprogram.

## License - GPL-3.0-only

This repository is licensed under **GPL-3.0-only**. See [`LICENSE`](./LICENSE)
for the full text.

**Why GPL-3.0-only**: the legacy [`@cubekit/scramble`](./packages/scramble)
package bundles [`cstimer_module`](https://github.com/cs0x7f/cstimer)
(GPL-3.0) directly into its published output. The new TNoodle-compatible
packages port behavior from `thewca/tnoodle-lib` / `lib-scrambles` v0.19.2,
which is GPL-v3.0. We align the repo and published packages with that boundary.

Full reasoning and alternatives: [`packages/scramble/README.md`](./packages/scramble/README.md#license---gpl-30-only) and [`docs/dependency-licensing.md`](./docs/dependency-licensing.md).

## Workspace layout

```
cubekit/
├── apps/
│   ├── playground/       # scramble package testing workbench
│   ├── scramble-docs/    # bilingual VitePress learning site
│   ├── web/              # React 18 web + H5 app
│   └── wx-app/           # Taro WeChat miniprogram
├── packages/
│   ├── scramble/         # legacy cstimer-backed WCA scramble + SVG wrapper
│   ├── scramble-puzzle/  # shared WCA notation, parser, and state contracts
│   ├── scramble-core/    # TNoodle-compatible WCA scramble generation
│   └── scramble-image/   # DOM-free SVG rendering for scramble states
└── docs/                 # repository memory and Superpowers specs/plans
```

- `apps/*` — entry-point applications only. No shared logic lives here.
- `packages/*` — reusable, platform-agnostic libraries. `src/` must not touch DOM / Taro / platform globals.
- `docs/` — repository memory: [project structure](./docs/project-structure.md), [timer workflow](./docs/timer-workflow.md), [scramble runtime](./docs/scramble-runtime.md), and [dependency licensing](./docs/dependency-licensing.md).

## Quick start

Requires **Node ≥ 22.12** and **pnpm 10**.

```bash
pnpm install

# Dev servers
pnpm dev:playground       # scramble-core/image testing workbench
pnpm dev:scramble-docs    # bilingual scramble learning site
pnpm dev:web              # React 18 web dev server
pnpm dev:wx               # WeChat miniprogram (Taro) dev server

# Workspace-wide
pnpm build                # vp run build -r
pnpm test                 # docs guard + vp run test -r
pnpm test:docs            # verify docs/ is the harness knowledge base
pnpm check                # vp check (lint + format)

# New TNoodle-compatible packages
pnpm --filter @cubekit/scramble-puzzle test:coverage
pnpm --filter @cubekit/scramble-core test:coverage
pnpm --filter @cubekit/scramble-image test:coverage
pnpm --filter playground test
pnpm build:scramble-docs
```

All build / test / lint commands go through [vite-plus](https://github.com/voidzero-dev/vite-plus) (`vp`) — do not invoke `vite` / `vitest` / `tsc` directly unless a package-local script does so explicitly.

## Packages

### [`@cubekit/scramble-puzzle`](./packages/scramble-puzzle) - Puzzle contracts

Shared WCA event metadata, parsers, state transitions, and puzzle definitions
for cube, Clock, Megaminx, Pyraminx, Skewb, and Square-1.

### [`@cubekit/scramble-core`](./packages/scramble-core) - Scramble generation

TNoodle-compatible WCA scramble generation across the 17 supported event ids,
including minimum-distance filters, BLD no-inspection orientation moves,
Fewest Moves padding, and multiline `333mbld` output.

### [`@cubekit/scramble-image`](./packages/scramble-image) - SVG previews

DOM-free SVG rendering for scramble states. It uses `scramble-puzzle` parsers,
applies the scramble to a solved state, and returns standalone SVG strings.

### [`apps/playground`](./apps/playground) - Testing workbench

React playground for exercising `scramble-core` and `scramble-image` before they
are wired into production apps. It includes seeded runs, batch generation,
manual render, SVG download, and lightweight diagnostics.

### [`apps/scramble-docs`](./apps/scramble-docs) - Learning site

VitePress site for studying WCA scramble generation and scramble image rendering
principles in English and Chinese. It is content-only and focuses on rules,
event-specific generation strategies, state transition, and SVG rendering.

### [`@cubekit/scramble`](./packages/scramble) - Legacy cstimer wrapper

Platform-agnostic wrapper around `cstimer_module`. Exposes `getScramble`, `getImage`, `setSeed`, `getWcaEvents` across all 17 WCA events with full type safety and an escape hatch for non-WCA training scrambles.

- Runtime environments: Node / vitest / Web Worker work out of the box; browser main thread needs a small shim (see package README)
- Kept as the existing cstimer-backed wrapper while the native TNoodle-compatible packages mature

See [`packages/scramble/README.md`](./packages/scramble/README.md) for API docs and integration notes.

## Agent memory

Repository instructions start at [`AGENTS.md`](./AGENTS.md). Durable knowledge
lives under `docs/`, while Superpowers specs and plans live under
[`docs/superpowers/`](./docs/superpowers/).

Start with [docs/project-structure.md](./docs/project-structure.md), then read
the focused topic doc for the area you are changing.

## Contributing

Before opening a PR:

1. `pnpm test` — all workspace tests must pass
2. `pnpm --filter <pkg> typecheck` — the touched package must typecheck clean
3. `pnpm build` — the touched package must build cleanly (including `.d.mts` for published packages)
4. `pnpm check` — lint and format must be clean for your changes (pre-existing failures in other packages are not your problem)
5. For the new scramble packages, run `test:coverage` on the touched package
   and keep the package-level thresholds locked in `vite.config.ts`

Any dependency added via `deps.alwaysBundle` or `noExternal` must be license-audited before merging — see [`docs/dependency-licensing.md`](./docs/dependency-licensing.md) for the decision process.
