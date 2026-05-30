# DCTimer Auxiliary Solvers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@cubekit/solver` with DCTimer-style 3x3 auxiliary solvers and add a playground solver debugging page.

**Architecture:** `packages/solver` is a platform-agnostic package that depends only on `@cubekit/scramble-puzzle`. It owns DCTimer-derived coordinate search, pruning tables, target metadata, structured result APIs, and method-specific validation helpers. `apps/playground` imports solver alongside existing scramble packages and keeps solver calls behind a local service boundary.

**Tech Stack:** TypeScript, vite-plus pack/test, Vitest, React 19, `@cubekit/scramble-puzzle`, `@cubekit/scramble-image`, `@cubekit/scramble-core`.

---

## File Structure

- Create `packages/solver/package.json`: package metadata, scripts, dependency on `@cubekit/scramble-puzzle`.
- Create `packages/solver/tsconfig.json`: package TypeScript config matching existing packages.
- Create `packages/solver/vite.config.ts`: vite-plus pack/test config.
- Create `packages/solver/LICENSE`, `packages/solver/NOTICE`, `packages/solver/README.md`, `packages/solver/AGENTS.md`: package boundary and verification notes.
- Create `packages/solver/src/index.ts`: public exports.
- Create `packages/solver/src/errors.ts`: package-specific errors.
- Create `packages/solver/src/types.ts`: public API and target types.
- Create `packages/solver/src/three-by-three/coordinate-utils.ts`: DCTimer combinatorics, permutation, orientation, pruning helpers.
- Create `packages/solver/src/three-by-three/move-utils.ts`: 3x3 algorithm validation and move conversion.
- Create `packages/solver/src/three-by-three/metrics.ts`: FTM/QTM counting.
- Create `packages/solver/src/three-by-three/cross.ts`: Cross, XCross, EOFC solver family.
- Create `packages/solver/src/three-by-three/eoline.ts`: EOline solver.
- Create `packages/solver/src/three-by-three/petrus.ts`: Petrus S1 solver.
- Create `packages/solver/src/three-by-three/roux.ts`: Roux S1 solver.
- Create `packages/solver/src/three-by-three/facade.ts`: aggregate `solveThreeByThreeAssist`.
- Create `packages/solver/src/three-by-three/target-validation.ts`: exported diagnostic predicates used by tests and playground preview composition.
- Create focused `*.test.ts` files next to the implementation files.
- Modify `apps/playground/package.json`: add `@cubekit/solver` dependency and build prep.
- Modify `apps/playground/vite.config.ts`: add source alias for `@cubekit/solver`.
- Modify `apps/playground/src/playground/types.ts`: add solver diagnostics and result view types.
- Modify `apps/playground/src/playground/playground-service.ts`: add solver adapter methods.
- Modify `apps/playground/src/playground/use-playground.ts`: add tab state and solver state.
- Modify `apps/playground/src/app.tsx`: add Scrambles/Solvers tabs and solver UI.
- Modify `apps/playground/src/app.test.tsx`: add solver UI coverage.
- Modify `apps/playground/src/styles.css`: add compact tab, solver form, and result-table styles.
- Create `docs/packages/solver/index.md`: package knowledge doc.
- Modify root `AGENTS.md`: add solver package doc to the knowledge table and routing note.

---

### Task 1: Package Scaffold

**Files:**

- Create: `packages/solver/package.json`
- Create: `packages/solver/tsconfig.json`
- Create: `packages/solver/vite.config.ts`
- Create: `packages/solver/LICENSE`
- Create: `packages/solver/NOTICE`
- Create: `packages/solver/README.md`
- Create: `packages/solver/AGENTS.md`
- Create: `packages/solver/src/index.ts`
- Create: `packages/solver/src/types.ts`
- Create: `packages/solver/src/errors.ts`
- Test: `packages/solver/src/index.test.ts`

- [ ] **Step 1: Write the failing public export test**

```ts
import { describe, expect, it } from 'vitest';
import {
  SolverError,
  UnsupportedSolverMoveError,
  solveCross,
  solveEOLine,
  solveEOFC,
  solvePetrusS1,
  solveRouxS1,
  solveThreeByThreeAssist,
  solveXCross,
} from './index.js';

describe('@cubekit/solver public API', () => {
  it('exports the 3x3 auxiliary solver facade', () => {
    expect(typeof solveCross).toBe('function');
    expect(typeof solveXCross).toBe('function');
    expect(typeof solveEOLine).toBe('function');
    expect(typeof solveEOFC).toBe('function');
    expect(typeof solveRouxS1).toBe('function');
    expect(typeof solvePetrusS1).toBe('function');
    expect(typeof solveThreeByThreeAssist).toBe('function');
  });

  it('exports solver-specific errors', () => {
    const error = new UnsupportedSolverMoveError('Rw');

    expect(error).toBeInstanceOf(SolverError);
    expect(error.message).toContain('Rw');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @cubekit/solver test`

