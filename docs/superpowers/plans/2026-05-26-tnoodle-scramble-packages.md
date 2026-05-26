# TNoodle Scramble Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build TNoodle-compatible TypeScript packages for puzzle notation/state, WCA scramble generation, and SVG scramble-image rendering without changing apps or the existing `packages/scramble` package.

**Architecture:** `packages/scramble-puzzle` owns event ids, puzzle definitions, notation parsers, state transitions, normalization, and shared test fixtures. `packages/scramble-core` depends on `scramble-puzzle` for TNoodle-compatible generation and solver adapters. `packages/scramble-image` depends on `scramble-puzzle` for applying scrambles and owns DOM-free SVG serialization and puzzle renderers.

**Tech Stack:** TypeScript 5 strict mode, pnpm 10 workspaces, vite-plus pack/test, vitest, DOM-free SVG string serialization, TNoodle baseline `thewca/tnoodle v1.2.3` and `thewca/tnoodle-lib v0.19.2`

---

## Required Context

Read these before starting implementation:

- `AGENTS.md`
- `docs/project-structure.md`
- `docs/scramble-runtime.md`
- `docs/tnoodle-baseline.md`
- `docs/dependency-licensing.md`
- `docs/superpowers/specs/2026-05-26-tnoodle-scramble-packages-design.md`

Do not change `apps/*` or `packages/scramble` in this plan.

---

## File Map

```text
packages/scramble-puzzle/
  package.json
  tsconfig.json
  vite.config.ts
  src/
    index.ts
    events.ts
    errors.ts
    puzzle-definition.ts
    registry.ts
    algorithm.ts
    test-support/
      fixture-assertions.ts
      tnoodle-fixtures.ts
    cube/
      cube-move.ts
      cube-parser.ts
      cube-state.ts
      cube-normalize.ts
      cube-definition.ts
    clock/
      clock-parser.ts
      clock-state.ts
      clock-definition.ts
    megaminx/
      megaminx-parser.ts
      megaminx-state.ts
      megaminx-definition.ts
    pyraminx/
      pyraminx-parser.ts
      pyraminx-state.ts
      pyraminx-definition.ts
    skewb/
      skewb-parser.ts
      skewb-state.ts
      skewb-definition.ts
    square1/
      square1-parser.ts
      square1-state.ts
      square1-definition.ts

packages/scramble-core/
  package.json
  tsconfig.json
  vite.config.ts
  src/
    index.ts
    random-source.ts
    generator.ts
    batch.ts
    wca-distance.ts
    generators/
      cube-random-turns.ts
      clock.ts
      megaminx.ts
      multibld.ts
      pyraminx.ts
      skewb.ts
      square1.ts
      three-by-three.ts
      two-by-two.ts
      four-by-four.ts
    solvers/
      two-by-two-solver.ts
      pyraminx-solver.ts
      skewb-solver.ts
      min2phase/
        cubie-cube.ts
        coord-cube.ts
        search-wca.ts
        tools.ts
        util.ts
      threephase/
        center.ts
        edge.ts
        full-cube.ts
        search.ts
        tables.ts
      sq12phase/
        full-cube.ts
        search.ts
        shape.ts
        square.ts

packages/scramble-image/
  package.json
  tsconfig.json
  vite.config.ts
  src/
    index.ts
    color.ts
    render.ts
    svg/
      svg-document.ts
      svg-elements.ts
      svg-serialize.ts
    renderers/
      cube-net.ts
      clock.ts
      megaminx.ts
      pyraminx.ts
      skewb.ts
      square1.ts
```

Each implementation task below owns a narrow slice. If a subagent discovers that
one task still spans multiple independent concerns, split it before coding.

---

## Task 1: Scaffold The Three Packages

**Files:**

- Create: `packages/scramble-puzzle/package.json`
- Create: `packages/scramble-puzzle/tsconfig.json`
- Create: `packages/scramble-puzzle/vite.config.ts`
- Create: `packages/scramble-puzzle/src/index.ts`
- Create: `packages/scramble-core/package.json`
- Create: `packages/scramble-core/tsconfig.json`
- Create: `packages/scramble-core/vite.config.ts`
- Create: `packages/scramble-core/src/index.ts`
- Create: `packages/scramble-image/package.json`
- Create: `packages/scramble-image/tsconfig.json`
- Create: `packages/scramble-image/vite.config.ts`
- Create: `packages/scramble-image/src/index.ts`

- [ ] **Step 1: Write package manifests**

Use this manifest for `packages/scramble-puzzle/package.json`:

```json
{
  "name": "@cubekit/scramble-puzzle",
  "version": "0.0.0",
  "description": "Puzzle notation, state transitions, and shared WCA puzzle definitions for CubeKit.",
  "license": "GPL-3.0-only",
  "files": ["dist", "LICENSE", "NOTICE", "README.md"],
  "type": "module",
  "exports": {
    ".": "./dist/index.mjs",
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "vp pack",
    "dev": "vp pack --watch",
    "test": "vp test",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vite-plus": "catalog:",
    "vitest": "catalog:"
  }
}
```

Use this manifest for `packages/scramble-core/package.json`:

```json
{
  "name": "@cubekit/scramble-core",
  "version": "0.0.0",
  "description": "TNoodle-compatible WCA scramble generation for CubeKit.",
  "license": "GPL-3.0-only",
  "files": ["dist", "LICENSE", "NOTICE", "README.md"],
  "type": "module",
  "exports": {
    ".": "./dist/index.mjs",
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "vp pack",
    "dev": "vp pack --watch",
    "test": "vp test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cubekit/scramble-puzzle": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vite-plus": "catalog:",
    "vitest": "catalog:"
  }
}
```

Use this manifest for `packages/scramble-image/package.json`:

```json
{
  "name": "@cubekit/scramble-image",
  "version": "0.0.0",
  "description": "DOM-free SVG rendering for TNoodle-compatible scramble states.",
  "license": "GPL-3.0-only",
  "files": ["dist", "LICENSE", "NOTICE", "README.md"],
  "type": "module",
  "exports": {
    ".": "./dist/index.mjs",
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "vp pack",
    "dev": "vp pack --watch",
    "test": "vp test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cubekit/scramble-puzzle": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vite-plus": "catalog:",
    "vitest": "catalog:"
  }
}
```

- [ ] **Step 2: Write shared tsconfig files**

Use this `tsconfig.json` in all three package directories:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["es2023"],
    "moduleDetection": "force",
    "module": "preserve",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "types": ["node"],
    "strict": true,
    "noUnusedLocals": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write vite configs**

Use this `vite.config.ts` in all three package directories:

```ts
import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';

export default defineConfig({
  pack: definePackConfig({
    dts: {},
    exports: true,
  }),
});
```

- [ ] **Step 4: Add empty barrels**

Use this content for each new `src/index.ts`:

```ts
export {};
```

- [ ] **Step 5: Install workspace metadata**

Run:

```bash
pnpm install
```

Expected: command exits 0 and updates `pnpm-lock.yaml` only if pnpm needs to
record the workspace packages.

- [ ] **Step 6: Verify package discovery**

Run:

```bash
pnpm --filter @cubekit/scramble-puzzle typecheck
pnpm --filter @cubekit/scramble-core typecheck
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: all commands pass.

- [ ] **Step 7: Commit**

```bash
git add packages/scramble-puzzle packages/scramble-core packages/scramble-image pnpm-lock.yaml
git commit -m "feat(scramble): scaffold tnoodle packages"
```

---

## Task 2: Shared Events, Errors, Registry, And Fixtures

**Files:**

- Create: `packages/scramble-puzzle/src/events.ts`
- Create: `packages/scramble-puzzle/src/errors.ts`
- Create: `packages/scramble-puzzle/src/puzzle-definition.ts`
- Create: `packages/scramble-puzzle/src/algorithm.ts`
- Create: `packages/scramble-puzzle/src/registry.ts`
- Create: `packages/scramble-puzzle/src/test-support/tnoodle-fixtures.ts`
- Create: `packages/scramble-puzzle/src/test-support/fixture-assertions.ts`
- Create: `packages/scramble-puzzle/src/events.test.ts`
- Create: `packages/scramble-puzzle/src/registry.test.ts`
- Modify: `packages/scramble-puzzle/src/index.ts`

- [ ] **Step 1: Write failing event and registry tests**

`packages/scramble-puzzle/src/events.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { WCA_EVENT_IDS, WCA_EVENT_INFO } from './events.js';

