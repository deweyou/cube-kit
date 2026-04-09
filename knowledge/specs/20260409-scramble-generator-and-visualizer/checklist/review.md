# Review Checklist: Scramble Generator & Visualizer

**Purpose**: Final review before archiving this feature
**Created**: 2026-04-09
**Feature**: [spec.md](../spec.md)

## Functional Completeness

- [x] CHK001 All 16 WCA events have `generateScramble` support
- [x] CHK002 All 16 WCA events have `generateScrambleImage` SVG output
- [x] CHK003 NxN cubes (2x2–7x7) apply the scramble to a solved state and render it
- [x] CHK004 3x3 BLD/FM/OH variants produce correct scrambles and images
- [x] CHK005 Non-NxN events (skewb, pyram, sq1, clock, minx) render placeholder images
- [x] CHK006 `generateScramble('222')` uses random-state solver (not random-move)

## API Correctness

- [x] CHK007 `generateScramble(event)` is async and returns a string
- [x] CHK008 `generateScrambleImage(event, scramble, options?)` is async and returns `<svg>...`
- [x] CHK009 `options.width` / `options.height` are reflected in SVG attributes
- [x] CHK010 `options.mode = '3d'` throws a clear error
- [x] CHK011 `warmup()` exists and resolves without error

## Correctness of Move Execution

- [x] CHK012 `(R U R' U')^6` = identity on 3x3
- [x] CHK013 All adjacent face commutator pairs have order 6
- [x] CHK014 Opposite face commutators (U D, R L, F B) are identity
- [x] CHK015 Solved state after 0 moves renders all 6 canonical colors

## Tests

- [x] CHK016 130 tests pass, 0 failures
- [x] CHK017 Integration test covers all 8 event types via `generateScrambleImage`
- [x] CHK018 NxN net tests verify rect counts (24/54/96) and color presence

## Constitution Compliance

- [x] CHK019 Zero runtime dependencies (no npm packages imported)
- [x] CHK020 All exports are `const` arrow functions (func-style: expression)
- [x] CHK021 No `new Array(n)` — uses `Array.from({ length: n })` throughout
- [x] CHK022 Playground HTML/TS created for visual verification
- [x] CHK023 `pnpm check` clean for `packages/scramble` (remaining errors are in pre-existing apps)
