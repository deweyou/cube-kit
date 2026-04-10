# Implementation Plan: WCA Scramble Generation & Visualization

**Branch**: `20260410-cstimer-module-packages` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `knowledge/specs/20260410-cstimer-module-packages/spec.md`

## Summary

Repurpose `packages/scramble` as `@cubekit/scramble`: a platform-agnostic wrapper around `cstimer_module` that exposes four functions — `getScramble`, `getImage`, `setSeed`, `getWcaEvents` — with a strictly-typed WCA event whitelist. A dev-only vanilla-TS Vite playground under `packages/scramble/playground/` lets developers pick an event, generate a scramble, and render its SVG. Full unit test coverage across all 17 WCA events plus the escape-hatch (non-WCA cstimer types) and error paths. All existing text-scramble animation code is removed (verified zero external consumers).

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode, `module: preserve`, `moduleResolution: bundler`, `verbatimModuleSyntax: true` (matching existing `packages/scramble/tsconfig.json`)
**Primary Dependencies**: `cstimer_module@^0.1.5` (runtime, sole dependency), `vite-plus` (dev: build/test/playground), `vitest` via vite-plus
**Storage**: N/A — stateless pure functions
**Testing**: `vp run test -r` from repo root, `vitest` via `vite-plus/test` (match existing test style)
**Target Platform**: Browser + Node.js + WeChat miniprogram runtime (core API is platform-agnostic; playground is browser-only)
**Project Type**: Monorepo library package (`packages/scramble`) + co-located dev playground
**Performance Goals**: Scramble generation + image render < 300 ms per call on dev hardware (SC-004). Playground cold-load < 2 s.
**Constraints**: No direct DOM access in `src/` (must run in WX miniprogram runtime). Zero runtime deps beyond `cstimer_module`. Tests must run headless under vitest without JSDOM (no SVG DOM parsing in tests — string-level assertions only).
**Scale/Scope**: 17 WCA events, ~4 exported functions, ~100 LOC core, ~50 LOC playground, ~25 test cases.

## Constitution Check

Evaluated against `knowledge/constitution.md` v1.0.0:

| Principle                                                                                                      | Status  | Notes                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **II. Tech Stack** — TS strict, vite-plus, pnpm, vitest                                                        | ✅ PASS | Using existing `packages/scramble/tsconfig.json`, `vp test`, `vp pack`. No new tooling.                                                           |
| **III. Naming** — kebab-case files, camelCase vars, PascalCase types, colocated `.test.ts`                     | ✅ PASS | Files: `src/wca-events.ts`, `src/scramble.ts`, `src/image.ts`, `src/index.ts`, `tests/*.test.ts`. Types `WcaEventId`, `WcaEvent`, `ScrambleType`. |
| **IV. Architecture Boundaries** — shared logic in `packages/`, no new tooling, packages stay platform-agnostic | ✅ PASS | Core logic in `packages/scramble/src`. Playground is a dev-only sibling, NOT exported. No DOM access in `src/`.                                   |
| **V. Test Requirements** — full coverage, `vp run test -r`, unit tests colocated                               | ✅ PASS | Every exported function + every WCA event has a test. Error paths tested. Seed reproducibility tested.                                            |
| **VI. Docs** — specs in English, archive.md required                                                           | ✅ PASS | This plan, spec, research, data-model, tasks all in English. Archive step handled by harness-dev.                                                 |

**Constitution Check result**: ✅ **All gates pass. No violations. No complexity justification needed.**

## Project Structure

### Documentation (this feature)

```text
knowledge/specs/20260410-cstimer-module-packages/
├── spec.md              # ✅ done
├── plan.md              # ← this file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── scramble-api.md  # Phase 1 output — TS contract
├── checklists/
│   └── requirements.md  # ✅ done
└── tasks.md             # Phase 2 output (tasks step)
```

### Source Code (repository root)