describe('WCA event metadata', () => {
  it('contains exactly the 17 supported WCA events', () => {
    expect(WCA_EVENT_IDS).toEqual([
      '333',
      '222',
      '444',
      '555',
      '666',
      '777',
      '333bld',
      '333fm',
      '333oh',
      'clock',
      'minx',
      'pyram',
      'skewb',
      'sq1',
      '444bld',
      '555bld',
      '333mbld',
    ]);
  });

  it('maps every event to a puzzle id', () => {
    for (const eventId of WCA_EVENT_IDS) {
      expect(WCA_EVENT_INFO[eventId].puzzleId).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
```

`packages/scramble-puzzle/src/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createPuzzleRegistry } from './registry.js';

describe('createPuzzleRegistry', () => {
  it('throws a typed error for unknown events', () => {
    const registry = createPuzzleRegistry([]);
    expect(() => registry.getByEventId('333')).toThrow(
      "@cubekit/scramble-puzzle: event '333' is not registered",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/events.test.ts src/registry.test.ts
```

Expected: fail because modules are missing.

- [ ] **Step 3: Implement shared contracts**

`packages/scramble-puzzle/src/events.ts`:

```ts
export const WCA_EVENT_IDS = [
  '333',
  '222',
  '444',
  '555',
  '666',
  '777',
  '333bld',
  '333fm',
  '333oh',
  'clock',
  'minx',
  'pyram',
  'skewb',
  'sq1',
  '444bld',
  '555bld',
  '333mbld',
] as const;

export type WcaEventId = (typeof WCA_EVENT_IDS)[number];

export type PuzzleId = 'cube' | 'clock' | 'megaminx' | 'pyraminx' | 'skewb' | 'square1';

export interface WcaEventInfo {
  id: WcaEventId;
  label: string;
  puzzleId: PuzzleId;
}

export const WCA_EVENT_INFO = Object.freeze({
  '333': { id: '333', label: '3x3x3 Cube', puzzleId: 'cube' },
  '222': { id: '222', label: '2x2x2 Cube', puzzleId: 'cube' },
  '444': { id: '444', label: '4x4x4 Cube', puzzleId: 'cube' },
  '555': { id: '555', label: '5x5x5 Cube', puzzleId: 'cube' },
  '666': { id: '666', label: '6x6x6 Cube', puzzleId: 'cube' },
  '777': { id: '777', label: '7x7x7 Cube', puzzleId: 'cube' },
  '333bld': { id: '333bld', label: '3x3 Blindfolded', puzzleId: 'cube' },
  '333fm': { id: '333fm', label: '3x3 Fewest Moves', puzzleId: 'cube' },
  '333oh': { id: '333oh', label: '3x3 One-Handed', puzzleId: 'cube' },
  clock: { id: 'clock', label: 'Clock', puzzleId: 'clock' },
  minx: { id: 'minx', label: 'Megaminx', puzzleId: 'megaminx' },
  pyram: { id: 'pyram', label: 'Pyraminx', puzzleId: 'pyraminx' },
  skewb: { id: 'skewb', label: 'Skewb', puzzleId: 'skewb' },
  sq1: { id: 'sq1', label: 'Square-1', puzzleId: 'square1' },
  '444bld': { id: '444bld', label: '4x4 Blindfolded', puzzleId: 'cube' },
  '555bld': { id: '555bld', label: '5x5 Blindfolded', puzzleId: 'cube' },
  '333mbld': { id: '333mbld', label: '3x3 Multi-Blind', puzzleId: 'cube' },
} satisfies Record<WcaEventId, WcaEventInfo>);
```

`packages/scramble-puzzle/src/errors.ts`:

```ts
const ERROR_PREFIX = '@cubekit/scramble-puzzle';

export class ScramblePuzzleError extends Error {
  constructor(message: string) {
    super(`${ERROR_PREFIX}: ${message}`);
    this.name = 'ScramblePuzzleError';
  }
}

export class InvalidMoveError extends ScramblePuzzleError {
  constructor(move: string, puzzleId: string) {
    super(`move '${move}' is invalid for puzzle '${puzzleId}'`);
    this.name = 'InvalidMoveError';
  }
}

export class InvalidScrambleError extends ScramblePuzzleError {
  constructor(scramble: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(`scramble '${scramble}' is invalid: ${causeMessage}`);
    this.name = 'InvalidScrambleError';
  }
}

export class UnregisteredPuzzleError extends ScramblePuzzleError {
  constructor(eventId: string) {
    super(`event '${eventId}' is not registered`);
    this.name = 'UnregisteredPuzzleError';
  }
}
```

`packages/scramble-puzzle/src/puzzle-definition.ts`:

```ts
import type { WcaEventId } from './events.js';

export interface PuzzleDefinition<State, Move> {
  id: string;
  eventIds: readonly WcaEventId[];
  createSolvedState(): State;
  parseAlgorithm(algorithm: string): readonly Move[];
  applyMove(state: State, move: Move): State;
  applyAlgorithm(state: State, algorithm: string): State;
  isSolved(state: State): boolean;
  normalizeState?(state: State): State;
}

export interface AppliedPuzzleState<State> {
  puzzleId: string;
  state: State;
}
```

`packages/scramble-puzzle/src/algorithm.ts`:

```ts
import { InvalidScrambleError } from './errors.js';
import type { PuzzleDefinition } from './puzzle-definition.js';

export const splitAlgorithm = (algorithm: string): string[] => {
  const trimmed = algorithm.trim();
  return trimmed === '' ? [] : trimmed.split(/\s+/);
};

export const applyAlgorithm = <State, Move>(
  definition: PuzzleDefinition<State, Move>,
  state: State,
  algorithm: string,
): State => {
  try {
    return definition
      .parseAlgorithm(algorithm)
      .reduce((nextState, move) => definition.applyMove(nextState, move), state);
  } catch (err) {
    throw new InvalidScrambleError(algorithm, err);
  }
};
```

`packages/scramble-puzzle/src/registry.ts`:

```ts
import { UnregisteredPuzzleError } from './errors.js';
import type { WcaEventId } from './events.js';
import type { PuzzleDefinition } from './puzzle-definition.js';

export type AnyPuzzleDefinition = PuzzleDefinition<unknown, unknown>;

export interface PuzzleRegistry {
  getByEventId(eventId: WcaEventId): AnyPuzzleDefinition;
}

export const createPuzzleRegistry = (
  definitions: readonly AnyPuzzleDefinition[],
): PuzzleRegistry => {
  const byEventId = new Map<WcaEventId, AnyPuzzleDefinition>();

  for (const definition of definitions) {
    for (const eventId of definition.eventIds) byEventId.set(eventId, definition);
  }

  return {
    getByEventId(eventId) {
      const definition = byEventId.get(eventId);
      if (!definition) throw new UnregisteredPuzzleError(eventId);
      return definition;
    },
  };
};
```

`packages/scramble-puzzle/src/test-support/tnoodle-fixtures.ts`:

```ts
import type { WcaEventId } from '../events.js';

export interface TnoodleScrambleFixture {
  eventId: WcaEventId;
  scramble: string;
  note: string;
}

export const TNOODLE_SCRAMBLE_FIXTURES: readonly TnoodleScrambleFixture[] = [
  { eventId: '333', scramble: "R U R' U'", note: 'basic 3x3 notation' },
  {
    eventId: 'clock',
    scramble: 'UR3+ DR2- DL0+ UL5- U1+ R2+ D3- L4+ ALL5+ y2 U1- R2- D3+ L4- ALL5-',
    note: 'clock WCA grammar',
  },
  {
    eventId: 'minx',
    scramble: "R++ D-- R-- D++ R++ D++ R-- D-- R++ D-- U'",
    note: 'megaminx line grammar',
  },
  { eventId: 'sq1', scramble: '(3,-2) / (0,3) /', note: 'square-1 tuple and slash grammar' },
];
```

`packages/scramble-puzzle/src/test-support/fixture-assertions.ts`:

```ts
import type { PuzzleDefinition } from '../puzzle-definition.js';

export const expectScrambleApplies = <State, Move>(
  definition: PuzzleDefinition<State, Move>,
  scramble: string,
): State => {
  const state = definition
    .parseAlgorithm(scramble)
    .reduce(
      (nextState, move) => definition.applyMove(nextState, move),
      definition.createSolvedState(),
    );
  return state;
};
```

Update `packages/scramble-puzzle/src/index.ts`:

```ts
export { WCA_EVENT_IDS, WCA_EVENT_INFO } from './events.js';
export type { PuzzleId, WcaEventId, WcaEventInfo } from './events.js';
export { splitAlgorithm, applyAlgorithm } from './algorithm.js';
export { createPuzzleRegistry } from './registry.js';
export type { AnyPuzzleDefinition, PuzzleRegistry } from './registry.js';
export type { AppliedPuzzleState, PuzzleDefinition } from './puzzle-definition.js';
export {
  InvalidMoveError,
  InvalidScrambleError,
  ScramblePuzzleError,
  UnregisteredPuzzleError,
} from './errors.js';
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/events.test.ts src/registry.test.ts
pnpm --filter @cubekit/scramble-puzzle typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-puzzle/src
git commit -m "feat(scramble-puzzle): add shared contracts"
```

---

## Task 3: Cube Parser

**Files:**

- Create: `packages/scramble-puzzle/src/cube/cube-move.ts`
- Create: `packages/scramble-puzzle/src/cube/cube-parser.ts`
- Create: `packages/scramble-puzzle/src/cube/cube-parser.test.ts`
- Modify: `packages/scramble-puzzle/src/index.ts`

- [ ] **Step 1: Write failing parser tests**

`packages/scramble-puzzle/src/cube/cube-parser.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseCubeAlgorithm } from './cube-parser.js';

describe('parseCubeAlgorithm', () => {
  it('parses face, wide, prefixed wide, and rotations', () => {
    expect(parseCubeAlgorithm("R U2 R' Rw 3Fw2 x y' z")).toEqual([
      { face: 'R', amount: 1, width: 1, isRotation: false },
      { face: 'U', amount: 2, width: 1, isRotation: false },
      { face: 'R', amount: 3, width: 1, isRotation: false },
      { face: 'R', amount: 1, width: 2, isRotation: false },
      { face: 'F', amount: 2, width: 3, isRotation: false },
      { face: 'R', amount: 1, width: Number.POSITIVE_INFINITY, isRotation: true },
      { face: 'U', amount: 3, width: Number.POSITIVE_INFINITY, isRotation: true },
      { face: 'F', amount: 1, width: Number.POSITIVE_INFINITY, isRotation: true },
    ]);
  });

  it('rejects malformed cube moves', () => {
    expect(() => parseCubeAlgorithm('R4')).toThrow("move 'R4' is invalid for puzzle 'cube'");
    expect(() => parseCubeAlgorithm('Q')).toThrow("move 'Q' is invalid for puzzle 'cube'");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/cube/cube-parser.test.ts
```

Expected: fail because `cube-parser.ts` does not exist.

- [ ] **Step 3: Implement parser**

`packages/scramble-puzzle/src/cube/cube-move.ts`:

```ts
export type CubeFace = 'R' | 'U' | 'F' | 'L' | 'D' | 'B';

export interface CubeMove {
  face: CubeFace;
  amount: 1 | 2 | 3;
  width: number;
  isRotation: boolean;
}
```

`packages/scramble-puzzle/src/cube/cube-parser.ts`:

```ts
import { splitAlgorithm } from '../algorithm.js';
import { InvalidMoveError } from '../errors.js';
import type { CubeFace, CubeMove } from './cube-move.js';

const ROTATION_FACE_BY_TOKEN = {
  x: 'R',
  y: 'U',
  z: 'F',
} as const satisfies Record<string, CubeFace>;

const CUBE_MOVE_PATTERN = /^(?:(\d+)?([RUFLDB])w|([RUFLDB])|([xyz]))(2|')?$/;

const parseAmount = (suffix: string | undefined): 1 | 2 | 3 => {
  if (suffix === '2') return 2;
  if (suffix === "'") return 3;
  return 1;
};

export const parseCubeMove = (token: string): CubeMove => {
  const match = token.match(CUBE_MOVE_PATTERN);
  if (!match) throw new InvalidMoveError(token, 'cube');

  const [, prefixWidth, wideFace, face, rotation, suffix] = match;
  const isRotation = rotation !== undefined;

  if (isRotation) {
    return {
      face: ROTATION_FACE_BY_TOKEN[rotation],
      amount: parseAmount(suffix),
      width: Number.POSITIVE_INFINITY,
      isRotation: true,
    };
  }

  return {
    face: (wideFace ?? face) as CubeFace,
    amount: parseAmount(suffix),
    width: wideFace ? Number(prefixWidth ?? 2) : 1,
    isRotation: false,
  };
};

export const parseCubeAlgorithm = (algorithm: string): readonly CubeMove[] =>
  splitAlgorithm(algorithm).map(parseCubeMove);
```

Update `packages/scramble-puzzle/src/index.ts`:

```ts
export type { CubeFace, CubeMove } from './cube/cube-move.js';
export { parseCubeAlgorithm, parseCubeMove } from './cube/cube-parser.js';
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/cube/cube-parser.test.ts
pnpm --filter @cubekit/scramble-puzzle typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-puzzle/src
git commit -m "feat(scramble-puzzle): parse cube moves"
```

---

## Task 4: Cube State, Normalization, And Definition

**Files:**

- Create: `packages/scramble-puzzle/src/cube/cube-state.ts`
- Create: `packages/scramble-puzzle/src/cube/cube-normalize.ts`
- Create: `packages/scramble-puzzle/src/cube/cube-definition.ts`
- Create: `packages/scramble-puzzle/src/cube/cube-state.test.ts`
- Modify: `packages/scramble-puzzle/src/index.ts`

- [ ] **Step 1: Write failing state tests**

`packages/scramble-puzzle/src/cube/cube-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from './cube-definition.js';

describe('cube state transitions', () => {
  it('creates solved states for NxN cubes', () => {
    const cube = createCubeDefinition(3, ['333']);
    const state = cube.createSolvedState();
    expect(cube.isSolved(state)).toBe(true);
  });

  it('R followed by R prime returns to solved', () => {
    const cube = createCubeDefinition(3, ['333']);
    const state = cube.applyMove(
      cube.applyMove(cube.createSolvedState(), cube.parseAlgorithm('R')[0]),
      cube.parseAlgorithm("R'")[0],
    );
    expect(cube.isSolved(state)).toBe(true);
  });

  it('wide moves change a 4x4 state and inverse back to solved', () => {
    const cube = createCubeDefinition(4, ['444']);
    const moved = cube
      .parseAlgorithm("Rw U Rw' U'")
      .reduce((state, move) => cube.applyMove(state, move), cube.createSolvedState());
    expect(cube.isSolved(moved)).toBe(false);
    const restored = cube
      .parseAlgorithm("U Rw U' Rw'")
      .reduce((state, move) => cube.applyMove(state, move), moved);
    expect(cube.isSolved(restored)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/cube/cube-state.test.ts
```

Expected: fail because cube state modules are missing.

- [ ] **Step 3: Implement cube state**

Implement `CubeState` as immutable face sticker arrays with face order
`R, U, F, L, D, B`, matching TNoodle's `CubePuzzle.Face` order. Port the slice
logic from `thewca/tnoodle-lib v0.19.2` `CubePuzzle.slice` into
`packages/scramble-puzzle/src/cube/cube-state.ts`.

Public exports must have these signatures:

```ts
import type { CubeFace, CubeMove } from './cube-move.js';

export type CubeFacelet = CubeFace;
export type CubeFaceState = readonly CubeFacelet[][];
export type CubeImage = readonly CubeFaceState[];

export interface CubeState {
  size: number;
  image: CubeImage;
}

export const createSolvedCubeState: (size: number) => CubeState;
export const applyCubeMove: (state: CubeState, move: CubeMove) => CubeState;
export const areCubeStatesEqual: (a: CubeState, b: CubeState) => boolean;
```

Implement `packages/scramble-puzzle/src/cube/cube-definition.ts`:

```ts
import { applyAlgorithm } from '../algorithm.js';
import type { WcaEventId } from '../events.js';
import type { PuzzleDefinition } from '../puzzle-definition.js';
import { parseCubeAlgorithm } from './cube-parser.js';
import {
  applyCubeMove,
  areCubeStatesEqual,
  createSolvedCubeState,
  type CubeState,
} from './cube-state.js';
import type { CubeMove } from './cube-move.js';

export const createCubeDefinition = (
  size: number,
  eventIds: readonly WcaEventId[],
): PuzzleDefinition<CubeState, CubeMove> => {
  const definition: PuzzleDefinition<CubeState, CubeMove> = {
    id: `cube-${size}`,
    eventIds,
    createSolvedState: () => createSolvedCubeState(size),
    parseAlgorithm: parseCubeAlgorithm,
    applyMove: applyCubeMove,
    applyAlgorithm: (state, algorithm) => applyAlgorithm(definition, state, algorithm),
    isSolved: (state) => areCubeStatesEqual(state, createSolvedCubeState(size)),
  };

  return definition;
};
```

Update `packages/scramble-puzzle/src/index.ts`:

```ts
export { createCubeDefinition } from './cube/cube-definition.js';
export { applyCubeMove, areCubeStatesEqual, createSolvedCubeState } from './cube/cube-state.js';
export type { CubeFacelet, CubeFaceState, CubeImage, CubeState } from './cube/cube-state.js';
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/cube/cube-state.test.ts
pnpm --filter @cubekit/scramble-puzzle typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-puzzle/src/cube packages/scramble-puzzle/src/index.ts
git commit -m "feat(scramble-puzzle): add cube state transitions"
```

---

## Task 5: DOM-Free SVG Builder

**Files:**

- Create: `packages/scramble-image/src/svg/svg-elements.ts`
- Create: `packages/scramble-image/src/svg/svg-document.ts`
- Create: `packages/scramble-image/src/svg/svg-serialize.ts`
- Create: `packages/scramble-image/src/color.ts`
- Create: `packages/scramble-image/src/svg/svg.test.ts`
- Modify: `packages/scramble-image/src/index.ts`

- [ ] **Step 1: Write failing SVG tests**

`packages/scramble-image/src/svg/svg.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createSvgDocument } from './svg-document.js';
import { rect } from './svg-elements.js';

describe('SVG serialization', () => {
  it('serializes width, height, viewBox, and escaped attributes', () => {
    const svg = createSvgDocument(20, 10, [
      rect({ x: 0, y: 0, width: 10, height: 10, fill: '#fff', stroke: '#000' }),
    ]);
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="20"');
    expect(svg).toContain('height="10"');
    expect(svg).toContain('viewBox="0 0 20 10"');
    expect(svg).toContain('<rect');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm --filter @cubekit/scramble-image test -- src/svg/svg.test.ts
```

Expected: fail because SVG modules are missing.

- [ ] **Step 3: Implement SVG builder**

`packages/scramble-image/src/svg/svg-elements.ts`:

```ts
export interface SvgNode {
  name: string;
  attrs: Record<string, string | number>;
  children?: readonly SvgNode[];
}

export const rect = (attrs: Record<string, string | number>): SvgNode => ({ name: 'rect', attrs });
export const circle = (attrs: Record<string, string | number>): SvgNode => ({
  name: 'circle',
  attrs,
});
export const path = (attrs: Record<string, string | number>): SvgNode => ({ name: 'path', attrs });
export const text = (attrs: Record<string, string | number>, value: string): SvgNode => ({
  name: 'text',
  attrs: { ...attrs, 'data-text': value },
});
export const group = (
  attrs: Record<string, string | number>,
  children: readonly SvgNode[],
): SvgNode => ({
  name: 'g',
  attrs,
  children,
});
```

`packages/scramble-image/src/svg/svg-serialize.ts`:

```ts
import type { SvgNode } from './svg-elements.js';

const escapeAttr = (value: string | number): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

export const serializeSvgNode = (node: SvgNode): string => {
  const textValue = node.attrs['data-text'];
  const attrs = Object.entries(node.attrs)
    .filter(([key]) => key !== 'data-text')
    .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
    .join('');
  const children = node.children?.map(serializeSvgNode).join('') ?? '';
  const text = textValue === undefined ? '' : escapeAttr(textValue);
  return `<${node.name}${attrs}>${children}${text}</${node.name}>`;
};
```

`packages/scramble-image/src/svg/svg-document.ts`:

```ts
import { serializeSvgNode } from './svg-serialize.js';
import type { SvgNode } from './svg-elements.js';

export const createSvgDocument = (
  width: number,
  height: number,
  children: readonly SvgNode[],
): string => {
  const body = children.map(serializeSvgNode).join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
};
```

`packages/scramble-image/src/color.ts`:

```ts
export type HexColor = `#${string}`;

export const DEFAULT_CUBE_COLORS = Object.freeze({
  R: '#ff0000',
  U: '#ffffff',
  F: '#00ff00',
  L: '#ff8000',
  D: '#ffff00',
  B: '#0000ff',
} satisfies Record<string, HexColor>);
```

Update `packages/scramble-image/src/index.ts`:

```ts
export type { HexColor } from './color.js';
export { DEFAULT_CUBE_COLORS } from './color.js';
export { createSvgDocument } from './svg/svg-document.js';
export { circle, group, path, rect, text } from './svg/svg-elements.js';
export type { SvgNode } from './svg/svg-elements.js';
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @cubekit/scramble-image test -- src/svg/svg.test.ts
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-image/src
git commit -m "feat(scramble-image): add svg builder"
```

---

## Task 6: Cube Net Renderer

**Files:**

- Create: `packages/scramble-image/src/renderers/cube-net.ts`
- Create: `packages/scramble-image/src/renderers/cube-net.test.ts`
- Create: `packages/scramble-image/src/render.ts`
- Modify: `packages/scramble-image/src/index.ts`

- [ ] **Step 1: Write failing renderer tests**

`packages/scramble-image/src/renderers/cube-net.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from '@cubekit/scramble-puzzle';
import { renderCubeNet } from './cube-net.js';

describe('renderCubeNet', () => {
  it('renders a solved 3x3 cube net with 54 stickers', () => {
    const cube = createCubeDefinition(3, ['333']);
    const svg = renderCubeNet(cube.createSolvedState());
    expect(svg).toContain('viewBox="0 0 130 98"');
    expect(svg.match(/<rect/g)?.length).toBe(54);
  });

  it('renders a scrambled state', () => {
    const cube = createCubeDefinition(3, ['333']);
    const state = cube
      .parseAlgorithm('R U')
      .reduce((next, move) => cube.applyMove(next, move), cube.createSolvedState());
    expect(renderCubeNet(state)).toContain('<svg');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm --filter @cubekit/scramble-image test -- src/renderers/cube-net.test.ts
```

Expected: fail because renderer is missing.

- [ ] **Step 3: Implement cube net renderer**

`packages/scramble-image/src/renderers/cube-net.ts`:

```ts
import type { CubeFacelet, CubeState } from '@cubekit/scramble-puzzle';
import { DEFAULT_CUBE_COLORS, type HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { rect, type SvgNode } from '../svg/svg-elements.js';

const GAP = 2;
const STICKER = 10;

const FACE_ORIGINS = {
  L: [GAP, 2 * GAP + STICKER],
  D: [2 * GAP + STICKER, 3 * GAP + 2 * STICKER],
  B: [4 * GAP + 3 * STICKER, 2 * GAP + STICKER],
  R: [3 * GAP + 2 * STICKER, 2 * GAP + STICKER],
  U: [2 * GAP + STICKER, GAP],
  F: [2 * GAP + STICKER, 2 * GAP + STICKER],
} as const;

export type CubeColorScheme = Partial<Record<CubeFacelet, HexColor>>;

export const renderCubeNet = (state: CubeState, colorScheme: CubeColorScheme = {}): string => {
  const colors = { ...DEFAULT_CUBE_COLORS, ...colorScheme };
  const unit = state.size * STICKER;
  const width = (unit + GAP) * 4 + GAP;
  const height = (unit + GAP) * 3 + GAP;
  const nodes: SvgNode[] = [];

  for (const [face, [originX, originY]] of Object.entries(FACE_ORIGINS)) {
    const faceIndex = ['R', 'U', 'F', 'L', 'D', 'B'].indexOf(face);
    const stickers = state.image[faceIndex];
    for (let row = 0; row < state.size; row += 1) {
      for (let col = 0; col < state.size; col += 1) {
        nodes.push(
          rect({
            x: originX + col * STICKER,
            y: originY + row * STICKER,
            width: STICKER,
            height: STICKER,
            fill: colors[stickers[row][col]],
            stroke: '#000000',
          }),
        );
      }
    }
  }

  return createSvgDocument(width, height, nodes);
};
```

`packages/scramble-image/src/render.ts`:

```ts
import { createCubeDefinition, type WcaEventId } from '@cubekit/scramble-puzzle';
import { renderCubeNet } from './renderers/cube-net.js';

const CUBE_SIZE_BY_EVENT = {
  '222': 2,
  '333': 3,
  '333bld': 3,
  '333fm': 3,
  '333oh': 3,
  '333mbld': 3,
  '444': 4,
  '444bld': 4,
  '555': 5,
  '555bld': 5,
  '666': 6,
  '777': 7,
} as Partial<Record<WcaEventId, number>>;

export const renderScrambleImage = (eventId: WcaEventId, scramble: string): string => {
  const size = CUBE_SIZE_BY_EVENT[eventId];
  if (!size) throw new Error(`@cubekit/scramble-image: event '${eventId}' is not renderable yet`);
  const cube = createCubeDefinition(size, [eventId]);
  const state = cube
    .parseAlgorithm(scramble)
    .reduce((next, move) => cube.applyMove(next, move), cube.createSolvedState());
  return renderCubeNet(state);
};
```

Update `packages/scramble-image/src/index.ts`:

```ts
export { renderScrambleImage } from './render.js';
export { renderCubeNet } from './renderers/cube-net.js';
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @cubekit/scramble-image test -- src/renderers/cube-net.test.ts
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-image/src packages/scramble-image/package.json
git commit -m "feat(scramble-image): render cube nets"
```

---

## Task 7: Random Source And Core Facade Skeleton

**Files:**

- Create: `packages/scramble-core/src/random-source.ts`
- Create: `packages/scramble-core/src/generator.ts`
- Create: `packages/scramble-core/src/batch.ts`
- Create: `packages/scramble-core/src/generator.test.ts`
- Modify: `packages/scramble-core/src/index.ts`

- [ ] **Step 1: Write failing facade tests**

`packages/scramble-core/src/generator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createScrambleGenerator } from './generator.js';
import type { RandomSource } from './random-source.js';

const deterministicRandom: RandomSource = {
  nextInt(maxExclusive) {
    return Math.max(0, maxExclusive - 1);
  },
};

describe('createScrambleGenerator', () => {
  it('throws for generators that are not registered', async () => {
    const generator = createScrambleGenerator({ random: deterministicRandom, generators: {} });
    await expect(generator.generate('333')).rejects.toThrow(
      "@cubekit/scramble-core: event '333' has no generator",
    );
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generator.test.ts
```

Expected: fail because core facade modules are missing.

- [ ] **Step 3: Implement facade**

`packages/scramble-core/src/random-source.ts`:

```ts
export interface RandomSource {
  nextInt(maxExclusive: number): number;
}

export const createMathRandomSource = (): RandomSource => ({
  nextInt(maxExclusive) {
    return Math.floor(Math.random() * maxExclusive);
  },
});
```

`packages/scramble-core/src/generator.ts`:

```ts
import type { WcaEventId } from '@cubekit/scramble-puzzle';
import type { RandomSource } from './random-source.js';

const ERROR_PREFIX = '@cubekit/scramble-core';

export interface GenerateOptions {
  random?: RandomSource;
  multiBlindCubeCount?: number;
}

export interface ScrambleResult {
  eventId: WcaEventId;
  scramble: string;
}

export type EventScrambleGenerator = (
  options: GenerateOptions & { random: RandomSource },
) => ScrambleResult;

export interface ScrambleGeneratorOptions {
  random: RandomSource;
  generators: Partial<Record<WcaEventId, EventScrambleGenerator>>;
}

export interface ScrambleGenerator {
  generate(eventId: WcaEventId, options?: GenerateOptions): Promise<ScrambleResult>;
  generateBatch(
    eventId: WcaEventId,
    count: number,
    options?: GenerateOptions,
  ): Promise<readonly ScrambleResult[]>;
}

export const createScrambleGenerator = ({
  random,
  generators,
}: ScrambleGeneratorOptions): ScrambleGenerator => {
  const api: ScrambleGenerator = {
    async generate(eventId, options = {}) {
      const generator = generators[eventId];
      if (!generator) throw new Error(`${ERROR_PREFIX}: event '${eventId}' has no generator`);
      return generator({ ...options, random: options.random ?? random });
    },
    async generateBatch(eventId, count, options = {}) {
      const results: ScrambleResult[] = [];
      const seen = new Set<string>();
      while (results.length < count) {
        const result = await api.generate(eventId, options);
        if (seen.has(result.scramble)) continue;
        seen.add(result.scramble);
        results.push(result);
      }
      return results;
    },
  };

  return api;
};
```

Update `packages/scramble-core/src/index.ts`:

```ts
export { createScrambleGenerator } from './generator.js';
export type {
  EventScrambleGenerator,
  GenerateOptions,
  ScrambleGenerator,
  ScrambleGeneratorOptions,
  ScrambleResult,
} from './generator.js';
export { createMathRandomSource } from './random-source.js';
export type { RandomSource } from './random-source.js';
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generator.test.ts
pnpm --filter @cubekit/scramble-core typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-core/src
git commit -m "feat(scramble-core): add generator facade"
```

---

## Task 8: Cube Random-Turn Generators For 5x5, 6x6, And 7x7

**Files:**

- Create: `packages/scramble-core/src/generators/cube-random-turns.ts`
- Create: `packages/scramble-core/src/generators/cube-random-turns.test.ts`
- Modify: `packages/scramble-core/src/index.ts`

- [ ] **Step 1: Write failing random-turn tests**

`packages/scramble-core/src/generators/cube-random-turns.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseCubeAlgorithm } from '@cubekit/scramble-puzzle';
import { generateCubeRandomTurnScramble } from './cube-random-turns.js';
import type { RandomSource } from '../random-source.js';

const cyclingRandom = (): RandomSource => {
  let value = 0;
  return {
    nextInt(maxExclusive) {
      const next = value % maxExclusive;
      value += 1;
      return next;
    },
  };
};

describe('generateCubeRandomTurnScramble', () => {
  it('generates TNoodle-length random-turn scrambles', () => {
    expect(
      generateCubeRandomTurnScramble({ size: 5, length: 60, random: cyclingRandom() }).split(/\s+/),
    ).toHaveLength(60);
    expect(
      generateCubeRandomTurnScramble({ size: 6, length: 80, random: cyclingRandom() }).split(/\s+/),
    ).toHaveLength(80);
    expect(
      generateCubeRandomTurnScramble({ size: 7, length: 100, random: cyclingRandom() }).split(
        /\s+/,
      ),
    ).toHaveLength(100);
  });

  it('produces parseable cube moves', () => {
    const scramble = generateCubeRandomTurnScramble({
      size: 7,
      length: 100,
      random: cyclingRandom(),
    });
    expect(parseCubeAlgorithm(scramble)).toHaveLength(100);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generators/cube-random-turns.test.ts
```

Expected: fail because generator is missing.

- [ ] **Step 3: Implement random-turn generator**

`packages/scramble-core/src/generators/cube-random-turns.ts`:

```ts
import type { RandomSource } from '../random-source.js';

const FACES = ['R', 'U', 'F', 'L', 'D', 'B'] as const;
const SUFFIXES = ['', '2', "'"] as const;

export interface CubeRandomTurnOptions {
  size: number;
  length: number;
  random: RandomSource;
}

const chooseWidthPrefix = (size: number, random: RandomSource): string => {
  const maxWidth = Math.floor(size / 2);
  const width = random.nextInt(maxWidth) + 1;
  if (width === 1) return '';
  if (width === 2) return 'w';
  return `${width}w`;
};

export const generateCubeRandomTurnScramble = ({
  size,
  length,
  random,
}: CubeRandomTurnOptions): string => {
  const moves: string[] = [];
  let previousAxis = -1;

  while (moves.length < length) {
    const faceIndex = random.nextInt(FACES.length);
    const axis = faceIndex % 3;
    if (axis === previousAxis) continue;
    previousAxis = axis;

    const face = FACES[faceIndex];
    const widthPrefix = chooseWidthPrefix(size, random);
    const suffix = SUFFIXES[random.nextInt(SUFFIXES.length)];
    moves.push(`${face}${widthPrefix}${suffix}`);
  }

  return moves.join(' ');
};
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generators/cube-random-turns.test.ts
pnpm --filter @cubekit/scramble-core typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-core/src/generators packages/scramble-core/src/index.ts
git commit -m "feat(scramble-core): add big cube random turns"
```

---

## Task 9: Clock Parser, State, Generator, And Renderer

**Files:**

- Create: `packages/scramble-puzzle/src/clock/clock-parser.ts`
- Create: `packages/scramble-puzzle/src/clock/clock-state.ts`
- Create: `packages/scramble-puzzle/src/clock/clock-definition.ts`
- Create: `packages/scramble-puzzle/src/clock/clock.test.ts`
- Create: `packages/scramble-core/src/generators/clock.ts`
- Create: `packages/scramble-core/src/generators/clock.test.ts`
- Create: `packages/scramble-image/src/renderers/clock.ts`
- Create: `packages/scramble-image/src/renderers/clock.test.ts`

- [ ] **Step 1: Write tests**

Clock tests must cover:

```ts
expect(
  parseClockAlgorithm('UR3+ DR2- DL0+ UL5- U1+ R2+ D3- L4+ ALL5+ y2 U1- R2- D3+ L4- ALL5-'),
).toHaveLength(15);
expect(generateClockScramble({ random })).toMatch(/^UR\d[+-] DR\d[+-] DL\d[+-] UL\d[+-]/);
expect(renderClockState(createSolvedClockState())).toContain('<svg');
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/clock/clock.test.ts
pnpm --filter @cubekit/scramble-core test -- src/generators/clock.test.ts
pnpm --filter @cubekit/scramble-image test -- src/renderers/clock.test.ts
```

Expected: fail because Clock modules are missing.

- [ ] **Step 3: Implement Clock modules**

Port TNoodle `ClockPuzzle` move grammar, dial update arrays, and rendering
geometry into the listed files. Keep parser/state in `scramble-puzzle`,
generation in `scramble-core`, and SVG in `scramble-image`. The public exports
must include:

```ts
export const parseClockAlgorithm: (algorithm: string) => readonly ClockMove[];
export const createSolvedClockState: () => ClockState;
export const applyClockMove: (state: ClockState, move: ClockMove) => ClockState;
export const generateClockScramble: (options: { random: RandomSource }) => string;
export const renderClockState: (state: ClockState) => string;
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/clock/clock.test.ts
pnpm --filter @cubekit/scramble-core test -- src/generators/clock.test.ts
pnpm --filter @cubekit/scramble-image test -- src/renderers/clock.test.ts
pnpm --filter @cubekit/scramble-puzzle typecheck
pnpm --filter @cubekit/scramble-core typecheck
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-puzzle/src/clock packages/scramble-core/src/generators/clock* packages/scramble-image/src/renderers/clock*
git commit -m "feat(scramble): add clock support"
```

---

## Task 10: Megaminx Parser, State, Generator, And Renderer

**Files:**

- Create: `packages/scramble-puzzle/src/megaminx/megaminx-parser.ts`
- Create: `packages/scramble-puzzle/src/megaminx/megaminx-state.ts`
- Create: `packages/scramble-puzzle/src/megaminx/megaminx-definition.ts`
- Create: `packages/scramble-puzzle/src/megaminx/megaminx.test.ts`
- Create: `packages/scramble-core/src/generators/megaminx.ts`
- Create: `packages/scramble-core/src/generators/megaminx.test.ts`
- Create: `packages/scramble-image/src/renderers/megaminx.ts`
- Create: `packages/scramble-image/src/renderers/megaminx.test.ts`

- [ ] **Step 1: Write tests**

Megaminx tests must cover:

```ts
expect(parseMegaminxAlgorithm("R++ D-- R-- D++ U'")).toHaveLength(5);
expect(generateMegaminxScramble({ random }).split('\n')).toHaveLength(7);
expect(generateMegaminxScramble({ random }).split(/\s+/)).toHaveLength(77);
expect(renderMegaminxState(createSolvedMegaminxState())).toContain('<svg');
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/megaminx/megaminx.test.ts
pnpm --filter @cubekit/scramble-core test -- src/generators/megaminx.test.ts
pnpm --filter @cubekit/scramble-image test -- src/renderers/megaminx.test.ts
```

Expected: fail because Megaminx modules are missing.

- [ ] **Step 3: Implement Megaminx modules**

Port TNoodle `MegaminxPuzzle` move grammar, state transitions, fixed 7-by-10
scramble generation, and unfolded SVG geometry. Preserve the newline shape of
TNoodle Megaminx scrambles.

Public exports must include:

```ts
export const parseMegaminxAlgorithm: (algorithm: string) => readonly MegaminxMove[];
export const createSolvedMegaminxState: () => MegaminxState;
export const applyMegaminxMove: (state: MegaminxState, move: MegaminxMove) => MegaminxState;
export const generateMegaminxScramble: (options: { random: RandomSource }) => string;
export const renderMegaminxState: (state: MegaminxState) => string;
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/megaminx/megaminx.test.ts
pnpm --filter @cubekit/scramble-core test -- src/generators/megaminx.test.ts
pnpm --filter @cubekit/scramble-image test -- src/renderers/megaminx.test.ts
pnpm --filter @cubekit/scramble-puzzle typecheck
pnpm --filter @cubekit/scramble-core typecheck
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-puzzle/src/megaminx packages/scramble-core/src/generators/megaminx* packages/scramble-image/src/renderers/megaminx*
git commit -m "feat(scramble): add megaminx support"
```

---

## Task 11: 2x2 Solver And Generator

**Files:**

- Create: `packages/scramble-core/src/solvers/two-by-two-solver.ts`
- Create: `packages/scramble-core/src/generators/two-by-two.ts`
- Create: `packages/scramble-core/src/generators/two-by-two.test.ts`

- [ ] **Step 1: Write failing 2x2 tests**

`packages/scramble-core/src/generators/two-by-two.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from '@cubekit/scramble-puzzle';
import { generateTwoByTwoScramble } from './two-by-two.js';
import type { RandomSource } from '../random-source.js';

const zeroRandom: RandomSource = { nextInt: () => 0 };

describe('generateTwoByTwoScramble', () => {
  it('generates an exact 11-move parseable scramble', () => {
    const scramble = generateTwoByTwoScramble({ random: zeroRandom });
    expect(scramble.split(/\s+/)).toHaveLength(11);
    const cube = createCubeDefinition(2, ['222']);
    expect(() => cube.parseAlgorithm(scramble)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generators/two-by-two.test.ts
```

Expected: fail because 2x2 modules are missing.

- [ ] **Step 3: Implement 2x2 solver**

Port TNoodle `TwoByTwoSolver` into `two-by-two-solver.ts`. Keep table
initialization module-local and deterministic. Public exports:

```ts
export interface TwoByTwoState {
  permutation: number;
  orientation: number;
}

export class TwoByTwoSolver {
  randomState(random: RandomSource): TwoByTwoState;
  solveIn(state: TwoByTwoState, maxLength: number): string | null;
  generateExactly(state: TwoByTwoState, length: number): string;
}
```

`packages/scramble-core/src/generators/two-by-two.ts`:

```ts
import type { RandomSource } from '../random-source.js';
import { TwoByTwoSolver } from '../solvers/two-by-two-solver.js';

const SCRAMBLE_LENGTH = 11;

export const generateTwoByTwoScramble = ({ random }: { random: RandomSource }): string => {
  const solver = new TwoByTwoSolver();
  return solver.generateExactly(solver.randomState(random), SCRAMBLE_LENGTH);
};
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generators/two-by-two.test.ts
pnpm --filter @cubekit/scramble-core typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-core/src/solvers/two-by-two-solver.ts packages/scramble-core/src/generators/two-by-two*
git commit -m "feat(scramble-core): add 2x2 generator"
```

---

## Task 12: Pyraminx Parser, State, Solver, Generator, And Renderer

**Files:**

- Create: `packages/scramble-puzzle/src/pyraminx/pyraminx-parser.ts`
- Create: `packages/scramble-puzzle/src/pyraminx/pyraminx-state.ts`
- Create: `packages/scramble-puzzle/src/pyraminx/pyraminx-definition.ts`
- Create: `packages/scramble-puzzle/src/pyraminx/pyraminx.test.ts`
- Create: `packages/scramble-core/src/solvers/pyraminx-solver.ts`
- Create: `packages/scramble-core/src/generators/pyraminx.ts`
- Create: `packages/scramble-core/src/generators/pyraminx.test.ts`
- Create: `packages/scramble-image/src/renderers/pyraminx.ts`
- Create: `packages/scramble-image/src/renderers/pyraminx.test.ts`

- [ ] **Step 1: Write tests**

Tests must cover:

```ts
expect(parsePyraminxAlgorithm("U L R B u' l' r' b'")).toHaveLength(8);
expect(generatePyraminxScramble({ random }).split(/\s+/).length).toBeGreaterThanOrEqual(11);
expect(renderPyraminxState(createSolvedPyraminxState())).toContain('<svg');
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/pyraminx/pyraminx.test.ts
pnpm --filter @cubekit/scramble-core test -- src/generators/pyraminx.test.ts
pnpm --filter @cubekit/scramble-image test -- src/renderers/pyraminx.test.ts
```

Expected: fail because Pyraminx modules are missing.

- [ ] **Step 3: Implement Pyraminx modules**

Port TNoodle `PyraminxPuzzle` state transitions and `PyraminxSolver` pruning
solver. Preserve tip handling and minimum-distance behavior. Public exports:

```ts
export const parsePyraminxAlgorithm: (algorithm: string) => readonly PyraminxMove[];
export const createSolvedPyraminxState: () => PyraminxState;
export const applyPyraminxMove: (state: PyraminxState, move: PyraminxMove) => PyraminxState;
export const generatePyraminxScramble: (options: { random: RandomSource }) => string;
export const renderPyraminxState: (state: PyraminxState) => string;
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/pyraminx/pyraminx.test.ts
pnpm --filter @cubekit/scramble-core test -- src/generators/pyraminx.test.ts
pnpm --filter @cubekit/scramble-image test -- src/renderers/pyraminx.test.ts
pnpm --filter @cubekit/scramble-puzzle typecheck
pnpm --filter @cubekit/scramble-core typecheck
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-puzzle/src/pyraminx packages/scramble-core/src/solvers/pyraminx-solver.ts packages/scramble-core/src/generators/pyraminx* packages/scramble-image/src/renderers/pyraminx*
git commit -m "feat(scramble): add pyraminx support"
```

---

## Task 13: Skewb Parser, State, Solver, Generator, And Renderer

**Files:**

- Create: `packages/scramble-puzzle/src/skewb/skewb-parser.ts`
- Create: `packages/scramble-puzzle/src/skewb/skewb-state.ts`
- Create: `packages/scramble-puzzle/src/skewb/skewb-definition.ts`
- Create: `packages/scramble-puzzle/src/skewb/skewb.test.ts`
- Create: `packages/scramble-core/src/solvers/skewb-solver.ts`
- Create: `packages/scramble-core/src/generators/skewb.ts`
- Create: `packages/scramble-core/src/generators/skewb.test.ts`
- Create: `packages/scramble-image/src/renderers/skewb.ts`
- Create: `packages/scramble-image/src/renderers/skewb.test.ts`

- [ ] **Step 1: Write tests**

Tests must cover:

```ts
expect(parseSkewbAlgorithm("R U L B R' U'")).toHaveLength(6);
expect(generateSkewbScramble({ random }).split(/\s+/)).toHaveLength(11);
expect(renderSkewbState(createSolvedSkewbState())).toContain('<svg');
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/skewb/skewb.test.ts
pnpm --filter @cubekit/scramble-core test -- src/generators/skewb.test.ts
pnpm --filter @cubekit/scramble-image test -- src/renderers/skewb.test.ts
```

Expected: fail because Skewb modules are missing.

- [ ] **Step 3: Implement Skewb modules**

Port TNoodle `SkewbPuzzle` state transitions and `SkewbSolver`. Public exports:

```ts
export const parseSkewbAlgorithm: (algorithm: string) => readonly SkewbMove[];
export const createSolvedSkewbState: () => SkewbState;
export const applySkewbMove: (state: SkewbState, move: SkewbMove) => SkewbState;
export const generateSkewbScramble: (options: { random: RandomSource }) => string;
export const renderSkewbState: (state: SkewbState) => string;
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/skewb/skewb.test.ts
pnpm --filter @cubekit/scramble-core test -- src/generators/skewb.test.ts
pnpm --filter @cubekit/scramble-image test -- src/renderers/skewb.test.ts
pnpm --filter @cubekit/scramble-puzzle typecheck
pnpm --filter @cubekit/scramble-core typecheck
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-puzzle/src/skewb packages/scramble-core/src/solvers/skewb-solver.ts packages/scramble-core/src/generators/skewb* packages/scramble-image/src/renderers/skewb*
git commit -m "feat(scramble): add skewb support"
```

---

## Task 14: Square-1 Parser And State

**Files:**

- Create: `packages/scramble-puzzle/src/square1/square1-parser.ts`
- Create: `packages/scramble-puzzle/src/square1/square1-state.ts`
- Create: `packages/scramble-puzzle/src/square1/square1-definition.ts`
- Create: `packages/scramble-puzzle/src/square1/square1.test.ts`

- [ ] **Step 1: Write failing Square-1 state tests**

`packages/scramble-puzzle/src/square1/square1.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createSquareOneDefinition } from './square1-definition.js';
import { parseSquareOneAlgorithm } from './square1-parser.js';

describe('Square-1 parser and state', () => {
  it('parses tuple turns and slash moves', () => {
    expect(parseSquareOneAlgorithm('(3,-2) / (0,3) /')).toHaveLength(4);
  });

  it('applies a valid scramble to the solved state', () => {
    const sq1 = createSquareOneDefinition();
    const state = sq1
      .parseAlgorithm('(3,-2) /')
      .reduce((next, move) => sq1.applyMove(next, move), sq1.createSolvedState());
    expect(sq1.isSolved(state)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/square1/square1.test.ts
```

Expected: fail because Square-1 modules are missing.

- [ ] **Step 3: Implement Square-1 parser and state**

Port TNoodle `SquareOnePuzzle.SquareOneState` tuple parsing, slashability checks,
move costs, and state transitions into `scramble-puzzle`. Public exports:

```ts
export const parseSquareOneAlgorithm: (algorithm: string) => readonly SquareOneMove[];
export const createSolvedSquareOneState: () => SquareOneState;
export const applySquareOneMove: (state: SquareOneState, move: SquareOneMove) => SquareOneState;
export const createSquareOneDefinition: () => PuzzleDefinition<SquareOneState, SquareOneMove>;
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @cubekit/scramble-puzzle test -- src/square1/square1.test.ts
pnpm --filter @cubekit/scramble-puzzle typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-puzzle/src/square1
git commit -m "feat(scramble-puzzle): add square-1 state"
```

---

## Task 15: Square-1 Solver, Generator, And Renderer

**Files:**

- Create: `packages/scramble-core/src/solvers/sq12phase/full-cube.ts`
- Create: `packages/scramble-core/src/solvers/sq12phase/search.ts`
- Create: `packages/scramble-core/src/solvers/sq12phase/shape.ts`
- Create: `packages/scramble-core/src/solvers/sq12phase/square.ts`
- Create: `packages/scramble-core/src/generators/square1.ts`
- Create: `packages/scramble-core/src/generators/square1.test.ts`
- Create: `packages/scramble-image/src/renderers/square1.ts`
- Create: `packages/scramble-image/src/renderers/square1.test.ts`

- [ ] **Step 1: Write tests**

Tests must cover:

```ts
expect(generateSquareOneScramble({ random })).toContain('/');
expect(() =>
  createSquareOneDefinition().parseAlgorithm(generateSquareOneScramble({ random })),
).not.toThrow();
expect(renderSquareOneState(createSolvedSquareOneState())).toContain('<svg');
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generators/square1.test.ts
pnpm --filter @cubekit/scramble-image test -- src/renderers/square1.test.ts
```

Expected: fail because solver and renderer modules are missing.

- [ ] **Step 3: Implement Square-1 solver and renderer**

Port TNoodle `sq12phase` and `SquareOnePuzzle` rendering geometry. Keep
slashability-aware solving behavior: unslashable states first choose the
minimum-invasive slashability setup move, then solve with cancellation-aware
canonicalization.

Public exports:

```ts
export const generateSquareOneScramble: (options: { random: RandomSource }) => string;
export const renderSquareOneState: (state: SquareOneState) => string;
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generators/square1.test.ts
pnpm --filter @cubekit/scramble-image test -- src/renderers/square1.test.ts
pnpm --filter @cubekit/scramble-core typecheck
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-core/src/solvers/sq12phase packages/scramble-core/src/generators/square1* packages/scramble-image/src/renderers/square1*
git commit -m "feat(scramble): add square-1 support"
```

---

## Task 16: 3x3 Min2phase Solver And Event Variants

**Files:**

- Create: `packages/scramble-core/src/solvers/min2phase/cubie-cube.ts`
- Create: `packages/scramble-core/src/solvers/min2phase/coord-cube.ts`
- Create: `packages/scramble-core/src/solvers/min2phase/search-wca.ts`
- Create: `packages/scramble-core/src/solvers/min2phase/tools.ts`
- Create: `packages/scramble-core/src/solvers/min2phase/util.ts`
- Create: `packages/scramble-core/src/generators/three-by-three.ts`
- Create: `packages/scramble-core/src/generators/multibld.ts`
- Create: `packages/scramble-core/src/generators/three-by-three.test.ts`

- [ ] **Step 1: Write tests**

Tests must cover:

```ts
expect(generateThreeByThreeScramble({ random }).split(/\s+/).length).toBeLessThanOrEqual(21);
expect(generateThreeByThreeNoInspectionScramble({ random })).toMatch(/[xyz]|Rw|Fw|Uw/);
expect(generateThreeByThreeFewestMovesScramble({ random }).startsWith("R' U' F ")).toBe(true);
expect(generateMultiBlindScramble({ random, cubeCount: 3 }).split('\n')).toHaveLength(3);
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generators/three-by-three.test.ts
```

Expected: fail because min2phase modules are missing.

- [ ] **Step 3: Implement min2phase and 3x3 variants**

Port TNoodle `min2phase` and `SearchWCA` behavior. Preserve first-axis and
last-axis restrictions for no-inspection and FMC generation.

Public exports:

```ts
export const generateThreeByThreeScramble: (options: { random: RandomSource }) => string;
export const generateThreeByThreeNoInspectionScramble: (options: {
  random: RandomSource;
}) => string;
export const generateThreeByThreeFewestMovesScramble: (options: { random: RandomSource }) => string;
export const generateMultiBlindScramble: (options: {
  random: RandomSource;
  cubeCount: number;
}) => string;
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generators/three-by-three.test.ts
pnpm --filter @cubekit/scramble-core typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-core/src/solvers/min2phase packages/scramble-core/src/generators/three-by-three* packages/scramble-core/src/generators/multibld*
git commit -m "feat(scramble-core): add 3x3 generators"
```

---

## Task 17: 4x4 Threephase Solver And No-Inspection Variant

**Files:**

- Create: `packages/scramble-core/src/solvers/threephase/center.ts`
- Create: `packages/scramble-core/src/solvers/threephase/edge.ts`
- Create: `packages/scramble-core/src/solvers/threephase/full-cube.ts`
- Create: `packages/scramble-core/src/solvers/threephase/search.ts`
- Create: `packages/scramble-core/src/solvers/threephase/tables.ts`
- Create: `packages/scramble-core/src/generators/four-by-four.ts`
- Create: `packages/scramble-core/src/generators/four-by-four.test.ts`

- [ ] **Step 1: Write tests**

Tests must cover:

```ts
expect(generateFourByFourScramble({ random }).split(/\s+/).length).toBeGreaterThan(30);
expect(() =>
  createCubeDefinition(4, ['444']).parseAlgorithm(generateFourByFourScramble({ random })),
).not.toThrow();
expect(() =>
  createCubeDefinition(4, ['444bld']).parseAlgorithm(
    generateFourByFourNoInspectionScramble({ random }),
  ),
).not.toThrow();
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generators/four-by-four.test.ts
```

Expected: fail because threephase modules are missing.

- [ ] **Step 3: Implement threephase solver**

Port TNoodle `threephase` solver into focused TS modules. Keep table
initialization lazy and module-local so importing `@cubekit/scramble-core` does
not eagerly build all 4x4 tables.

Public exports:

```ts
export const generateFourByFourScramble: (options: { random: RandomSource }) => string;
export const generateFourByFourNoInspectionScramble: (options: { random: RandomSource }) => string;
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @cubekit/scramble-core test -- src/generators/four-by-four.test.ts
pnpm --filter @cubekit/scramble-core typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-core/src/solvers/threephase packages/scramble-core/src/generators/four-by-four*
git commit -m "feat(scramble-core): add 4x4 generators"
```

---

## Task 18: Core Event Integration

**Files:**

- Modify: `packages/scramble-core/src/generator.ts`
- Modify: `packages/scramble-core/src/index.ts`
- Create: `packages/scramble-core/src/integration.test.ts`

- [ ] **Step 1: Write failing integration tests**

`packages/scramble-core/src/integration.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { WCA_EVENT_IDS } from '@cubekit/scramble-puzzle';
import { createDefaultScrambleGenerator } from './generator.js';
import type { RandomSource } from './random-source.js';

const cyclingRandom = (): RandomSource => {
  let n = 0;
  return {
    nextInt(maxExclusive) {
      const value = n % maxExclusive;
      n += 1;
      return value;
    },
  };
};

describe('default scramble generator', () => {
  it('generates a non-empty scramble for every WCA event', async () => {
    const generator = createDefaultScrambleGenerator({ random: cyclingRandom() });
    for (const eventId of WCA_EVENT_IDS) {
      const result = await generator.generate(
        eventId,
        eventId === '333mbld' ? { multiBlindCubeCount: 3 } : undefined,
      );
      expect(result.eventId).toBe(eventId);
      expect(result.scramble.trim().length).toBeGreaterThan(0);
    }
  });

  it('generates unique batch strings', async () => {
    const generator = createDefaultScrambleGenerator({ random: cyclingRandom() });
    const batch = await generator.generateBatch('555', 5);
    expect(new Set(batch.map((item) => item.scramble)).size).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm --filter @cubekit/scramble-core test -- src/integration.test.ts
```

Expected: fail because `createDefaultScrambleGenerator` is missing.

- [ ] **Step 3: Wire default generator map**

Add `createDefaultScrambleGenerator` to `packages/scramble-core/src/generator.ts`
with all 17 events wired to the generator modules from previous tasks.
`333mbld` must require `multiBlindCubeCount`; throw:

```text
@cubekit/scramble-core: event '333mbld' requires multiBlindCubeCount
```

Export it from `packages/scramble-core/src/index.ts`.

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @cubekit/scramble-core test -- src/integration.test.ts
pnpm --filter @cubekit/scramble-core typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-core/src
git commit -m "feat(scramble-core): wire default wca generators"
```

---

## Task 19: Image Event Integration

**Files:**

- Modify: `packages/scramble-image/src/render.ts`
- Modify: `packages/scramble-image/src/index.ts`
- Create: `packages/scramble-image/src/integration.test.ts`

- [ ] **Step 1: Write failing image integration tests**

`packages/scramble-image/src/integration.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { WCA_EVENT_IDS } from '@cubekit/scramble-puzzle';
import { renderScrambleImage } from './render.js';

const SAMPLE_SCRAMBLES = {
  '333': 'R U',
  '222': 'R U',
  '444': 'Rw U',
  '555': 'Rw U',
  '666': 'Rw U',
  '777': 'Rw U',
  '333bld': 'R U x',
  '333fm': "R' U' F R U F'",
  '333oh': 'R U',
  clock: 'UR3+ DR2- DL0+ UL5- U1+ R2+ D3- L4+ ALL5+ y2 U1- R2- D3+ L4- ALL5-',
  minx: "R++ D-- R-- D++ R++ D++ R-- D-- R++ D-- U'",
  pyram: "U L R B u' l' r' b'",
  skewb: "R U L B R' U'",
  sq1: '(3,-2) / (0,3) /',
  '444bld': 'Rw U x',
  '555bld': 'Rw U x',
  '333mbld': 'R U',
} as const;

describe('renderScrambleImage', () => {
  it('renders an SVG for every WCA event', () => {
    for (const eventId of WCA_EVENT_IDS) {
      const svg = renderScrambleImage(eventId, SAMPLE_SCRAMBLES[eventId]);
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox=');
    }
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm --filter @cubekit/scramble-image test -- src/integration.test.ts
```

Expected: fail until all renderers are wired into `renderScrambleImage`.

- [ ] **Step 3: Wire render dispatch**

Update `renderScrambleImage` to dispatch by event family:

- cube events -> cube net renderer
- `clock` -> Clock renderer
- `minx` -> Megaminx renderer
- `pyram` -> Pyraminx renderer
- `skewb` -> Skewb renderer
- `sq1` -> Square-1 renderer

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @cubekit/scramble-image test -- src/integration.test.ts
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scramble-image/src
git commit -m "feat(scramble-image): wire wca renderers"
```

---

## Task 20: Cross-Package Verification And Documentation Update

**Files:**

- Create: `docs/tnoodle-implementation-notes.md`
- Modify: `docs/project-structure.md`
- Modify: `docs/scramble-runtime.md`
- Modify: `docs/dependency-licensing.md`
- Modify: `AGENTS.md` if new docs need routing

- [ ] **Step 1: Run full package tests**

```bash
pnpm --filter @cubekit/scramble-puzzle test
pnpm --filter @cubekit/scramble-core test
pnpm --filter @cubekit/scramble-image test
pnpm --filter @cubekit/scramble-puzzle typecheck
pnpm --filter @cubekit/scramble-core typecheck
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: all pass.

- [ ] **Step 2: Run repo verification**

```bash
pnpm test
pnpm check
```

Expected: pass, or report pre-existing unrelated `pnpm check` failures exactly
with file names and messages.

- [ ] **Step 3: Write implementation notes**

`docs/tnoodle-implementation-notes.md` should record:

```markdown
# TNoodle Implementation Notes

## Implemented Packages

- `packages/scramble-puzzle`
- `packages/scramble-core`
- `packages/scramble-image`

## Baseline

See `docs/tnoodle-baseline.md`.

## Verification

- `pnpm --filter @cubekit/scramble-puzzle test`
- `pnpm --filter @cubekit/scramble-core test`
- `pnpm --filter @cubekit/scramble-image test`
- `pnpm test`

## Runtime Boundary

Apps still import `@cubekit/scramble`. The new packages are not app-wired in this implementation.
```

- [ ] **Step 4: Update knowledge docs**

Update `docs/project-structure.md` and `docs/scramble-runtime.md` so future
agents know the new packages exist but are not yet app-integrated. Update
`docs/dependency-licensing.md` only if new source copying changes license notes.

- [ ] **Step 5: Run docs guard**

```bash
pnpm test:docs
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add docs AGENTS.md
git commit -m "docs: document tnoodle package implementation"
```

---

## Self-Review Checklist

- Spec coverage:
  - Three-package split is covered by Tasks 1, 2, 7, 18, 19, and 20.
  - Puzzle parser/state ownership is covered by Tasks 3, 4, 9, 10, 12, 13, and 14.
  - Core generation and solver ownership is covered by Tasks 7 through 18.
  - SVG rendering is covered by Tasks 5, 6, 9, 10, 12, 13, 15, and 19.
  - TNoodle baseline and upgrade path are covered by required context and Task 20 docs.
  - Fine-grained subagent slices are represented by the task list.
- Type consistency:
  - `WcaEventId`, `RandomSource`, `ScrambleResult`, and `PuzzleDefinition` are introduced before use.
  - `scramble-image` imports only `scramble-puzzle`, never `scramble-core`.
  - `scramble-core` imports `scramble-puzzle`, never `scramble-image`.
- Verification:
  - Every task has a targeted test command and a commit point.
  - Final verification runs package tests, root tests, and docs guard.