Expected: fails because `@cubekit/solver` and `packages/solver/src/index.ts` do not exist yet.

- [ ] **Step 3: Add minimal package scaffold and temporary throwing API**

Create the package files with the same scripts and TypeScript settings as `packages/scramble-core`. `src/index.ts` exports typed functions with the approved signatures; until later tasks replace each function body, each one throws `SolverError('not implemented')`. `src/errors.ts` defines `SolverError`, `InvalidSolverScrambleError`, `UnsupportedSolverMoveError`, `UnknownSolverMethodError`, `UnknownSolverTargetError`, and `NoSolverSolutionError`.

- [ ] **Step 4: Run scaffold verification**

Run:

```bash
pnpm install --ignore-scripts
pnpm --filter @cubekit/solver test
pnpm --filter @cubekit/solver typecheck
pnpm --filter @cubekit/solver build
```

Expected: all pass with temporary throwing functions and exported errors.

- [ ] **Step 5: Commit**

```bash
git add packages/solver pnpm-lock.yaml
git commit -m "feat: add solver package scaffold"
```

---

### Task 2: Shared 3x3 Utilities

**Files:**

- Create: `packages/solver/src/three-by-three/coordinate-utils.ts`
- Create: `packages/solver/src/three-by-three/move-utils.ts`
- Create: `packages/solver/src/three-by-three/metrics.ts`
- Test: `packages/solver/src/three-by-three/coordinate-utils.test.ts`
- Test: `packages/solver/src/three-by-three/move-utils.test.ts`
- Test: `packages/solver/src/three-by-three/metrics.test.ts`

- [ ] **Step 1: Write failing coordinate utility tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  createPruningTable,
  flipToIndex,
  indexToCombination,
  indexToFlip,
  indexToPermutation,
  permutationToIndex,
} from './coordinate-utils.js';

