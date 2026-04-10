---
description: 'Task list for WCA Scramble Generation & Visualization'
---

# Tasks: WCA Scramble Generation & Visualization

**Input**: Design documents from `knowledge/specs/20260410-cstimer-module-packages/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/scramble-api.md, quickstart.md

**Tests**: REQUIRED — user explicitly requested "补齐所有的单测用例" (full unit test coverage). Test tasks are interleaved with implementation per source file, not written first.

**Organization**: Tasks are grouped by user story (US1 generation, US2 image, US3 playground, US4 tests) to enable independent verification per story. Because the implementation is small (one package), most cross-story dependencies collapse into the Foundational phase — the `cstimer_module` typed import and the WCA whitelist are shared.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 = scramble generation, US2 = image rendering, US3 = playground, US4 = test coverage
- File paths are absolute from repo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Declare the runtime dependency and wipe legacy code so the rewrite starts from a clean slate.

- [ ] T001 Add `cstimer_module: ^0.1.5` to `packages/scramble/package.json` under `dependencies`, update `description` field to `"WCA scramble generation and scramble-image rendering, backed by cstimer_module."`, and add `"playground": "vite playground"` to the `scripts` block
- [ ] T002 Run `pnpm install` from repo root to materialize `cstimer_module` into `packages/scramble/node_modules`
- [ ] T003 Delete `packages/scramble/src/index.ts` (legacy text-scramble animation code)
- [ ] T004 Delete `packages/scramble/tests/index.test.ts` (legacy text-scramble tests)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core plumbing that every user story depends on — the single typed entry point to `cstimer_module` and the WCA whitelist.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 [P] Create `packages/scramble/src/cstimer.ts` — a thin typed re-import of `cstimer_module` exposing `rawGetScramble`, `rawGetImage`, `rawSetSeed`, `rawGetScrambleTypes` with local TypeScript types matching the upstream `.d.ts`. This is the ONLY file in `src/` that imports `cstimer_module` directly — every other source file goes through this choke point.
- [ ] T006 [P] Create `packages/scramble/src/wca-events.ts` containing: (a) the `WcaEventId` literal union type, (b) the `WcaEvent` interface, (c) module-private `LENGTH_*` and `CSTIMER_*` named constants per data-model.md §"Whitelist Table", (d) the exported `WCA_EVENTS` readonly tuple built via `as const satisfies readonly WcaEvent[]`, (e) the exported `WCA_EVENT_BY_ID` lookup derived from the tuple, (f) a type-level exhaustiveness assert that proves every `WcaEventId` has an entry in `WCA_EVENTS`, (g) the exported `getWcaEvents()` function returning `WCA_EVENTS`
- [ ] T007 Create `packages/scramble/src/index.ts` as a pure barrel re-exporting `getScramble` from `./scramble.ts`, `getImage` from `./image.ts`, `setSeed` from `./seed.ts`, `getWcaEvents` from `./wca-events.ts`, and the types `WcaEventId`, `WcaEvent`, `ScrambleType` from `./wca-events.ts` (barrel written now with stub imports commented out; uncommented as each US adds its file)

**Checkpoint**: Foundation ready — US1/US2/US3/US4 can now proceed.

---

## Phase 3: User Story 1 — Generate WCA scrambles (Priority: P1) 🎯 MVP

**Goal**: `getScramble(type, length?)` returns a valid scramble string for any of the 17 WCA events (with auto-applied WCA length) or any non-WCA cstimer type (escape hatch). Errors are thrown with package-prefixed messages.

**Independent Test**: Import `@cubekit/scramble`, iterate `getWcaEvents()`, call `getScramble(event.id)` for each, assert each result is a non-empty string. Run via `pnpm --filter @cubekit/scramble test -- scramble`.

### Implementation for User Story 1

- [ ] T008 [US1] Create `packages/scramble/src/scramble.ts` implementing `export type ScrambleType = WcaEventId | (string & {});` and `export function getScramble(type: ScrambleType, length?: number): string` per contracts/scramble-api.md §getScramble. Dispatch: WCA id → `rawGetScramble(event.cstimerType, length ?? event.length)`; non-WCA → `rawGetScramble(type, length ?? 0)`. Wrap empty results and upstream throws with `@cubekit/scramble:`-prefixed `Error`.
- [ ] T009 [US1] Uncomment the `getScramble` and `ScrambleType` re-exports in `packages/scramble/src/index.ts` added by T007

### Tests for User Story 1

- [ ] T010 [P] [US1] Create `packages/scramble/tests/scramble.test.ts` with table-driven tests: `test.each(getWcaEvents())` asserts every WCA event returns a non-empty string and does not throw; a separate test asserts explicit length override wins over the WCA default (e.g. `getScramble('555', 1)` invokes upstream with length 1); a test asserts the escape hatch path forwards a non-WCA type untouched; a test asserts unknown-type throws an `Error` whose message starts with `@cubekit/scramble:`; a test asserts `getScramble('333oh')` is equivalent at the scramble-grammar level to `getScramble('333')` (same cstimer type id under the hood).

**Checkpoint**: US1 functional — the package can produce scrambles for every WCA event and rejects unknown types cleanly.

---

## Phase 4: User Story 2 — Render scramble images (Priority: P1)

**Goal**: `getImage(scramble, type)` returns a non-empty SVG string for any of the 17 WCA events (plus escape hatch for non-WCA types). Empty scramble input returns solved-state SVG. Errors wrapped the same way as US1.

**Independent Test**: For each WCA event, call `getScramble(e.id)` then `getImage(scr, e.id)`; assert result contains `<svg` and `</svg>`. Run via `pnpm --filter @cubekit/scramble test -- image`.

### Implementation for User Story 2

- [ ] T011 [P] [US2] Create `packages/scramble/src/image.ts` implementing `export function getImage(scramble: string, type: ScrambleType): string` per contracts/scramble-api.md §getImage. Resolve WCA ids to their `cstimerType` via `WCA_EVENT_BY_ID`, fall through for non-WCA types, call `rawGetImage`, wrap empty/throws with `@cubekit/scramble:`-prefixed `Error`.
- [ ] T012 [P] [US2] Create `packages/scramble/src/seed.ts` implementing `export function setSeed(seed: string): void` which calls `rawSetSeed(seed)`. (Lives here because seed handling belongs with "deterministic generation" conceptually; tiny file kept separate per single-responsibility.)
- [ ] T013 [US2] Uncomment the `getImage` and `setSeed` re-exports in `packages/scramble/src/index.ts`

### Tests for User Story 2

- [ ] T014 [P] [US2] Create `packages/scramble/tests/image.test.ts` with: table-driven `test.each(getWcaEvents())` that for each event generates a scramble then calls `getImage`, asserting the returned string contains `<svg` and `</svg>`; a test for `getImage('', '333')` (empty scramble → solved state) asserting non-empty SVG; a test for an unknown type asserting `@cubekit/scramble:`-prefixed throw.
- [ ] T015 [P] [US2] Create `packages/scramble/tests/seed.test.ts` asserting that `setSeed('cubekit-test')` followed by `getScramble('333')` produces the same string when the seed is reset and the call is repeated.

**Checkpoint**: US2 functional — generation + image + seed form a complete, reproducible pipeline.

---

## Phase 5: User Story 3 — Playground (Priority: P2)

**Goal**: A local vanilla-TS Vite app that lets a developer pick a WCA event and see both the scramble text and its SVG rendered inline. Dev-only, not published.

**Independent Test**: Run `pnpm --filter @cubekit/scramble playground`, open the printed URL, pick an event, click Generate, see text + SVG. Clicking Generate again produces a different scramble.

### Implementation for User Story 3

- [ ] T016 [P] [US3] Create `packages/scramble/playground/index.html` with an `<h1>`, a `<select id="event">` (populated at runtime), a `<button id="gen">Generate</button>`, a `<pre id="scramble">` for the text output, and a `<div id="svg">` for the inline SVG. Loads `main.ts` as an ES module.
- [ ] T017 [P] [US3] Create `packages/scramble/playground/main.ts` importing `getScramble`, `getImage`, `getWcaEvents` from `../src/index.ts`. On load: populate the `<select>` with `getWcaEvents()` (value=id, text=label, default=`333`). On click: call `getScramble(currentId)`, render into `<pre>`, then `getImage(scramble, currentId)`, render into `<div>` via `innerHTML`.
- [ ] T018 [P] [US3] Create `packages/scramble/playground/vite.config.ts` exporting a vanilla `defineConfig({ root: __dirname })` — no plugins, resolves `../src` via TS directly. (Verify vite-plus's default toolchain can serve this; if not, fall back to vanilla `vite` dev dependency and document the choice in research.md.)
- [ ] T019 [US3] Verify the `"playground": "vite playground"` script added in T001 actually works end-to-end by running it and loading the page in a browser (manual check, no automated test).

**Checkpoint**: US3 functional — a developer can visually verify any WCA event in < 30 seconds.

---

## Phase 6: User Story 4 — Test coverage polish (Priority: P2)

**Goal**: Fill coverage gaps left by US1/US2 test files — namely the whitelist invariants, the public API surface, and anything that didn't land in a per-module test file.

**Independent Test**: `pnpm --filter @cubekit/scramble test` runs green; every exported symbol has at least one assertion touching it.

### Tests for User Story 4

- [ ] T020 [P] [US4] Create `packages/scramble/tests/wca-events.test.ts` asserting: `WCA_EVENTS.length === 17`; all `id`s are unique; every entry has non-empty `label` and `cstimerType`; every `length` is `≥ 0`; `333` and `333oh` share the same `cstimerType` (`'333'`); `WCA_EVENT_BY_ID[e.id] === e` for every entry; `getWcaEvents()` returns the same reference on repeated calls.
- [ ] T021 [P] [US4] Create `packages/scramble/tests/index.test.ts` (public API surface) asserting that the package's default import exposes exactly `{ getScramble, getImage, setSeed, getWcaEvents }` as functions, and that types `WcaEventId`, `WcaEvent`, `ScrambleType` are reachable via `import type` (type-only check — compiles with `noEmit`).

**Checkpoint**: Full coverage achieved.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final sweep — lint, typecheck, build, workspace-wide test run.

- [ ] T022 Run `pnpm --filter @cubekit/scramble typecheck` — must pass
- [ ] T023 Run `pnpm test` at repo root (i.e. `vp run test -r`) — all packages' tests must pass
- [ ] T024 Run `pnpm build` at repo root — `@cubekit/scramble` dist must build; verify `dist/index.mjs` and `dist/index.d.ts` are produced
- [ ] T025 Run `pnpm check` at repo root — lint/format must pass
- [ ] T026 Manually run the playground once (`pnpm --filter @cubekit/scramble playground`), pick 3–4 events (at least 333, 555, minx, sq1), confirm scramble + SVG render correctly. Paste a quick note into archive step later.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no deps — runs first
- **Foundational (Phase 2)**: depends on Phase 1 (needs `cstimer_module` installed, legacy files removed)
- **US1 (Phase 3)**: depends on Phase 2 (needs `cstimer.ts` + `wca-events.ts` + barrel stub)
- **US2 (Phase 4)**: depends on Phase 2; independent of US1 at the file level (different source files) but US2's `image.test.ts` reuses `getScramble` from US1 as a fixture → runtime ordering: US1 should land first for test stability
- **US3 (Phase 5)**: depends on US1 and US2 being importable (playground imports from `../src/index.ts`)
- **US4 (Phase 6)**: depends on Phase 2; can run in parallel with US1/US2 (different files, no runtime overlap)
- **Polish (Phase 7)**: depends on all previous phases

### Within a user story

- Source file → index.ts re-export → co-located test file
- Tests use `getWcaEvents()` as the table source, so they depend on the whitelist existing (Phase 2) and nothing else

### Parallel opportunities

- T005, T006 in Phase 2 are fully parallel
- T011, T012, T014, T015 in Phase 4 are all parallel (different files)
- T016, T017, T018 in Phase 5 are parallel (different files)
- T020, T021 in Phase 6 are parallel (different files)
- US1 (T008+T010) and US2 (T011/T012/T014/T015) can overlap if done by different workers, but US1 should be merged first so US2 tests can import stable fixtures

---

## Parallel Example: Phase 4 (US2)

```bash
# Four tasks, four different files — launch in parallel:
Task: "Create packages/scramble/src/image.ts"
Task: "Create packages/scramble/src/seed.ts"
Task: "Create packages/scramble/tests/image.test.ts"
Task: "Create packages/scramble/tests/seed.test.ts"
# Then (serial): uncomment re-exports in packages/scramble/src/index.ts
```

---

## Implementation Strategy

### MVP scope

**US1 alone is not a standalone MVP** here — a scramble string without a visual is not useful to a solver verifying the package. The practical MVP = **US1 + US2** (generation + image), which together already deliver the package's value. US3 (playground) and US4 (coverage polish) are quality-of-life on top.

### Recommended order

1. Phase 1 → Phase 2 (foundation)
2. Phase 3 (US1)
3. Phase 4 (US2) — **MVP complete here**; `pnpm test` should be green
4. Phase 6 (US4) — close remaining test gaps
5. Phase 5 (US3) — playground as the visual sanity check
6. Phase 7 — polish

### Stop points

- After Phase 4: the library is shippable for consumers; playground + edge-case tests are still pending but do not block usage.
- After Phase 6: full test coverage achieved, CI-green.
- After Phase 7: production-ready.

---

## Notes

- All tests run under `vite-plus/test` per existing `packages/scramble/tests/index.test.ts` style (`import { test, expect } from 'vite-plus/test';`)
- No JSDOM required — SVG assertions are string-level (`.includes('<svg')`, `.includes('</svg>')`)
- `cstimer_module` has no types package beyond its own `.d.ts`, which TypeScript picks up via the `main`/`types` in its `package.json`
- All commits should be scoped to a single US/phase for reviewability
- Commit after each checkpoint at minimum
