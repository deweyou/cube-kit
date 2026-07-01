# Cubegin Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first `@cubegin/player` release: a Three.js cube-family formula player package with a playground `Player` tab.

**Architecture:** Add a new package with framework-independent core/controller modules, a Three.js view layer, cube-family adapters that reuse `@cubegin/scramble-puzzle`, and a React wrapper exported from `@cubegin/player/react`. The playground consumes only the React wrapper and keeps `@cubegin/scramble-image` unchanged.

**Tech Stack:** TypeScript, React 19, Three.js, vite-plus pack/test, Vitest, jsdom tests, existing Cubegin pnpm workspace.

---

## File Structure

- Create `packages/player/package.json` for the new private workspace package, exports, scripts, and dependency declarations.
- Create `packages/player/tsconfig.json` and `packages/player/vite.config.ts` using package patterns from `packages/icons`.
- Create `packages/player/AGENTS.md`, `README.md`, `LICENSE`, and `NOTICE` to document boundaries and licensing.
- Create `packages/player/src/events/event-map.ts` for `EventId` to cube-size mapping.
- Create `packages/player/src/core/errors.ts`, `timeline.ts`, `types.ts`, and `player-controller.ts` for framework-independent behavior.
- Create `packages/player/src/puzzles/cube/cube-move-map.ts` for cube move to animation-layer mapping.
- Create `packages/player/src/three/three-player-view.ts` for the disposable Three.js view boundary.
- Create `packages/player/src/react/player.tsx` and `packages/player/src/react/index.ts` for the React wrapper.
- Modify `packages/player/src/index.ts` to export the imperative API and typed errors.
- Modify `apps/playground/package.json`, `apps/playground/vite.config.ts`, `apps/playground/src/app.tsx`, and `apps/playground/src/styles.css` to add the Player tab.
- Modify `docs/apps/playground/index.md` and `AGENTS.md` only if implementation changes task routing or durable package ownership beyond this spec.

---

### Task 1: Scaffold `@cubegin/player` And Event Mapping

**Files:**
- Create: `packages/player/package.json`
- Create: `packages/player/tsconfig.json`
- Create: `packages/player/vite.config.ts`
- Create: `packages/player/AGENTS.md`
- Create: `packages/player/README.md`
- Create: `packages/player/LICENSE`
- Create: `packages/player/NOTICE`
- Create: `packages/player/src/index.ts`
- Create: `packages/player/src/events/event-map.ts`
- Test: `packages/player/src/events/event-map.test.ts`

- [ ] **Step 1: Write the failing event mapping test**

```ts
import { describe, expect, it } from 'vitest';
import { getPlayerPuzzleSupport } from './event-map.js';

describe('getPlayerPuzzleSupport', () => {
  it('maps cube-family events to cube sizes', () => {
    expect(getPlayerPuzzleSupport('222')).toEqual({ type: 'cube', size: 2 });
    expect(getPlayerPuzzleSupport('333')).toEqual({ type: 'cube', size: 3 });
    expect(getPlayerPuzzleSupport('333oh')).toEqual({ type: 'cube', size: 3 });
    expect(getPlayerPuzzleSupport('333fm')).toEqual({ type: 'cube', size: 3 });
    expect(getPlayerPuzzleSupport('333bld')).toEqual({ type: 'cube', size: 3 });
    expect(getPlayerPuzzleSupport('333mbld')).toEqual({ type: 'cube', size: 3 });
    expect(getPlayerPuzzleSupport('444')).toEqual({ type: 'cube', size: 4 });
    expect(getPlayerPuzzleSupport('444bld')).toEqual({ type: 'cube', size: 4 });
    expect(getPlayerPuzzleSupport('555')).toEqual({ type: 'cube', size: 5 });
    expect(getPlayerPuzzleSupport('555bld')).toEqual({ type: 'cube', size: 5 });
    expect(getPlayerPuzzleSupport('666')).toEqual({ type: 'cube', size: 6 });
    expect(getPlayerPuzzleSupport('777')).toEqual({ type: 'cube', size: 7 });
  });

  it('reports first-release non-cube events as unsupported', () => {
    expect(getPlayerPuzzleSupport('clock')).toEqual({ type: 'unsupported' });
    expect(getPlayerPuzzleSupport('minx')).toEqual({ type: 'unsupported' });
    expect(getPlayerPuzzleSupport('pyram')).toEqual({ type: 'unsupported' });
    expect(getPlayerPuzzleSupport('skewb')).toEqual({ type: 'unsupported' });
    expect(getPlayerPuzzleSupport('sq1')).toEqual({ type: 'unsupported' });
    expect(getPlayerPuzzleSupport('fto')).toEqual({ type: 'unsupported' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @cubegin/player test -- src/events/event-map.test.ts`