describe('coordinate utilities', () => {
  it('round-trips DCTimer-style permutations', () => {
    const permutation = [2, 0, 3, 1];
    const index = permutationToIndex(permutation, 4, false);
    const next = indexToPermutation(index, 4, false);

    expect(next).toEqual(permutation);
  });

  it('round-trips zero-sum edge flips', () => {
    const flips = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const index = flipToIndex(flips, 12, true);

    expect(indexToFlip(index, 12, true)).toEqual(flips);
  });

  it('uses DCTimer combination indexing order', () => {
    expect(indexToCombination(0, 2, 5)).toEqual([0, 0, 0, 1, 1]);
    expect(indexToCombination(9, 2, 5)).toEqual([1, 1, 0, 0, 0]);
  });

  it('builds pruning tables by repeated face turns', () => {
    const moveTable = [[1], [2], [0]] as const;

    expect(createPruningTable(3, [0], 2, moveTable, 1)).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: Write failing move and metric tests**

```ts
import { describe, expect, it } from 'vitest';
import { UnsupportedSolverMoveError } from '../errors.js';
import { parseThreeByThreeSolverAlgorithm } from './move-utils.js';
import { countFaceTurnMetric, countQuarterTurnMetric } from './metrics.js';

describe('3x3 solver move utilities', () => {
  it('accepts face turns', () => {
    expect(parseThreeByThreeSolverAlgorithm("R U R' U2")).toHaveLength(4);
  });

  it('rejects rotations and wide moves for the first solver scope', () => {
    expect(() => parseThreeByThreeSolverAlgorithm('x')).toThrow(UnsupportedSolverMoveError);
    expect(() => parseThreeByThreeSolverAlgorithm('Rw')).toThrow(UnsupportedSolverMoveError);
  });
});

describe('solver metrics', () => {
  it('counts FTM and QTM', () => {
    const algorithm = "R U2 F'";

    expect(countFaceTurnMetric(algorithm)).toBe(3);
    expect(countQuarterTurnMetric(algorithm)).toBe(4);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
pnpm --filter @cubekit/solver test -- coordinate-utils move-utils metrics
```

Expected: fails because helper modules do not exist.

- [ ] **Step 4: Implement utilities**

Port DCTimer `Utils.java` helpers into typed TypeScript:

- `binomial(n, k)`
- `permutationToIndex`
- `indexToPermutation`
- `flipToIndex`
- `indexToFlip`
- `orientationToIndex`
- `indexToOrientation`
- `combinationToIndex`
- `indexToCombination`
- `cycleFour`
- `cycleFourWithOrientation`
- `createPruningTable`

Implement move parsing through `parseCubeAlgorithm`; reject rotations and any parsed move with `width !== 1`.

- [ ] **Step 5: Run utility tests**

Run:

```bash
pnpm --filter @cubekit/solver test -- coordinate-utils move-utils metrics
pnpm --filter @cubekit/solver typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add packages/solver/src/three-by-three packages/solver/src/errors.ts packages/solver/src/index.ts
git commit -m "feat: add solver coordinate utilities"
```

---

### Task 3: Cross, XCross, And EOFC

**Files:**

- Create: `packages/solver/src/three-by-three/cross.ts`
- Create: `packages/solver/src/three-by-three/target-validation.ts`
- Test: `packages/solver/src/three-by-three/cross.test.ts`
- Modify: `packages/solver/src/index.ts`

- [ ] **Step 1: Write failing Cross family tests**

```ts
import { describe, expect, it } from 'vitest';
import { solveCross, solveEOFC, solveXCross } from '../index.js';
import { isCrossSolved, isEOFCAligned, isXCrossSolved } from './target-validation.js';

describe('Cross family solvers', () => {
  it('solves D cross for a simple scramble', () => {
    const result = solveCross('F', { targets: ['D'] });
    const solution = result.solutions[0];

    expect(solution.target).toBe('D');
    expect(isCrossSolved('F', solution)).toBe(true);
  });

  it('solves XCross with a structured result', () => {
    const result = solveXCross("R U R'", { targets: ['D'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('xcross');
    expect(isXCrossSolved("R U R'", solution)).toBe(true);
  });

  it('solves EOFC for a line target', () => {
    const result = solveEOFC("R U F'", { targets: ['D(FB)'] });
    const solution = result.solutions[0];

    expect(solution.target).toBe('D(FB)');
    expect(isEOFCAligned("R U F'", solution)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @cubekit/solver test -- cross`

Expected: fails because `cross.ts` and validation helpers are not implemented.

- [ ] **Step 3: Implement Cross family search**

Port DCTimer `Cross.java`:

- edge permutation/orientation move tables
- cross pruning tables
- EOFC pruning table
- XCross corner/first-edge tables
- target labels and setup rotations
- `solveCross`
- `solveXCross`
- `solveEOFC`

Return one solution per requested target. Default depth caps match DCTimer: Cross `< 9`, XCross `< 11`, EOFC `< 13`.

- [ ] **Step 4: Implement Cross validation helpers**

`target-validation.ts` composes `scramble`, `setupRotation`, and `solution`, then applies the composed algorithm through `createCubeDefinition(3, ['333'])`. For this task, validation may delegate to the Cross coordinate state used by the solver so tests prove the public solution reaches the intended coordinate target.

- [ ] **Step 5: Run Cross family tests**

Run:

```bash
pnpm --filter @cubekit/solver test -- cross
pnpm --filter @cubekit/solver typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add packages/solver/src
git commit -m "feat: add cross family solvers"
```

---

### Task 4: EOline

**Files:**

- Create: `packages/solver/src/three-by-three/eoline.ts`
- Test: `packages/solver/src/three-by-three/eoline.test.ts`
- Modify: `packages/solver/src/three-by-three/target-validation.ts`
- Modify: `packages/solver/src/index.ts`

- [ ] **Step 1: Write failing EOline tests**

```ts
import { describe, expect, it } from 'vitest';
import { solveEOLine } from '../index.js';
import { isEOLineSolved } from './target-validation.js';

describe('EOline solver', () => {
  it('solves a requested line target', () => {
    const result = solveEOLine("R U F'", { targets: ['DF DB'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('eoline');
    expect(solution.target).toBe('DF DB');
    expect(isEOLineSolved("R U F'", solution)).toBe(true);
  });

  it('searches all EOline targets by default', () => {
    expect(solveEOLine('').solutions).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @cubekit/solver test -- eoline`

Expected: fails because EOline implementation is missing.

- [ ] **Step 3: Implement EOline**

Port DCTimer `EOline.java`:

- 2048 EO move/pruning table
- 132 line-edge permutation table
- twelve target labels, move maps, and setup rotations
- one-solution IDA search up to DCTimer depth `< 10`

- [ ] **Step 4: Run EOline tests**

Run:

```bash
pnpm --filter @cubekit/solver test -- eoline
pnpm --filter @cubekit/solver typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/solver/src
git commit -m "feat: add eoline solver"
```

---

### Task 5: Petrus S1 And Roux S1

**Files:**

- Create: `packages/solver/src/three-by-three/petrus.ts`
- Create: `packages/solver/src/three-by-three/roux.ts`
- Test: `packages/solver/src/three-by-three/petrus.test.ts`
- Test: `packages/solver/src/three-by-three/roux.test.ts`
- Modify: `packages/solver/src/three-by-three/target-validation.ts`
- Modify: `packages/solver/src/index.ts`

- [ ] **Step 1: Write failing Petrus and Roux tests**

```ts
import { describe, expect, it } from 'vitest';
import { solvePetrusS1, solveRouxS1 } from '../index.js';
import { isPetrusS1Solved, isRouxS1Solved } from './target-validation.js';

describe('Petrus S1 solver', () => {
  it('solves a requested 2x2x2 block target', () => {
    const result = solvePetrusS1("R U F'", { targets: ['ULF'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('petrus-s1');
    expect(solution.target).toBe('ULF');
    expect(isPetrusS1Solved("R U F'", solution)).toBe(true);
  });
});

describe('Roux S1 solver', () => {
  it('solves a requested 1x2x3 block target', () => {
    const result = solveRouxS1("R U F'", { targets: ['LU'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('roux-s1');
    expect(solution.target).toBe('LU');
    expect(isRouxS1Solved("R U F'", solution)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @cubekit/solver test -- petrus roux`

Expected: fails because Petrus and Roux implementations are missing.

- [ ] **Step 3: Implement Petrus S1**

Port the DCTimer `Petrus.java` S1 path only:

- edge coordinate move tables reused by Roux
- corner orientation/permutation table for block corner
- pruning tables for S1
- eight block target labels
- one-solution IDA search up to DCTimer depth `< 9`

- [ ] **Step 4: Implement Roux S1**

Port the DCTimer `Roux.java` S1 path only:

- corner move tables
- block edge/corner pruning tables
- target labels and setup rotations
- one-solution IDA search up to DCTimer depth `< 10`
- leave Roux S2 out of scope

- [ ] **Step 5: Run Petrus and Roux tests**

Run:

```bash
pnpm --filter @cubekit/solver test -- petrus roux
pnpm --filter @cubekit/solver typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add packages/solver/src
git commit -m "feat: add petrus and roux s1 solvers"
```

---

### Task 6: Aggregate Facade And Error Coverage

**Files:**

- Create: `packages/solver/src/three-by-three/facade.ts`
- Test: `packages/solver/src/three-by-three/facade.test.ts`
- Modify: `packages/solver/src/index.ts`
- Modify: `packages/solver/src/three-by-three/move-utils.ts`

- [ ] **Step 1: Write failing facade and error tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  UnknownSolverMethodError,
  UnknownSolverTargetError,
  UnsupportedSolverMoveError,
  solveCross,
  solveThreeByThreeAssist,
} from '../index.js';

describe('3x3 assist facade', () => {
  it('runs multiple methods in one call', () => {
    const results = solveThreeByThreeAssist('R U', ['cross', 'eoline']);

    expect(results.map((result) => result.method)).toEqual(['cross', 'eoline']);
  });

  it('rejects unknown targets', () => {
    expect(() => solveCross('', { targets: ['bad-target'] })).toThrow(UnknownSolverTargetError);
  });

  it('rejects unsupported wide moves before searching', () => {
    expect(() => solveCross('Rw')).toThrow(UnsupportedSolverMoveError);
  });

  it('rejects unknown methods at runtime boundaries', () => {
    expect(() => solveThreeByThreeAssist('', ['cross', 'bad' as never])).toThrow(
      UnknownSolverMethodError,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @cubekit/solver test -- facade`

Expected: fails because facade behavior and target validation are incomplete.

- [ ] **Step 3: Implement facade**

Dispatch methods explicitly:

- `cross` -> `solveCross`
- `xcross` -> `solveXCross`
- `eoline` -> `solveEOLine`
- `eofc` -> `solveEOFC`
- `roux-s1` -> `solveRouxS1`
- `petrus-s1` -> `solvePetrusS1`

If a target is not valid for a method, throw `UnknownSolverTargetError` before search.

- [ ] **Step 4: Run all solver package tests**

Run:

```bash
pnpm --filter @cubekit/solver test
pnpm --filter @cubekit/solver typecheck
pnpm --filter @cubekit/solver build
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/solver/src
git commit -m "feat: add solver aggregate facade"
```

---

### Task 7: Playground Solver Page

**Files:**

- Modify: `apps/playground/package.json`
- Modify: `apps/playground/vite.config.ts`
- Modify: `apps/playground/src/playground/types.ts`
- Modify: `apps/playground/src/playground/playground-service.ts`
- Modify: `apps/playground/src/playground/use-playground.ts`
- Modify: `apps/playground/src/app.tsx`
- Modify: `apps/playground/src/app.test.tsx`
- Modify: `apps/playground/src/styles.css`

- [ ] **Step 1: Write failing playground tests**

Add tests to `apps/playground/src/app.test.tsx`:

```tsx
it('opens the solver page and shows auxiliary solutions', async () => {
  render(<App />);

  await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));
  await userEvent.clear(screen.getByLabelText('Solver scramble'));
  await userEvent.type(screen.getByLabelText('Solver scramble'), 'R U');
  await userEvent.click(screen.getByRole('button', { name: 'Solve' }));

  expect(await screen.findByText('cross')).toBeTruthy();
  expect(screen.getByText(/Result count/i)).toBeTruthy();
});

it('shows solver errors without leaving the solver page', async () => {
  render(<App />);

  await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));
  await userEvent.clear(screen.getByLabelText('Solver scramble'));
  await userEvent.type(screen.getByLabelText('Solver scramble'), 'Rw');
  await userEvent.click(screen.getByRole('button', { name: 'Solve' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Rw');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter playground test`

Expected: fails because solver tab/UI does not exist.

- [ ] **Step 3: Wire playground package dependency and alias**

Add `@cubekit/solver` to playground dependencies, add it to `prepare:deps`, and add a Vite alias pointing at `../../packages/solver/src/index.ts`.

- [ ] **Step 4: Add solver service methods**

Extend `createPlaygroundService` with `solveThreeByThree(input)` that calls `solveThreeByThreeAssist`, records duration, result count, and builds composed algorithms for preview.

- [ ] **Step 5: Add hook state**

Extend `usePlayground` with:

- `activePage: 'scrambles' | 'solvers'`
- `solverScramble`
- `solverMethods`
- `solverResults`
- `solverError`
- `solverDiagnostics`
- `solveThreeByThree`

- [ ] **Step 6: Add UI and styles**

Add accessible tabs, a solver form, method checkboxes, results table, diagnostics, and error panel. Keep existing scramble UI unchanged inside the Scrambles tab.

- [ ] **Step 7: Run playground verification**

Run:

```bash
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add apps/playground packages/solver pnpm-lock.yaml
git commit -m "feat: add solver playground page"
```

---

### Task 8: Package Documentation And Final Verification

**Files:**

- Create: `docs/packages/solver/index.md`
- Modify: `AGENTS.md`
- Modify: `docs/project-structure.md`
- Modify: `docs/.state.md`

- [ ] **Step 1: Write solver package docs**

Create `docs/packages/solver/index.md` with a Mermaid-first package boundary diagram, dependency rules, API summary, and verification commands.

- [ ] **Step 2: Update routing docs**

Add the solver package to root `AGENTS.md` and `docs/project-structure.md`, keeping concise prose and relative links.

- [ ] **Step 3: Run final verification**

Run:

```bash
pnpm --filter @cubekit/solver test
pnpm --filter @cubekit/solver typecheck
pnpm --filter @cubekit/solver build
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
pnpm --filter './packages/*' test
pnpm --filter './packages/*' build
pnpm test
pnpm check
```

Expected: all pass, or any pre-existing unrelated failure is captured with exact command output and file context.

- [ ] **Step 4: Commit docs and any final polish**

```bash
git add AGENTS.md docs packages/solver apps/playground pnpm-lock.yaml
git commit -m "docs: document solver package boundary"
```

---

## Self-Review

- Spec coverage: package split, dependency rules, six 3x3 methods, structured API, playground debug surface, error handling, tests, and verification each map to tasks above.
- Placeholder scan: no task depends on a later undefined module without first creating it in an earlier task.
- Type consistency: public method names, method ids, option fields, result fields, and error names match the approved spec.
- Scope check: non-3x3 auxiliary solvers, production app integration, and DCTimer raw string compatibility remain out of scope.
