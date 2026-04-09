# Implementation Plan: WCA Scramble Generator & Visualizer

**Branch**: `20260409-scramble-generator-and-visualizer` | **Date**: 2026-04-09
**Spec**: [spec.md](./spec.md)

---

## Summary

Repurpose `packages/scramble` from a text-animation utility into a WCA-compliant Rubik's cube scramble library. Provide two public APIs: `generateScramble(event)` returning a move string, and `generateScrambleImage(event, scramble)` returning an SVG string of the post-scramble cube net. All 16 WCA events must be supported. All scramble algorithms are implemented from scratch in TypeScript, referencing cstimer (cs0x7f/cstimer) and DCTimer as algorithm references. `cstimer_module` is a last-resort fallback only if a specific implementation proves infeasible.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, `verbatimModuleSyntax`)
**Primary Dependencies**: none (zero runtime dependencies — all algorithms implemented in TypeScript)
**Testing**: vitest via `vp test`
**Lint/Build**: `vp check`
**Target Platform**: Browser (ESM) + Node.js — no DOM APIs in library code
**Project Type**: Library package (`vp pack`, exports `.mjs` + `.d.ts`)
**Performance Goals**: `generateScramble` must complete < 500ms (including WASM init on first call); subsequent calls < 50ms
**Constraints**: No DOM dependency; SVG output must be pure string; package size should stay reasonable (WASM budget if used: < 2MB)

---

## Constitution Check

| Principle                         | Status  | Notes                                                                                                                         |
| --------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| TypeScript strict mode            | ✅ PASS | Existing tsconfig already has `strict: true`                                                                                  |
| kebab-case files                  | ✅ PASS | All new files will use kebab-case                                                                                             |
| packages/ stays platform-agnostic | ✅ PASS | No DOM APIs; SVG is pure string                                                                                               |
| No new tooling                    | ✅ PASS | Using existing `vp pack` / `vp test` / `vp check`                                                                             |
| TDD — tests before implementation | ✅ PASS | Tasks ordered test-first                                                                                                      |
| Full coverage on core logic       | ✅ PASS | All generators and visualizer paths covered                                                                                   |
| Shared types in packages/types    | ⚠️ NOTE | `WcaEvent` and `ImageOptions` defined in this package for now; if other packages need them later, extract to `packages/types` |
| pnpm only                         | ✅ PASS | Using pnpm                                                                                                                    |

---

## Architecture Decisions

### Decision 1: Scramble Engine Strategy — All Own Implementation

All algorithms are implemented from scratch in TypeScript. References: cstimer source (`cs0x7f/cstimer`), DCTimer-Android, `torjusti/cube-solver` (clean Kociemba JS), and `cubing/mark2`. `cstimer_module` is kept as a named fallback only if a specific event's implementation fails QA.

**Per-event algorithm plan**:

| Event         | Algorithm                                                                                                          | Complexity | Est. LoC    |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ----------- |
| `333`         | Kociemba two-phase (min2phase) — CO/EO/UDSlice coords, IDA\*, 48-sym reduction                                     | High       | 1,500–2,500 |
| `222`         | Coordinate BFS/IDA\* — 7-CP (5040 states) + 7-CO (729 states), move+pruning tables                                 | Medium     | 300–500     |
| `444`         | 3-phase IDA\* with symmetry — Center/Edge/Corner cubes, 3 pruning tables                                           | Very High  | 2,000–3,500 |
| `555`         | **Random-move** (60 moves) — WCA standard, no solver needed                                                        | Low        | 30–60       |
| `666`         | **Random-move** (80 moves)                                                                                         | Low        | 30–60       |
| `777`         | **Random-move** (100 moves)                                                                                        | Low        | 30–60       |
| `minx`        | **Random-move** R++/D-- notation (70 moves) — WCA standard for Megaminx                                            | Low-Medium | 80–150      |
| `pyram`       | Random-state IDA\*, two-phase — EP (360) + EO (32) + CO (81) coords, phase hash tables; tips randomized separately | Medium     | 400–700     |
| `sq1`         | Two-phase IDA\* — shape coord (7,356) + CP/EP (40,320 each), 3 move tables + 2 pruning tables                      | High       | 700–1,200   |
| `skewb`       | Random-state IDA\* (≤11 moves) — center/corner perm + twist coords, 5-generator move table                         | Medium     | 200–400     |
| `clock`       | Gaussian elimination (mod 12) — 18×14 move matrix, 14-state vector, mod-12 inverse table                           | Low-Medium | 150–250     |
| `333bf/fm/oh` | Same as `333`                                                                                                      | —          | reuse       |
| `444bf`       | Same as `444`                                                                                                      | —          | reuse       |
| `555bf`       | Same as `555` (random-move)                                                                                        | —          | reuse       |

**Note on 5x5**: WCA uses random-move (60 moves) for 5x5, not random-state. This is a common misconception — true random-state 5x5 is computationally prohibitive and not required.
**Note on Megaminx**: WCA uses random-move R++/D-- notation, not true random-state.

**Shared utilities** (`src/generators/utils/`):

- `coords.ts` — coordinate encode/decode helpers (permutation index, orientation index, Cnk)
- `ida-star.ts` — generic IDA\* search implementation
- `random.ts` — PRNG utilities (Fisher-Yates shuffle, random int)
- `move-table.ts` — generic move table builder

### Decision 2: Async API — Precomputation Tables

The 3x3 Kociemba solver and 4x4 3-phase solver require significant precomputation (move tables, pruning tables). In browser environments this should happen off the main thread. We expose a `warmup()` function that apps can call at startup to pre-initialize tables. Both `generateScramble` and `generateScrambleImage` are async to accommodate this on first call. Precomputed tables are lazily initialized and cached as module-level singletons.