Expected: command fails because `@cubegin/player` or `event-map.ts` does not exist yet.

- [ ] **Step 3: Add package scaffold and minimal mapping implementation**

Create `packages/player/package.json`:

```json
{
  "name": "@cubegin/player",
  "version": "0.0.0",
  "description": "Three.js formula player for Cubegin puzzle events.",
  "license": "GPL-3.0-only",
  "files": ["dist", "LICENSE", "NOTICE", "README.md"],
  "type": "module",
  "exports": {
    ".": "./dist/index.mjs",
    "./react": "./dist/react/index.mjs",
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "vp pack",
    "dev": "vp pack --watch",
    "test": "vp test",
    "test:coverage": "vp test --coverage",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cubegin/scramble-puzzle": "workspace:*",
    "@cubegin/shared": "workspace:*",
    "three": "^0.185.0"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@vitest/coverage-v8": "catalog:",
    "react": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vite-plus": "catalog:",
    "vitest": "catalog:"
  },
  "peerDependencies": {
    "react": "18 || 19"
  },
  "cubegin": {
    "publicSubpath": "player",
    "publicJsExports": ["./react"]
  }
}
```

Create `packages/player/src/events/event-map.ts`:

```ts
import type { EventId } from '@cubegin/shared/events';

export interface CubePlayerPuzzleSupport {
  readonly type: 'cube';
  readonly size: 2 | 3 | 4 | 5 | 6 | 7;
}

export interface UnsupportedPlayerPuzzleSupport {
  readonly type: 'unsupported';
}

export type PlayerPuzzleSupport = CubePlayerPuzzleSupport | UnsupportedPlayerPuzzleSupport;

const CUBE_SIZE_BY_EVENT = {
  '222': 2,
  '333': 3,
  '333bld': 3,
  '333fm': 3,
  '333mbld': 3,
  '333oh': 3,
  '444': 4,
  '444bld': 4,
  '555': 5,
  '555bld': 5,
  '666': 6,
  '777': 7,
} as const satisfies Partial<Record<EventId, CubePlayerPuzzleSupport['size']>>;

export const getPlayerPuzzleSupport = (eventId: EventId): PlayerPuzzleSupport => {
  const size = CUBE_SIZE_BY_EVENT[eventId];

  return size ? { type: 'cube', size } : { type: 'unsupported' };
};
```

- [ ] **Step 4: Run the event mapping test**

Run: `pnpm --filter @cubegin/player test -- src/events/event-map.test.ts`

Expected: PASS.

---

### Task 2: Timeline And Typed Errors

**Files:**
- Create: `packages/player/src/core/errors.ts`
- Create: `packages/player/src/core/timeline.ts`
- Create: `packages/player/src/core/types.ts`
- Modify: `packages/player/src/index.ts`
- Test: `packages/player/src/core/timeline.test.ts`
- Test: `packages/player/src/core/errors.test.ts`

- [ ] **Step 1: Write failing timeline tests**

```ts
import { describe, expect, it } from 'vitest';
import { createPlayerTimeline, getTimelinePosition } from './timeline.js';

describe('createPlayerTimeline', () => {
  it('creates one timeline step per parsed move', () => {
    const timeline = createPlayerTimeline([
      { face: 'R', amount: 1, width: 1, isRotation: false },
      { face: 'U', amount: 2, width: 1, isRotation: false },
      { face: 'F', amount: 3, width: 1, isRotation: false },
    ]);

    expect(timeline.steps).toHaveLength(3);
    expect(timeline.steps.map((step) => step.quarterTurns)).toEqual([1, 2, 3]);
    expect(timeline.totalDurationMs).toBeGreaterThan(0);
  });

  it('maps normalized progress to deterministic step positions', () => {
    const timeline = createPlayerTimeline([
      { face: 'R', amount: 1, width: 1, isRotation: false },
      { face: 'U', amount: 1, width: 1, isRotation: false },
    ]);

    expect(getTimelinePosition(timeline, 0)).toEqual({
      completedStepCount: 0,
      activeStepIndex: 0,
      activeStepProgress: 0,
    });
    expect(getTimelinePosition(timeline, 1)).toEqual({
      completedStepCount: 2,
      activeStepIndex: undefined,
      activeStepProgress: 1,
    });
  });
});
```

- [ ] **Step 2: Run the timeline test to verify it fails**

