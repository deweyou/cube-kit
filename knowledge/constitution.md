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
- Platform-specific code (Taro vs. React DOM) must be isolated at the app level or behind clear abstractions; packages should remain platform-agnostic where possible
- Do not introduce new tooling (webpack, turborepo, etc.) without first verifying vite-plus cannot fulfill the need

---

## V. Test Requirements

- All feature changes must include full test coverage (unit tests for all logic paths)
- Bug found in manual QA → regression test must be added before closing the issue
- Run tests with: `vp run test -r`
- Coverage target: **full coverage** for core logic (scramble generation, timer, formula parsing, etc.)

---

## VI. Documentation Standards

- All spec/plan/tasks documents in `knowledge/specs/` use English
- Each completed feature must have a filled-in archive.md

---

## VII. Accumulated Learnings

> This section is automatically appended by the `/harness-dev` archive step.
> It records cross-feature insights that improve future development.

<!-- harness-dev archive step appends entries here -->

### 20260409-scramble-generator-and-visualizer — 2026-04-09

- Type: feature
- Key findings:
  - Move-engine correctness for puzzle simulators must be validated with group-theory commutator tests `(X Y X' Y')^6 = identity` for all adjacent face pairs, not just individual move tests. Geometric reasoning alone is insufficient and error-prone.
  - `new Array(n)` is banned project-wide by `unicorn/no-new-array`; use `Array.from({ length: n })` or `Array.from<T>({ length: n }).fill(v)`.
  - The project enforces `func-style: expression` everywhere — all function declarations must be `const f = () =>` arrow functions.
- Promoted: `knowledge/cube-move-engine.md` (group-theory validation pattern)

### WCA scramble special formats — 2026-04-09

Full rules documented in `knowledge/wca-scramble-rules.md`.
Key events with non-standard formats: 333bf (wide-move orientation suffix), 444bf/555bf (rotation suffix), 333fm (wrapped as `R' U' F … R' U' F`).
Notable gaps vs TNoodle: 333/444/555 use random-move rather than true random-state.