### Decision 3: Visualizer — Pure String SVG, Cube Net Only (v1)

SVG cube nets are generated by:

1. Applying scramble moves to a solved `CubeState` (array of face colors)
2. Rendering the resulting state as colored rectangles in a standard net layout

No canvas, no DOM, no third-party SVG lib. `options.mode` is part of the `ImageOptions` type but only `'2d'` is implemented; `'3d'` throws `NotImplementedError` with a clear message.

### Decision 4: Full Package Repurpose

Old text-animation code (`scrambleText`, `scramble`, `createScrambler`) and their tests are deleted. The package description in `package.json` is updated.

---

## Project Structure

### Documentation (this feature)

```text
knowledge/specs/20260409-scramble-generator-and-visualizer/
├── spec.md
├── plan.md              ← this file
└── tasks.md             ← next step
```

### Source Code

```text
packages/scramble/
├── package.json                  # update description; add "dev" script pointing to playground
├── playground/
│   ├── index.html                # self-contained playground page
│   └── main.ts                   # imports from src/index.ts, wires up UI
├── src/
│   ├── index.ts                  # public API: generateScramble, generateScrambleImage, warmup, WcaEvent, ImageOptions
│   ├── types.ts                  # WcaEvent union, ImageOptions, CubeState, ColorScheme
│   ├── generators/
│   │   ├── index.ts              # registry: WcaEvent → generator function
│   │   ├── utils/
│   │   │   ├── coords.ts         # permutation index, orientation index, Cnk table
│   │   │   ├── ida-star.ts       # generic IDA* search
│   │   │   ├── random.ts         # PRNG, Fisher-Yates shuffle, random int
│   │   │   └── move-table.ts     # generic move table builder
│   │   ├── 333.ts                # Kociemba two-phase (CO/EO/UDSlice, 48-sym, IDA*)
│   │   ├── 222.ts                # coord BFS/IDA* (7-CP, 7-CO)
│   │   ├── 444.ts                # 3-phase IDA* with symmetry (Center/Edge/Corner)
│   │   ├── 555.ts                # random-move 60 moves
│   │   ├── 666.ts                # random-move 80 moves
│   │   ├── 777.ts                # random-move 100 moves
│   │   ├── minx.ts               # random-move R++/D-- notation (70 moves)
│   │   ├── pyram.ts              # random-state IDA* (EP/EO/CO coords + tips)
│   │   ├── sq1.ts                # two-phase IDA* (shape + permutation)
│   │   ├── skewb.ts              # random-state IDA* ≤11 moves (5-generator)
│   │   └── clock.ts              # Gaussian elimination mod-12 (18×14 move matrix)
│   └── visualizer/
│       ├── index.ts              # generateScrambleImage dispatcher
│       ├── apply-moves.ts        # move parser + CubeState mutator (shared logic)
│       ├── svg.ts                # SVG primitive helpers (rect, group, text)
│       ├── 333-net.ts            # 3x3 cube net SVG layout
│       ├── 222-net.ts
│       ├── 444-net.ts
│       ├── 555-net.ts
│       ├── 666-net.ts
│       ├── 777-net.ts
│       ├── minx-net.ts
│       ├── pyram-net.ts
│       ├── sq1-net.ts
│       ├── skewb-net.ts
│       └── clock-net.ts
└── tests/
    ├── generators/
    │   ├── utils/
    │   │   ├── coords.test.ts
    │   │   └── ida-star.test.ts
    │   ├── 333.test.ts
    │   ├── 222.test.ts
    │   ├── 444.test.ts
    │   ├── 555.test.ts
    │   ├── 666.test.ts
    │   ├── 777.test.ts
    │   ├── minx.test.ts
    │   ├── pyram.test.ts
    │   ├── sq1.test.ts
    │   ├── skewb.test.ts
    │   ├── clock.test.ts
    │   └── all-events.test.ts    # integration: all 16 events succeed
    └── visualizer/
        ├── apply-moves.test.ts
        ├── 333-net.test.ts
        ├── 222-net.test.ts
        └── ...
```

**Structure Decision**: Single package, feature-grouped by `generators/` and `visualizer/`. No new packages added (types stay local; extract to `packages/types` only if another package needs them).

---

## Complexity Tracking

| Item                                    | Why Needed                                                                                                 | Simpler Alternative Rejected Because                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Kociemba two-phase for 333              | WCA requires random-state for 3x3; random-move scrambles are not WCA-compliant                             | Random-move would violate WCA regulation 4b3                                                                  |
| 3-phase IDA\* for 444                   | WCA requires random-state for 4x4; Center/Edge/Corner coordinate system is necessary for tractable search  | Random-move for 4x4 is not WCA-compliant                                                                      |
| Async `generateScramble`                | 333/444 precompute move/pruning tables on first call; this must not block main thread                      | Sync API would freeze UI for ~200ms on first call                                                             |
| Separate `generators/` per event        | Each event has different notation, state model, and algorithm                                              | Merging into one file would make the code unmaintainable                                                      |
| `generators/utils/` shared layer        | IDA\*, coordinate math, and PRNG are used by 6+ generators                                                 | Duplicating these per-event would be ~1,000 lines of repeated code                                            |
| `cstimer_module` (absolute last resort) | Only if 444 or sq1 own implementation produces demonstrably incorrect scrambles after exhausting debugging | Goal is zero runtime deps; this would only be added as a named `optionalDependency` in a separate fallback PR |