Run: `pnpm --filter @cubegin/player test -- src/core/timeline.test.ts`

Expected: FAIL because `timeline.ts` does not exist.

- [ ] **Step 3: Implement the minimal timeline**

```ts
import type { CubeMove } from '@cubegin/scramble-puzzle';

const BASE_QUARTER_TURN_DURATION_MS = 260;

export interface PlayerTimelineStep {
  readonly move: CubeMove;
  readonly index: number;
  readonly quarterTurns: 1 | 2 | 3;
  readonly durationMs: number;
}

export interface PlayerTimeline {
  readonly steps: readonly PlayerTimelineStep[];
  readonly totalDurationMs: number;
}

export interface PlayerTimelinePosition {
  readonly completedStepCount: number;
  readonly activeStepIndex: number | undefined;
  readonly activeStepProgress: number;
}

export const createPlayerTimeline = (moves: readonly CubeMove[]): PlayerTimeline => {
  const steps = moves.map((move, index): PlayerTimelineStep => {
    const quarterTurns = move.amount;

    return {
      move,
      index,
      quarterTurns,
      durationMs: BASE_QUARTER_TURN_DURATION_MS * (quarterTurns === 2 ? 1.45 : 1),
    };
  });

  return {
    steps,
    totalDurationMs: steps.reduce((duration, step) => duration + step.durationMs, 0),
  };
};

export const getTimelinePosition = (
  timeline: PlayerTimeline,
  progress: number,
): PlayerTimelinePosition => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  if (timeline.steps.length === 0 || clampedProgress === 1) {
    return {
      completedStepCount: timeline.steps.length,
      activeStepIndex: undefined,
      activeStepProgress: 1,
    };
  }

  const targetMs = timeline.totalDurationMs * clampedProgress;
  let elapsedMs = 0;

  for (const step of timeline.steps) {
    const nextElapsedMs = elapsedMs + step.durationMs;
    if (targetMs <= nextElapsedMs) {
      return {
        completedStepCount: step.index,
        activeStepIndex: step.index,
        activeStepProgress: step.durationMs === 0 ? 1 : (targetMs - elapsedMs) / step.durationMs,
      };
    }
    elapsedMs = nextElapsedMs;
  }

  return {
    completedStepCount: timeline.steps.length,
    activeStepIndex: undefined,
    activeStepProgress: 1,
  };
};
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @cubegin/player test -- src/core/timeline.test.ts`

Expected: PASS.

---

### Task 3: Cube Move Animation Mapping

**Files:**
- Create: `packages/player/src/puzzles/cube/cube-move-map.ts`
- Test: `packages/player/src/puzzles/cube/cube-move-map.test.ts`

- [ ] **Step 1: Write failing cube move mapping tests**

```ts
import { describe, expect, it } from 'vitest';
import { mapCubeMoveToAnimation } from './cube-move-map.js';

describe('mapCubeMoveToAnimation', () => {
  it('maps face turns to axes, layers, and signed radians', () => {
    expect(
      mapCubeMoveToAnimation({ face: 'R', amount: 1, width: 1, isRotation: false }, 3),
    ).toMatchObject({ axis: 'x', layers: [2], angleRadians: -Math.PI / 2 });
    expect(
      mapCubeMoveToAnimation({ face: 'R', amount: 3, width: 1, isRotation: false }, 3),
    ).toMatchObject({ axis: 'x', layers: [2], angleRadians: Math.PI / 2 });
    expect(
      mapCubeMoveToAnimation({ face: 'U', amount: 2, width: 1, isRotation: false }, 3),
    ).toMatchObject({ axis: 'y', layers: [2], angleRadians: Math.PI });
  });

  it('maps wide moves and cube rotations to multiple layers', () => {
    expect(
      mapCubeMoveToAnimation({ face: 'R', amount: 1, width: 2, isRotation: false }, 4),
    ).toMatchObject({ axis: 'x', layers: [2, 3] });
    expect(
      mapCubeMoveToAnimation({
        face: 'R',
        amount: 1,
        width: Number.POSITIVE_INFINITY,
        isRotation: true,
      }, 4),
    ).toMatchObject({ axis: 'x', layers: [0, 1, 2, 3] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @cubegin/player test -- src/puzzles/cube/cube-move-map.test.ts`

Expected: FAIL because `cube-move-map.ts` does not exist.

- [ ] **Step 3: Implement minimal cube move mapping**

