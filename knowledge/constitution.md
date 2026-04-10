# CubeKit Constitution

> Version: 1.0.0 | Created: 2026-04-08
>
> This file captures the core development principles for the project. It is initialized
> by `/harness-init` and continuously updated via the archive step of `/harness-dev`.
> CLAUDE.md points here — Claude reads it at the start of each harness-dev workflow.

---

## I. Project Overview

**Project type**: Monorepo — React 18 web app + H5 + WeChat miniprogram (Taro cross-platform)
**Primary goal**: Provide Rubik's cube enthusiasts with a timer, scramble generator, scramble visualizer, algorithm list, and practice tools
**Target users**: Speedsolvers and casual hobbyists

---

## II. Tech Stack Conventions

**Language**: TypeScript 5.x (strict mode preferred; currently `noEmit: true`, `module: nodenext`)
**Runtime**: Browser (web/H5) + WeChat miniprogram runtime
**Framework**: React 18 (web/H5), Taro (WeChat miniprogram cross-platform)
**Build tool**: vite-plus (`vp`) — all build/test/lint commands go through `vp`, not vite/pnpm scripts directly
**Package manager**: pnpm 10 — do not use npm or yarn
**Testing**: vitest via vite-plus — command: `vp run test -r` (recursive across all packages/apps)
**Lint/format**: vite-plus check — command: `vp check`

---

## III. Naming & File Conventions

- Files and directories: **kebab-case** (e.g., `scramble-display.tsx`, `use-timer.ts`)
- Variables and functions: camelCase
- Types and interfaces: PascalCase
- Constants: SCREAMING_SNAKE_CASE
- Component files: `.tsx`, arrow function style
- Test files: colocated, named `<filename>.test.ts(x)` (e.g., `scramble-display.test.tsx`)

---

## IV. Architecture Boundaries

- **`apps/`** — entry-point applications only (web, wx-app); no shared logic lives here
- **`packages/`** — all reusable logic, UI components, and utilities; currently includes `scramble`
- Shared types must be defined in a `packages/types` package (create it when needed), not duplicated across packages
- **`src/` of every package MUST stay platform-agnostic**: no direct access to `window`, `document`, Taro APIs, or any platform-specific global. Auxiliary sibling directories (e.g. `playground/`, `examples/`) may be platform-specific but MUST NOT be included in `package.json`'s `files` array and thus MUST NOT ship in the published tarball.
- Platform-specific code (Taro vs. React DOM) must be isolated at the app level or behind clear abstractions
- Do not introduce new tooling (webpack, turborepo, etc.) without first verifying vite-plus cannot fulfill the need

---

## V. Test Requirements

- All feature changes must include full test coverage (unit tests for all logic paths)
- Bug found in manual QA → regression test must be added before closing the issue
- Run tests with: `vp run test -r`
- Coverage target: **full coverage** for core logic (scramble generation, timer, formula parsing, etc.)

### Feature Close Gates

A feature is not complete until ALL of these are green from a clean working directory for the package(s) it modifies:

- `pnpm test` — tests pass
- `pnpm --filter <pkg> typecheck` — `tsc --noEmit` passes
- `pnpm build` — bundle builds and emits the expected artifacts (including `.d.mts` for published packages)
- `pnpm check` — lint/format pass

Pre-existing failures in OTHER packages should be reported but do not block the current feature. Pre-existing failures in the package being modified ARE in scope and MUST be fixed before the feature can close. Tests passing alone is NOT sufficient — the package must also be shippable.

---

## VI. Documentation Standards

- All spec/plan/tasks documents in `knowledge/specs/` use English
- Each completed feature must have a filled-in archive.md
- Past feature specs are indexed at [knowledge/specs/index.md](specs/index.md) — the archive step appends there, not inline in this file

### Runtime Support Matrix (per published package)

Every published package MUST document its supported runtime environments in its `README.md`, explicitly listing any that require a shim, polyfill, or worker boundary. Environments to enumerate:

- Node.js / vitest (typical test + build-time consumers)
- Browser main thread
- Browser Web Worker
- WeChat miniprogram runtime

Default stance: if an environment is not listed as "works out of the box", assume it does not. Silent breakage (e.g., tests green but browser throws at call time) is the signal that this gate was skipped.

---

## VII. Dependency Licensing

- **License Compatibility Gate**: Any package that bundles (`deps.alwaysBundle`, `noExternal`, inlining into `dist/`, etc.) a third-party dependency MUST declare a `license` field compatible with every bundled dependency's license. GPL-family licenses (GPL, AGPL) are copyleft — bundling them forces the combined work into a GPL-compatible license. When in doubt, prefer `peerDependencies` or out-of-process loading over static bundling.
- **Verification**: before enabling bundling for any new dependency, verify its license via `node_modules/<dep>/package.json` and its shipped LICENSE file (if any). Never rely solely on the `package.json` `license` field — many npm packages declare a license but do not ship the canonical text.
- **Distribution**: when a package bundles a copyleft dependency, it MUST ship `LICENSE` and `NOTICE` files in its `package.json` `files` array. `LICENSE` contains the canonical license text; `NOTICE` attributes the bundled dependency (name, version, upstream repo, modifications).
- See [knowledge/dependency-licensing.md](dependency-licensing.md) for the full decision process and commands.

---

## VIII. Accumulated Learnings

> Feature-specific insights are captured in each feature's archive.md.
> Cross-feature patterns are promoted to named topic files under `knowledge/`.
>
> Past feature specs are indexed at [knowledge/specs/index.md](specs/index.md).

Named topic files:

- [knowledge/dependency-licensing.md](dependency-licensing.md) — how to audit and declare licenses when bundling third-party code
