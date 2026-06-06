# Solver Package

```mermaid
flowchart TD
    Public["@cubegin/solver public API"] --> Facade["solvePuzzleAssist"]
    Public --> ThreeFacade["solveThreeByThreeAssist"]
    Public --> Methods["method helpers"]
    Facade --> Methods
    ThreeFacade --> Methods
    Methods --> Search["Coordinate search and pruning tables"]
    Search --> Puzzle["@cubegin/scramble-puzzle"]
    Playground["apps/playground"] --> Public
```

`@cubegin/solver` owns platform-agnostic auxiliary restore helpers. It provides
structured TypeScript results for method-specific assist searches without
depending on scramble generation or SVG rendering packages.

## Key Rules

- The public scope is Cross, XCross, EOline, EOFC, Roux S1, Petrus S1, 2x2
  Face/Layer, Square-1 shape in FTM/TTM-style metrics, and Pyraminx V.
- The package depends only on
  [@cubegin/scramble-puzzle](../../../packages/scramble-puzzle/src/index.ts#L1)
  for notation parsing and shared puzzle state semantics.
- Do not import `@cubegin/scramble-core`, `@cubegin/scramble-image`, React, DOM,
  Taro, or browser globals from `packages/solver/src/`.
- 3x3 solver input accepts ordinary face turns and rejects rotations/wide moves.
  2x2 helpers accept the URF coordinate move set, Pyraminx V ignores tip-only
  moves, and Square-1 shape uses tuple/slash notation.
- Results are structured by method, target, setup rotation, solution, depth, and
  FTM/QTM metrics; callers own display formatting.

## Verify

```bash
pnpm --filter @cubegin/solver test
pnpm --filter @cubegin/solver test:coverage
pnpm --filter @cubegin/solver typecheck
pnpm --filter @cubegin/solver build
```

## Key Files

- [packages/solver/src/index.ts#L1](../../../packages/solver/src/index.ts#L1) - public exports.
- [packages/solver/src/types.ts#L1](../../../packages/solver/src/types.ts#L1) - structured assist result API.
- [packages/solver/src/assist/facade.ts#L1](../../../packages/solver/src/assist/facade.ts#L1) - aggregate dispatcher for 3x3, 2x2, Square-1, and Pyraminx.
- [packages/solver/src/assist/three-by-three/facade.ts#L1](../../../packages/solver/src/assist/three-by-three/facade.ts#L1) - aggregate 3x3 method dispatcher.
- [packages/solver/src/assist/three-by-three/cross.ts#L1](../../../packages/solver/src/assist/three-by-three/cross.ts#L1) - Cross, XCross, and EOFC search family.
- [packages/solver/src/assist/three-by-three/eoline.ts#L1](../../../packages/solver/src/assist/three-by-three/eoline.ts#L1) - EOline search.
- [packages/solver/src/assist/three-by-three/roux.ts#L1](../../../packages/solver/src/assist/three-by-three/roux.ts#L1) - Roux S1 search.
- [packages/solver/src/assist/three-by-three/petrus.ts#L1](../../../packages/solver/src/assist/three-by-three/petrus.ts#L1) - Petrus S1 search.
- [packages/solver/src/assist/two-by-two/face-layer.ts#L1](../../../packages/solver/src/assist/two-by-two/face-layer.ts#L1) - 2x2 Face and Layer helpers.
- [packages/solver/src/assist/square1/shape.ts#L1](../../../packages/solver/src/assist/square1/shape.ts#L1) - Square-1 shape helper.
- [packages/solver/src/assist/pyraminx/v.ts#L1](../../../packages/solver/src/assist/pyraminx/v.ts#L1) - Pyraminx V helper.

---

_Last updated: 2026-05-31 | Reason: clarify solver package structure and remove upstream-specific wording_
