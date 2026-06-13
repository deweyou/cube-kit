# Cubegin

A Rubik's cube tooling monorepo — timer, scramble generator, scramble visualizer, algorithm list, and practice apps — targeting web, H5, and WeChat miniprogram.

The public npm package is `cubegin`. It ships both an agent-friendly CLI and
bundled package subpaths for scramble generation, SVG rendering, puzzle
notation/state helpers, icon assets, and solver helpers.

## Use Cubegin

### CLI Install And Usage

Use the CLI directly with `npx`, or install it globally when you want repeated
local use:

```bash
npx cubegin@latest scramble events --json
npx cubegin@latest scramble generate 333 --count 5 --json
npx cubegin@latest scramble render 333 "R U R' U'" --json
npx cubegin@latest solver methods 333 --json
```

```bash
npm install -g cubegin

cubegin scramble events --json
cubegin scramble generate 333 --count 5 --json
```

`npx cubegin@latest install` runs the installer flow. It can install the
bundled `cubegin` agent skill globally by delegating to `npx skills add`, so
compatible agents can discover the CLI workflow from the installed skill.

### Package Install And Usage

Install `cubegin` when you want to call the scramble, renderer, puzzle, icon, or
solver APIs from JavaScript/TypeScript:

```bash
pnpm add cubegin
```

The package intentionally has no root API. Import one of the public subpaths:

```ts
import { createDefaultScrambleGenerator, createMathRandomSource } from 'cubegin/scramble-core';
import { renderScrambleImage } from 'cubegin/scramble-image';
import { WCA_EVENT_IDS } from 'cubegin/scramble-puzzle';
import { EVENT_ICON_333_SVG } from 'cubegin/icons/events';
import { solvePuzzleAssist } from 'cubegin/solver';

const generator = createDefaultScrambleGenerator({
  random: createMathRandomSource(),
});
const scramble = await generator.generate('333');
const svg = renderScrambleImage('333', scramble.scramble);
const [cross] = solvePuzzleAssist('333', ['cross'], scramble.scramble);

console.log(WCA_EVENT_IDS);
console.log(EVENT_ICON_333_SVG);
console.log(scramble.scramble);
console.log(svg);
console.log(cross.solutions[0]?.solution);
```

## License - GPL-3.0-only

This repository is licensed under **GPL-3.0-only**. See [`LICENSE`](./LICENSE)
for the full text.

**Why GPL-3.0-only**: the TNoodle-compatible scramble packages port behavior
from `thewca/tnoodle-lib` / `lib-scrambles` v0.19.2, which is GPL-v3.0. We
align the repo and published packages with that boundary.

Full reasoning and alternatives: [`docs/dependency-licensing.md`](./docs/dependency-licensing.md).

## Workspace layout

```
cubegin/
├── apps/
│   ├── playground/       # scramble package testing workbench
│   ├── scramble-docs/    # bilingual VitePress learning site
│   ├── web/              # React 18 web + H5 app
│   └── wx-app/           # Taro WeChat miniprogram
├── packages/
│   ├── core/             # public cubegin npm package and bundled entrypoints
│   ├── cli/              # cubegin CLI source
│   ├── icons/            # Cubegin brand and event icon assets
│   ├── scramble-puzzle/  # shared WCA notation, parser, and state contracts
│   ├── scramble-core/    # TNoodle-compatible WCA scramble generation
│   ├── scramble-image/   # DOM-free SVG rendering for scramble states
│   └── solver/           # auxiliary and full solver helpers
└── docs/                 # repository memory and Superpowers specs/plans
```

- `apps/*` — entry-point applications only. No shared logic lives here.
- `packages/*` — reusable, platform-agnostic libraries. `src/` must not touch DOM / Taro / platform globals.
- `packages/core` — public npm distribution boundary. Its README is the npm
  package landing page and should stay aligned with the CLI/package usage above.
- `docs/` — repository memory: [project structure](./docs/project-structure.md), [timer workflow](./docs/timer-workflow.md), [scramble runtime](./docs/scramble-runtime.md), and [dependency licensing](./docs/dependency-licensing.md).

## Repository Development

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
pnpm --filter @cubegin/scramble-puzzle test:coverage
pnpm --filter @cubegin/scramble-core test:coverage
pnpm --filter @cubegin/scramble-image test:coverage
pnpm --filter playground test
pnpm build:scramble-docs
```

All build / test / lint commands go through [vite-plus](https://github.com/voidzero-dev/vite-plus) (`vp`) — do not invoke `vite` / `vitest` / `tsc` directly unless a package-local script does so explicitly.

## Packages

### [`@cubegin/scramble-puzzle`](./packages/scramble-puzzle) - Puzzle contracts

Shared WCA event metadata, parsers, state transitions, and puzzle definitions
for cube, Clock, Megaminx, Pyraminx, Skewb, and Square-1.

### [`@cubegin/scramble-core`](./packages/scramble-core) - Scramble generation

TNoodle-compatible WCA scramble generation across the 17 supported event ids,
including minimum-distance filters, BLD no-inspection orientation moves,
Fewest Moves padding, and multiline `333mbld` output.

### [`@cubegin/scramble-image`](./packages/scramble-image) - SVG previews

DOM-free SVG rendering for scramble states. It uses `scramble-puzzle` parsers,
applies the scramble to a solved state, and returns standalone SVG strings.

### [`cubegin`](./packages/core) - Public npm package

Bundled distribution package that exposes selected `cubegin/*` subpaths and the
`cubegin` CLI bin. It is the package published to npm.

### [`@cubegin/cli`](./packages/cli) - CLI source

Agent-friendly command tree for scramble generation, scramble rendering, solver
helpers, and bundled skill installation. It is emitted through the public
`cubegin` package.

### [`@cubegin/solver`](./packages/solver) - Solver helpers

Auxiliary and full solve helpers used by scramble generation, diagnostics, and
the CLI solver commands.

### [`apps/web`](./apps/web) - Timer app

React web/H5 timer UI. It consumes `@cubegin/timer`, `@cubegin/scramble-core`,
`@cubegin/scramble-puzzle`, and `@cubegin/scramble-image` directly.

### [`apps/playground`](./apps/playground) - Testing workbench

React playground for exercising `scramble-core` and `scramble-image` before they
are wired into production apps. It includes seeded runs, batch generation,
manual render, SVG download, and lightweight diagnostics.

### [`apps/scramble-docs`](./apps/scramble-docs) - Learning site

VitePress site for studying WCA scramble generation and scramble image rendering
principles in English and Chinese. It is content-only and focuses on rules,
event-specific generation strategies, state transition, and SVG rendering.

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
