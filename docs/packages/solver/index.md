# Solver Package

```mermaid
flowchart TD
    Public["@cubekit/solver public API"] --> Facade["solveThreeByThreeAssist"]
    Public --> Methods["method helpers"]
    Facade --> Methods
    Methods --> Search["DCTimer-style coordinate search"]
    Search --> Puzzle["@cubekit/scramble-puzzle"]
    Playground["apps/playground"] --> Public
```

`@cubekit/solver` owns platform-agnostic 3x3 auxiliary restore helpers. It
ports DCTimer-style helper searches into structured TypeScript results without
depending on scramble generation or SVG rendering packages.

## Key Rules

- The first public scope is Cross, XCross, EOline, EOFC, Roux S1, and Petrus S1.
- The package depends only on
  [@cubekit/scramble-puzzle](../../../packages/scramble-puzzle/src/index.ts#L1)
  for notation parsing and shared 3x3 state semantics.
- Do not import `@cubekit/scramble-core`, `@cubekit/scramble-image`, React, DOM,
  Taro, or browser globals from `packages/solver/src/`.
- Solver input accepts standard 3x3 face turns only. Cube rotations and wide
  moves are rejected by typed solver errors in this first scope.
- Results are structured by method, target, setup rotation, solution, depth, and
  FTM/QTM metrics; callers own display formatting.

## Verify

```bash
pnpm --filter @cubekit/solver test
pnpm --filter @cubekit/solver test:coverage
pnpm --filter @cubekit/solver typecheck
pnpm --filter @cubekit/solver build
```

## Key Files

- [packages/solver/src/index.ts#L1](../../../packages/solver/src/index.ts#L1) - public exports.
- [packages/solver/src/types.ts#L1](../../../packages/solver/src/types.ts#L1) - structured assist result API.
- [packages/solver/src/three-by-three/facade.ts#L1](../../../packages/solver/src/three-by-three/facade.ts#L1) - aggregate method dispatcher.
- [packages/solver/src/three-by-three/cross.ts#L1](../../../packages/solver/src/three-by-three/cross.ts#L1) - Cross, XCross, and EOFC search family.
- [packages/solver/src/three-by-three/eoline.ts#L1](../../../packages/solver/src/three-by-three/eoline.ts#L1) - EOline search.
- [packages/solver/src/three-by-three/roux.ts#L1](../../../packages/solver/src/three-by-three/roux.ts#L1) - Roux S1 search.
- [packages/solver/src/three-by-three/petrus.ts#L1](../../../packages/solver/src/three-by-three/petrus.ts#L1) - Petrus S1 search.

---

_Last updated: 2026-05-31 | Reason: add package-scoped knowledge for auxiliary solver package_