```ts
import type { CubeFace, CubeMove } from '@cubegin/scramble-puzzle';

export type PlayerAxis = 'x' | 'y' | 'z';

export interface CubeMoveAnimation {
  readonly axis: PlayerAxis;
  readonly layers: readonly number[];
  readonly angleRadians: number;
}

const axisForFace = (face: CubeFace): PlayerAxis => {
  if (face === 'R' || face === 'L') return 'x';
  if (face === 'U' || face === 'D') return 'y';
  return 'z';
};

const isPositiveFace = (face: CubeFace): boolean => face === 'L' || face === 'U' || face === 'F';

const outerLayerForFace = (face: CubeFace, size: number): number =>
  face === 'R' || face === 'U' || face === 'F' ? size - 1 : 0;

const layersForMove = (move: CubeMove, size: number): readonly number[] => {
  if (move.isRotation) {
    return Array.from({ length: size }, (_value, index) => index);
  }

  const outerLayer = outerLayerForFace(move.face, size);
  const direction = outerLayer === 0 ? 1 : -1;

  return Array.from({ length: move.width }, (_value, offset) => outerLayer + direction * offset)
    .filter((layer) => layer >= 0 && layer < size)
    .sort((a, b) => a - b);
};

export const mapCubeMoveToAnimation = (move: CubeMove, size: number): CubeMoveAnimation => {
  const direction = isPositiveFace(move.face) ? 1 : -1;
  const turns = move.amount === 3 ? -1 : move.amount;

  return {
    axis: axisForFace(move.face),
    layers: layersForMove(move, size),
    angleRadians: direction * turns * (Math.PI / 2),
  };
};
```

- [ ] **Step 4: Run the cube move mapping test**

Run: `pnpm --filter @cubegin/player test -- src/puzzles/cube/cube-move-map.test.ts`

Expected: PASS.

---

### Task 4: Player Controller With Mockable View

**Files:**
- Create: `packages/player/src/core/player-controller.ts`
- Modify: `packages/player/src/core/types.ts`
- Modify: `packages/player/src/index.ts`
- Test: `packages/player/src/core/player-controller.test.ts`

- [ ] **Step 1: Write failing controller tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createPlayerController } from './player-controller.js';

