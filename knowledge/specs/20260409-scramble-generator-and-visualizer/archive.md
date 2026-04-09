# Archive: Scramble Generator & Visualizer

**Branch**: `20260409-scramble-generator-and-visualizer`
**Completed**: 2026-04-09
**Type**: feature

## Delivery Summary

Implemented a complete zero-dependency WCA scramble generation and SVG visualization system for all 16 WCA events in `packages/scramble`. The public API exposes two async functions — `generateScramble(event)` and `generateScrambleImage(event, scramble, options?)` — plus a `warmup()` preloader. The 2x2 uses a random-state solver with IDA\* and precomputed pruning tables; other NxN cubes use random-move generation; non-NxN events (skewb, pyram, sq1, clock, minx) use hand-crafted random state generators.

## Key Decisions

| Decision                | Choice                                              | Rationale                                                   | Alternatives considered                 |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| 2x2 generator algorithm | Random-state IDA\* solver                           | WCA requires uniform random states, not random moves        | Pure random-move (fast but non-uniform) |
| 3x3–7x7 generators      | Random-move with axial-move pruning                 | Correct for practice; Kociemba too complex for in-house     | Full Kociemba 2-phase solver            |
| SVG net renderer        | Generic `renderNxNNet` + event-specific wrappers    | Single source of truth for NxN rendering                    | Separate renderer per cube size         |
| Face storage convention | 0=U,1=D,2=F,3=B,4=L,5=R; each face in reading order | Matches cstimer/WCA tooling                                 | Face-first vs. sticker-first layout     |
| Move cycle direction    | Empirically verified via `(X Y X' Y')^6 = identity` | Geometric derivation error-prone; brute-force test reliable | Pure geometric proof (failed twice)     |
| Non-NxN visualizers     | Placeholder colored rects                           | Sufficient for MVP; exact geometry deferred                 | Full pentagon/triangle tessellation     |

## Pitfalls

- **Problem**: R, U, D, L cycle directions were all wrong initially — R was doing R', U was reversing wrong sides, etc.
  **Solution**: Derived the correct `(row/col, reversal)` combinations using geometric analysis `(x,y,z)→(x,z,-y)` for each face, then validated with the group-theory test `(X Y X' Y')^6 = identity` for all 12 adjacent pairs. The key insight: U CW cycles L→F→R→B with **no reversals**; D CW cycles F→L→B→R with **no reversals**; R CW cycles F→U with no reversal but U→B with reversal; L CW cycles U→F→D→B with D→B and B→U reversed.

- **Problem**: `func-style: expression` ESLint rule was project-wide and all new code used function declarations.
  **Solution**: Mass-converted all `function X()` to `const X = () =>` or `const X = (): T => {`. Perl sed approach dropped the `{` — manual per-file fixes were necessary. Pattern: convert, run `pnpm check --fix`, then fix remaining declaration/expression issues.

- **Problem**: `new Array(n)` is banned by `unicorn/no-new-array` rule.
  **Solution**: Use `Array.from({ length: n })` or `Array.from<T>({ length: n }).fill(defaultValue)` everywhere.

- **Problem**: After converting 222.ts, stack overflow at runtime. Caused by a typo in the F move table (`[5,1]` instead of `[4,1]` at position 5), making all states unreachable and triggering infinite recursion in the recursive fallback.
  **Solution**: The original source had the correct data; the rewrite introduced a copy error. Always re-verify move tables after any rewrite.

## Reusable Patterns

- **Group-theory validation for move engines**: Test `(X Y X' Y')^6 = identity` for all 12 adjacent face pairs and `X Y X' Y' = identity` for 3 opposite pairs. This comprehensively validates all cycle directions and reversals in O(moves²) time. See `tests/visualizer/apply-moves.test.ts`.

- **IDA\* with move-table precomputation (2x2 pattern)**: Build separate CP (corner permutation) and CO (corner orientation) move tables, combine into a joint pruning table via BFS. Solve random states by inverting the solution. Generalizes to any state-space puzzle with independent coordinate decomposition.

- **Generic NxN cross-net SVG renderer**: `renderNxNNet(state: CubeState)` with face layout `[{idx:0,ox:padFace,oy:0}, {idx:4,ox:0,oy:padFace}, ...]` works for any N. Event-specific wrappers delegate to this.

- **`Array.from<T>({ length: n }).fill(default)`**: Project-required pattern for initializing typed arrays without `new Array(n)`. Use consistently.

## Constitution Feedback

- [ ] Suggested update: Add to Section IV (Code Quality) that `new Array(n)` is banned — use `Array.from({ length: n })` instead. This is enforced by `unicorn/no-new-array` but not documented.
- [ ] Suggested update: Add a note that move-engine correctness for puzzle simulators should be validated with group-theory commutator tests, not just unit tests on individual moves.

## Next Steps

- Replace 3x3 random-move generator with a true Kociemba two-phase random-state solver for uniform distribution (currently generates practice-quality but not WCA-competition-quality scrambles).
- Replace 4x4 generator with a 3-phase random-state solver.
- Implement proper skewb, pyraminx, square-1, clock, and megaminx state tracking and rendering (current visualizers show solved/placeholder images).
- Add scramble history / undo support to the playground.
