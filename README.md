# CubeKit

A Rubik's cube tooling monorepo — timer, scramble generator, scramble visualizer, algorithm list, and practice apps — targeting web, H5, and WeChat miniprogram.

## License — GPL-3.0

This repository is licensed under the **GNU General Public License v3.0**. See [`LICENSE`](./LICENSE) for the full text.

**Why GPL-3.0**: the [`@cubekit/scramble`](./packages/scramble) package bundles [`cstimer_module`](https://github.com/cs0x7f/cstimer) (GPL-3.0) directly into its published output. Under GPL-3.0's copyleft clause the combined work — including every app in this monorepo that imports `@cubekit/scramble` — must also be distributed under a GPL-3.0-compatible license. We align the whole repo with that constraint rather than try to work around it.

Full reasoning and alternatives: [`packages/scramble/README.md`](./packages/scramble/README.md#license--gpl-30) and [`knowledge/dependency-licensing.md`](./knowledge/dependency-licensing.md).

## Workspace layout

```
cubekit/
├── apps/
│   ├── web/       # React 18 web + H5 app
│   └── wx-app/    # Taro WeChat miniprogram
├── packages/
│   └── scramble/  # @cubekit/scramble — WCA scramble generation + SVG preview
└── knowledge/     # Harness-dev knowledge base (specs, constitution, topics)
```

- `apps/*` — entry-point applications only. No shared logic lives here.
- `packages/*` — reusable, platform-agnostic libraries. `src/` must not touch DOM / Taro / platform globals.
- `knowledge/` — spec-driven development assets: [constitution](./knowledge/constitution.md), [feature specs index](./knowledge/specs/index.md), and topic files like [dependency-licensing](./knowledge/dependency-licensing.md).

## Quick start

Requires **Node ≥ 22.12** and **pnpm 10**.

```bash
pnpm install

# Dev servers
pnpm dev:web              # React 18 web dev server
pnpm dev:wx               # WeChat miniprogram (Taro) dev server

# Workspace-wide
pnpm build                # vp run build -r
pnpm test                 # vp run test -r
pnpm check                # vp check (lint + format)

# Package-local
pnpm --filter @cubekit/scramble playground   # scramble visual playground
pnpm --filter @cubekit/scramble test         # package tests only
pnpm --filter @cubekit/scramble typecheck    # tsc --noEmit
```

All build / test / lint commands go through [vite-plus](https://github.com/voidzero-dev/vite-plus) (`vp`) — do not invoke `vite` / `vitest` / `tsc` directly unless a package-local script does so explicitly.

## Packages

### [`@cubekit/scramble`](./packages/scramble) — WCA scramble + SVG preview

Platform-agnostic wrapper around `cstimer_module`. Exposes `getScramble`, `getImage`, `setSeed`, `getWcaEvents` across all 17 WCA events with full type safety and an escape hatch for non-WCA training scrambles.

- Runtime environments: Node / vitest / Web Worker work out of the box; browser main thread needs a small shim (see package README)
- Ships a vanilla TS + Vite playground under `packages/scramble/playground/` for visual verification

See [`packages/scramble/README.md`](./packages/scramble/README.md) for API docs and integration notes.

## Harness-driven development

This project uses a spec-driven feature workflow backed by two skills:

- `/harness-init` — one-time setup for the `knowledge/` directory and scripts
- `/harness-dev <feature description>` — full pipeline: specify → clarify → plan → tasks → implement → archive

Project principles live in [`knowledge/constitution.md`](./knowledge/constitution.md). Past feature archives are indexed at [`knowledge/specs/index.md`](./knowledge/specs/index.md). Reusable cross-feature patterns are promoted to standalone topic files under `knowledge/` — see e.g. [`knowledge/dependency-licensing.md`](./knowledge/dependency-licensing.md).

## Contributing

Before opening a PR:

1. `pnpm test` — all workspace tests must pass
2. `pnpm --filter <pkg> typecheck` — the touched package must typecheck clean
3. `pnpm build` — the touched package must build cleanly (including `.d.mts` for published packages)
4. `pnpm check` — lint and format must be clean for your changes (pre-existing failures in other packages are not your problem)

Any dependency added via `deps.alwaysBundle` or `noExternal` must be license-audited before merging — see [`knowledge/dependency-licensing.md`](./knowledge/dependency-licensing.md) for the decision process.