describe('createPlayerController', () => {
  it('parses cube algorithms and sends timelines to the view', () => {
    const view = {
      renderSolvedCube: vi.fn(),
      setTimeline: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      dispose: vi.fn(),
    };

    const controller = createPlayerController(view, {
      eventId: '333',
      algorithm: "R U R'",
      initialPosition: 'start',
    });

    expect(view.renderSolvedCube).toHaveBeenCalledWith(3);
    expect(view.setTimeline).toHaveBeenCalledWith(
      expect.objectContaining({ steps: expect.arrayContaining([expect.any(Object)]) }),
    );

    controller.jumpToEnd();
    expect(view.seek).toHaveBeenCalledWith(1);
  });

  it('exposes unsupported event errors without throwing', () => {
    const view = {
      renderSolvedCube: vi.fn(),
      setTimeline: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      dispose: vi.fn(),
    };

    const controller = createPlayerController(view, {
      eventId: 'clock',
      algorithm: 'UR1+',
      initialPosition: 'start',
    });

    expect(controller.getState().status).toBe('error');
    expect(controller.getState().error?.name).toBe('UnsupportedPlayerEventError');
    expect(view.renderSolvedCube).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the controller test to verify it fails**

Run: `pnpm --filter @cubegin/player test -- src/core/player-controller.test.ts`

Expected: FAIL because controller module does not exist.

- [ ] **Step 3: Implement controller and typed errors**

Implement `UnsupportedPlayerEventError`, `InvalidPlayerAlgorithmError`, and the
controller with a view interface. The controller should catch parser errors from
`createCubeDefinition(size, [eventId]).parseAlgorithm(algorithm)`, convert them
to `InvalidPlayerAlgorithmError`, and leave the previous successful view state
intact.

- [ ] **Step 4: Run controller tests**

Run: `pnpm --filter @cubegin/player test -- src/core/player-controller.test.ts`

Expected: PASS.

---

### Task 5: Three View Static Cube Render

**Files:**
- Create: `packages/player/src/three/three-player-view.ts`
- Create: `packages/player/src/three/materials.ts`
- Create: `packages/player/src/three/camera-controls.ts`
- Test: `packages/player/src/three/three-player-view.test.ts`

- [ ] **Step 1: Write disposal and DOM mounting tests**

Use jsdom-safe tests that mock WebGL renderer construction where needed. The
test should prove that the view appends one canvas-like element, renders a cube
size request, and removes DOM/event resources on dispose.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @cubegin/player test -- src/three/three-player-view.test.ts`

Expected: FAIL because the Three view module does not exist.

- [ ] **Step 3: Implement a disposable Three view**

Implement `createThreePlayerView(container)` with methods matching the
controller view interface:

```ts
renderSolvedCube(size: 2 | 3 | 4 | 5 | 6 | 7): void;
setTimeline(timeline: PlayerTimeline): void;
play(): void;
pause(): void;
seek(progress: number): void;
dispose(): void;
```

Start with solved cube rendering and no animated turns. Animation behavior is
completed in the next task.

- [ ] **Step 4: Run the Three view test**

Run: `pnpm --filter @cubegin/player test -- src/three/three-player-view.test.ts`

Expected: PASS.

---

### Task 6: React Wrapper And Playground Player Tab

**Files:**
- Create: `packages/player/src/react/player.tsx`
- Create: `packages/player/src/react/index.ts`
- Modify: `packages/player/vite.config.ts`
- Modify: `apps/playground/package.json`
- Modify: `apps/playground/vite.config.ts`
- Modify: `apps/playground/src/app.tsx`
- Modify: `apps/playground/src/styles.css`
- Test: `packages/player/src/react/player.test.tsx`
- Test: `apps/playground/src/app.test.tsx`

- [ ] **Step 1: Write failing React wrapper tests**

The wrapper test should mock the imperative player factory and assert that:

- the player is created when the component mounts,
- `setEvent` and `setAlgorithm` are called when props change,
- `dispose` is called once on unmount.

- [ ] **Step 2: Run wrapper tests to verify they fail**

Run: `pnpm --filter @cubegin/player test -- src/react/player.test.tsx`

Expected: FAIL because the React wrapper does not exist.

- [ ] **Step 3: Implement wrapper and package React export**

Add `src/react/player.tsx` with a `CubeginPlayer` component and export it from
`src/react/index.ts`. Configure the pack entry for both root and `react/index`.

- [ ] **Step 4: Add playground Player tab test**

Add an app test that clicks `Player`, edits the formula textarea, clicks
`Load formula`, and expects the player panel to render. Mock `@cubegin/player/react`
in the test to avoid requiring real WebGL in jsdom.

- [ ] **Step 5: Implement the Player tab**

Add `Player` to the tab list. The tab should expose event selection, formula
textarea, `Load formula`, play/pause/reset/jump end controls, scrubber, player
panel, and error state text.

- [ ] **Step 6: Run playground tests**

Run: `pnpm --filter playground test -- src/app.test.tsx`

Expected: PASS.

---

### Task 7: Animation, Drag Controls, And Browser Smoke

**Files:**
- Modify: `packages/player/src/three/three-player-view.ts`
- Modify: `packages/player/src/three/camera-controls.ts`
- Test: `packages/player/src/three/camera-controls.test.ts`
- Test: browser smoke file selected by the repository's available browser test harness.

- [ ] **Step 1: Write camera control math tests**

Test pointer delta to orbit state updates without relying on DOM rendering.

- [ ] **Step 2: Implement camera control math**

Keep DOM event registration in the Three view, but keep orbit math as pure
functions so it can be unit tested.

- [ ] **Step 3: Implement visual animation advancement**

Use `requestAnimationFrame` to advance timeline progress while playing. Map
timeline active moves through `mapCubeMoveToAnimation` and rotate affected layer
groups. Commit the final cube state at step completion.

- [ ] **Step 4: Add browser smoke**

Open playground `Player`, load `R U R' U'`, assert the canvas is non-empty,
click play, assert pixels change, drag the canvas, assert pixels change, and
verify mobile and desktop framing.

- [ ] **Step 5: Run package and playground verification**

Run:

```bash
pnpm --filter @cubegin/player test
pnpm --filter @cubegin/player typecheck
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
```

Expected: PASS or exact blocker recorded.

---

## Plan Self-Review

- Spec coverage: The plan covers package scaffold, cube-family mapping, timeline,
  move animation mapping, controller, Three view, React wrapper, playground tab,
  errors, tests, and browser smoke. Non-cube adapters are intentionally deferred.
- Placeholder scan: There are no `TBD` or `TODO` markers. Browser smoke harness
  selection is left to repository capability discovery because no browser test
  harness is currently wired in `apps/playground`.
- Type consistency: Public names match the spec: `createCubeginPlayer`,
  `CubeginPlayer`, `CubeginPlayerOptions`, `UnsupportedPlayerEventError`,
  `InvalidPlayerAlgorithmError`, and `PlayerRendererError`.