```text
packages/scramble/
├── package.json                 # update: description + dependencies.cstimer_module
├── tsconfig.json                # unchanged
├── vite.config.ts               # unchanged (vite-plus/pack)
├── src/
│   ├── index.ts                 # re-exports: getScramble, getImage, setSeed, getWcaEvents, types
│   ├── wca-events.ts            # WCA whitelist table + WcaEventId / WcaEvent types
│   ├── scramble.ts              # getScramble() — WCA-aware + escape hatch
│   ├── image.ts                 # getImage()
│   ├── seed.ts                  # setSeed() wrapper
│   └── cstimer.ts               # thin typed import of cstimer_module (single choke point)
├── tests/
│   ├── wca-events.test.ts       # WCA whitelist invariants (all 17 ids mapped, unique, labels non-empty)
│   ├── scramble.test.ts         # Per-event generation, seed reproducibility, escape hatch, errors
│   ├── image.test.ts            # Per-event SVG output, empty scramble, errors
│   ├── seed.test.ts             # setSeed determinism
│   └── index.test.ts            # public API surface (exports match)
└── playground/
    ├── index.html               # <select> of events + Generate button + text+svg output
    ├── main.ts                  # wires up the button, imports from ../src/index.ts
    └── vite.config.ts           # separate vite config, root=playground/, alias to src/
```

**Structure Decision**: Single library package `packages/scramble` with co-located `playground/` sibling directory. The playground is NOT included in `package.json#files` (stays as `["dist"]`), so it is never published. Playground is launched via a package-local script `pnpm --filter @cubekit/scramble playground`, which runs `vite` against `playground/`.

All existing source (`src/index.ts` text-scramble code) and tests (`tests/index.test.ts`) are **deleted and rewritten** — not edited in place — because the API surface is entirely different and nothing in the repo imports the old code (verified via grep of `apps/` and `packages/`).

## Complexity Tracking

No constitution violations. Table intentionally empty.

## Phase 0 — Research Output

See [research.md](./research.md). Decisions:

1. **`cstimer_module` API shape** — confirmed by reading `cstimer_module@0.1.5/cstimer_module.d.ts` during the clarify step: `getScrambleTypes()`, `getScramble(type, length?, ...args)`, `getImage(scramble, type)`, `setSeed(seed)`, `setGlobal(k, v)`. README includes an authoritative WCA events table with 17 entries and their required length arguments.
2. **Event ID naming** — use WCA official short codes (`333`, `333bld`, `minx`, `pyram`, `sq1`, `333mbld`), mapped internally to cstimer's opaque type ids (`333ni`, `mgmp`, `pyrso`, `sqrs`, `r3ni`). Rationale: better DX, matches WCA website, decouples our public API from upstream naming.
3. **`333` vs `333oh`** — both exposed as separate event ids; both internally map to cstimer type `333`. Rationale: frontend UIs treat them as independent events even though the scramble algorithm is identical.
4. **Unified API with escape hatch** — single `getScramble(type, length?)` / `getImage(scramble, type)` functions. `ScrambleType = WcaEventId | (string & {})` preserves autocomplete for WCA ids while allowing any string for non-WCA cstimer types (e.g. training scrambles: `f2l`, `lsell`). When a WCA id is passed, WCA length is auto-applied unless `length` is explicitly provided.
5. **Error strategy** — throw native `Error` with descriptive message. No structured error objects. When cstimer throws or returns empty, wrap with context (`scramble type '${type}' rejected by cstimer_module: ${upstream}`).
6. **Playground stack** — vanilla TS + Vite, no framework. Rationale: playground is a diagnostic tool, not a product; React would add bundle and config noise for no benefit.
7. **Test strategy** — colocated under `tests/`, one file per module, table-driven tests for the 17 WCA events. No JSDOM — SVG is asserted as a string containing `<svg` and a closing `</svg>`.

## Phase 1 — Design & Contracts Output

- [data-model.md](./data-model.md) — entities: `WcaEvent`, `ScrambleType`, `WcaEventId`
- [contracts/scramble-api.md](./contracts/scramble-api.md) — full public API contract (TS signatures + behavior)
- [quickstart.md](./quickstart.md) — how to run the playground, how to run tests, one-paragraph usage example
