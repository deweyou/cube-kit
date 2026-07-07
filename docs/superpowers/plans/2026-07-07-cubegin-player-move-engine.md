# Cubegin Player Move Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `@cubegin/player` so formula playback animation and committed puzzle state come from the same move transform source, then use that foundation to fix cube signed motion and rebuild Square-1 playback.

**Architecture:** Add an internal `PlayerMoveTransform` contract alongside the existing adapter API, adapt existing one-axis animations into transform operations, and teach the Three.js view to animate transforms. Square-1 then moves from target-pose/checkpoint compensation to a 24 half-slot state engine whose tuple and slash commits use the same operations that are animated.

**Tech Stack:** TypeScript, Three.js, Vitest/jsdom, vite-plus, existing `@cubegin/scramble-puzzle` parser/state definitions, playground scramble-image reference previews for manual parity checks.

---

## File Structure

- Modify `packages/player/src/puzzles/puzzle-adapter.ts` to add transform operation types while preserving current adapter compatibility.
- Modify `packages/player/src/core/timeline.ts` so each step can carry either an old `PlayerMoveAnimation` or a new `PlayerMoveTransform`.
- Modify `packages/player/src/core/player-controller.ts` to prefer `describeTransform()` / `commitTransform()` when adapters implement them.
- Modify `packages/player/src/three/three-player-view.ts` to apply transform operations and keep old animations as a compatibility wrapper.
- Add or update `packages/player/src/three/three-player-view.test.ts` for multiple-operation signed playback.
- Add or update `packages/player/src/puzzles/cube/cube-move-map.test.ts` for cube signed direction checks.
- Add `packages/player/src/puzzles/square1/square1-engine.ts` for Square-1 half-slot state, tuple transforms, slash transforms, and legality checks.
- Rewrite `packages/player/src/puzzles/square1/square1-player-adapter.ts` to use the engine.
- Replace focused tests in `packages/player/src/puzzles/square1/square1-player-adapter.test.ts` with half-slot state, `(1,0)`, `/`, `(1,0) /`, and invalid slash cases.
- Leave `docs/packages/player/index.md` unchanged in this plan because the public package boundary and verification commands remain the same.

## Task 1: Add Transform Types Without Behavior Change

**Files:**
- Modify: `packages/player/src/puzzles/puzzle-adapter.ts`
- Modify: `packages/player/src/core/timeline.ts`
- Test: `packages/player/src/core/timeline.test.ts`

- [ ] **Step 1: Add failing timeline test for transform-carrying steps**

Add this test to `packages/player/src/core/timeline.test.ts`:

```ts
it('keeps transform operations on timeline steps', () => {
  const transform = {
    durationMultiplier: 1.25,
    move: { notation: 'combo' },
    operations: [
      {
        affectedPieceIds: ['piece-a'],
        angleRadians: Math.PI / 2,
        axis: { x: 0, y: 1, z: 0 },
        pivot: { x: 0, y: 0, z: 0 },
        type: 'axis-rotation' as const,
      },
    ],
  };
  const timeline = createPlayerTimeline([{ move: transform.move, transform }]);

  expect(timeline.steps[0]?.transform).toBe(transform);
  expect(timeline.steps[0]?.animation).toBeUndefined();
  expect(timeline.steps[0]?.durationMs).toBe(650);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/core/timeline.test.ts
```

Expected: FAIL because `PlayerTimelineInput` has no `transform` field.

- [ ] **Step 3: Add transform types**

In `packages/player/src/puzzles/puzzle-adapter.ts`, add:

```ts
export type PlayerTransformOperation =
  | PlayerAxisRotationOperation
  | PlayerColorPulseOperation
  | PlayerPositionPulseOperation;

export interface PlayerAxisRotationOperation {
  readonly type: 'axis-rotation';
  readonly affectedPieceIds: readonly string[];
  readonly axis: Vector3Like;
  readonly pivot: Vector3Like;
  readonly pivotByPieceId?: Readonly<Record<string, Vector3Like>>;
  readonly angleRadians: number;
  readonly angleRadiansByPieceId?: Readonly<Record<string, number>>;
  readonly rotateInPlace?: boolean;
}

export interface PlayerColorPulseOperation {
  readonly type: 'color-pulse';
  readonly colorPulseByPieceId?: Readonly<Record<string, string>>;
  readonly colorPulseByStickerId?: Readonly<Record<string, string>>;
}

export interface PlayerPositionPulseOperation {
  readonly type: 'position-pulse';
  readonly positionPulseByPieceId: Readonly<Record<string, Vector3Like>>;
}

export interface PlayerMoveTransform<Move = unknown> {
  readonly move: Move;
  readonly durationMultiplier?: number;
  readonly operations: readonly PlayerTransformOperation[];
}
```

Also extend `PlayerPuzzleAdapter`:

```ts
readonly shouldRebuildModelAfterEachMove?: boolean;
describeTransform?(move: Move, state: State): PlayerMoveTransform<Move>;
commitTransform?(state: State, transform: PlayerMoveTransform<Move>): State;
```

Keep `describeMove()` and `applyMove()` required for existing adapters in this task.

- [ ] **Step 4: Teach timeline inputs about transforms**

In `packages/player/src/core/timeline.ts`, update imports and types:

```ts
import type {
  PlayerMoveAnimation,
  PlayerMoveTransform,
  PlayerRenderableModel,
} from '../puzzles/puzzle-adapter.js';

export interface PlayerTimelineInput<Move = unknown> {
  readonly move: Move;
  readonly animation?: PlayerMoveAnimation<Move>;
  readonly transform?: PlayerMoveTransform<Move>;
  readonly durationMultiplier?: number;
}

export interface PlayerTimelineStep<Move = unknown> {
  readonly move: Move;
  readonly index: number;
  readonly animation: PlayerMoveAnimation<Move> | undefined;
  readonly transform: PlayerMoveTransform<Move> | undefined;
  readonly quarterTurns: number;
  readonly durationMs: number;
}
```

Use this duration precedence:

```ts
const durationMultiplier =
  timelineInput.durationMultiplier ??
  timelineInput.transform?.durationMultiplier ??
  timelineInput.animation?.durationMultiplier ??
  (quarterTurns === 2 ? 1.45 : 1);
```

Return both `animation` and `transform` on each step.

- [ ] **Step 5: Run the timeline test**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/core/timeline.test.ts
```

Expected: PASS.

## Task 2: Apply Transforms In The Three.js View

**Files:**
- Modify: `packages/player/src/three/three-player-view.ts`
- Test: `packages/player/src/three/three-player-view.test.ts`

- [ ] **Step 1: Add failing view test for multiple active operations**

Add this test to `packages/player/src/three/three-player-view.test.ts`:

```ts
it('applies every axis-rotation operation in an active transform', () => {
  const container = document.createElement('div');
  const renderer = createRenderer();
  const view = createThreePlayerView(container, {
    rendererFactory: () => renderer,
  });
  const transform = {
    move: { notation: '(1,1)' },
    operations: [
      {
        affectedPieceIds: ['top-piece'],
        angleRadians: Math.PI / 2,
        axis: { x: 0, y: 1, z: 0 },
        pivot: { x: 0, y: 0, z: 0 },
        type: 'axis-rotation' as const,
      },
      {
        affectedPieceIds: ['bottom-piece'],
        angleRadians: -Math.PI / 2,
        axis: { x: 0, y: 1, z: 0 },
        pivot: { x: 0, y: 0, z: 0 },
        type: 'axis-rotation' as const,
      },
    ],
  };

  view.renderModel({
    cameraDistance: 8,
    pieces: [
      {
        id: 'top-piece',
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        position: { x: 1, y: 1, z: 0 },
        stickers: [],
      },
      {
        id: 'bottom-piece',
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        position: { x: 1, y: -1, z: 0 },
        stickers: [],
      },
    ],
  });
  view.setTimeline(createPlayerTimeline([{ move: transform.move, transform }]));
  view.seek(0.5);

  const children = getRenderedPuzzleGroup(getLastRenderedScene(renderer)).children;
  const topPiece = children.find((child) => child.name === 'top-piece');
  const bottomPiece = children.find((child) => child.name === 'bottom-piece');

  expect(topPiece?.position.x).toBeCloseTo(Math.SQRT1_2);
  expect(topPiece?.position.z).toBeCloseTo(-Math.SQRT1_2);
  expect(bottomPiece?.position.x).toBeCloseTo(Math.SQRT1_2);
  expect(bottomPiece?.position.z).toBeCloseTo(Math.SQRT1_2);
});
```

- [ ] **Step 2: Run the failing view test**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/three/three-player-view.test.ts
```

Expected: FAIL because the view ignores `step.transform`.

- [ ] **Step 3: Extract operation application**

In `three-player-view.ts`, replace the single `applyAnimation()` body with:

```ts
const applyAxisRotationOperation = (
  operation: PlayerAxisRotationOperation,
  progress: number,
): void => {
  const affectedPieceIds = new Set(operation.affectedPieceIds);
  const axis = vectorFrom(operation.axis).normalize();

  for (const piece of renderedPieces) {
    if (!affectedPieceIds.has(piece.id)) continue;

    const angleRadians =
      (operation.angleRadiansByPieceId?.[piece.id] ?? operation.angleRadians) * progress;
    const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angleRadians);
    const pivot = vectorFrom(operation.pivotByPieceId?.[piece.id] ?? operation.pivot);

    if (!operation.rotateInPlace) {
      piece.mesh.position.sub(pivot).applyAxisAngle(axis, angleRadians).add(pivot);
    }
    piece.mesh.quaternion.premultiply(rotation);
  }
};
```

Then add `applyTransform(transform, progress)` that iterates all operations:

```ts
const applyTransform = (
  transform: PlayerMoveTransform | undefined,
  progress: number,
): void => {
  if (transform === undefined) return;

  for (const operation of transform.operations) {
    if (operation.type === 'axis-rotation') {
      applyAxisRotationOperation(operation, progress);
    } else if (operation.type === 'position-pulse') {
      applyPositionPulseOperation(operation, progress);
    } else {
      applyColorPulseOperation(operation, progress);
    }
  }
};
```

Keep `applyAnimation()` by adapting old animations to one transform operation.

- [ ] **Step 4: Use transform first in timeline playback**

In `applyTimelineProgress()`, replace active-step application with:

```ts
applyTransform(
  renderPosition.activeStep?.transform ?? animationToTransform(renderPosition.activeStep?.animation),
  renderPosition.activeStepProgress,
);
```

For completed steps without checkpoints, do the same at progress `1`.

- [ ] **Step 5: Run view tests**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/three/three-player-view.test.ts
```

Expected: PASS.

## Task 3: Prefer Engine Transforms In The Controller

**Files:**
- Modify: `packages/player/src/core/player-controller.ts`
- Test: `packages/player/src/core/player-controller.test.ts`

- [ ] **Step 1: Add failing controller test for transform-first adapters**

Add a fake adapter in `player-controller.test.ts` that implements
`describeTransform()` and `commitTransform()`. Assert `applyMove()` is not
called when transform methods are present:

```ts
expect(fakeAdapter.describeTransform).toHaveBeenCalledOnce();
expect(fakeAdapter.commitTransform).toHaveBeenCalledOnce();
expect(fakeAdapter.applyMove).not.toHaveBeenCalled();
expect(view.setTimeline).toHaveBeenCalledWith(
  expect.objectContaining({
    steps: [
      expect.objectContaining({
        transform: expect.objectContaining({
          operations: [expect.objectContaining({ type: 'axis-rotation' })],
        }),
      }),
    ],
  }),
);
```

- [ ] **Step 2: Run the failing controller test**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/core/player-controller.test.ts
```

Expected: FAIL because controller only calls `describeMove()` / `applyMove()`.

- [ ] **Step 3: Update timeline construction**

In `player-controller.ts`, build each step like this:

```ts
const transform =
  adapter.describeTransform?.(move, nextAdapterState) ?? undefined;
const animation =
  transform === undefined ? adapter.describeMove(move, nextAdapterState) : undefined;

nextAdapterState =
  transform !== undefined && adapter.commitTransform !== undefined
    ? adapter.commitTransform(nextAdapterState, transform)
    : adapter.applyMove(nextAdapterState, move);

modelsByCompletedStepCount?.push(adapter.createRenderableModel(nextAdapterState));

return {
  animation,
  durationMultiplier: transform?.durationMultiplier ?? animation?.durationMultiplier,
  move,
  transform,
};
```

If an adapter implements `describeTransform()` but not `commitTransform()`, fall
back to `applyMove()` so migration is incremental.

- [ ] **Step 4: Run controller tests**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/core/player-controller.test.ts
```

Expected: PASS.

## Task 4: Add Cube Signed Motion Regressions

**Files:**
- Modify: `packages/player/src/puzzles/cube/cube-move-map.test.ts`
- Modify: `packages/player/src/puzzles/cube/cube-move-map.ts`

- [ ] **Step 1: Add explicit signed direction helper tests**

Add tests that rotate a visible sticker-center vector using the mapped axis and
angle. Use the player coordinate system where `x` is right, `y` is up, and `z`
is front:

```ts
const rotateVector = (
  axis: 'x' | 'y' | 'z',
  angleRadians: number,
  vector: readonly [number, number, number],
): readonly [number, number, number] => {
  const [x, y, z] = vector;
  const cos = Math.round(Math.cos(angleRadians));
  const sin = Math.round(Math.sin(angleRadians));

  if (axis === 'x') return [x, y * cos - z * sin, y * sin + z * cos];
  if (axis === 'y') return [x * cos + z * sin, y, -x * sin + z * cos];

  return [x * cos - y * sin, x * sin + y * cos, z];
};
```

Add these assertions:

```ts
expect(rotateVector('y', mapCubeMoveToAnimation(U, 3).angleRadians, [0, 0, 1]))
  .toEqual([1, 0, 0]);
expect(rotateVector('y', mapCubeMoveToAnimation(UPrime, 3).angleRadians, [1, 0, 0]))
  .toEqual([0, 0, 1]);
expect(rotateVector('z', mapCubeMoveToAnimation(F, 3).angleRadians, [0, 1, 0]))
  .toEqual([1, 0, 0]);
expect(rotateVector('z', mapCubeMoveToAnimation(FPrime, 3).angleRadians, [1, 0, 0]))
  .toEqual([0, 1, 0]);
```

- [ ] **Step 2: Run cube move-map tests**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/puzzles/cube/cube-move-map.test.ts
```

Expected: FAIL with current mapping when `U` maps the front vector to the left
instead of the right, or when `F` maps the up vector away from the right.

- [ ] **Step 3: Fix only the failed signed mappings**

Adjust `usesPositiveTurnAngle()` or the face-specific sign mapping so the four
signed direction tests pass. Keep existing layer selection tests unchanged.

- [ ] **Step 4: Run cube adapter and controller tests**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/puzzles/cube/cube-move-map.test.ts src/puzzles/cube/cube-player-adapter.test.ts src/core/player-controller.test.ts
```

Expected: PASS.

## Task 5: Build Square-1 Half-Slot Engine

**Files:**
- Create: `packages/player/src/puzzles/square1/square1-engine.ts`
- Test: `packages/player/src/puzzles/square1/square1-engine.test.ts`

- [ ] **Step 1: Write failing solved half-slot tests**

Create `square1-engine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createSolvedSquareOneEngineState } from './square1-engine.js';

describe('Square-1 engine state', () => {
  it('starts with 24 half-slots and 16 physical pieces', () => {
    const state = createSolvedSquareOneEngineState();

    expect(state.wedges).toHaveLength(24);
    expect(new Set(state.wedges.map((slot) => slot.pieceId))).toHaveLength(16);
    expect(state.equatorOrientation).toBe(0);
  });

  it('models corners as two half-slots and edges as one half-slot', () => {
    const state = createSolvedSquareOneEngineState();
    const slotCountsByPiece = new Map<string, number>();

    for (const slot of state.wedges) {
      slotCountsByPiece.set(slot.pieceId, (slotCountsByPiece.get(slot.pieceId) ?? 0) + 1);
    }

    expect([...slotCountsByPiece.values()].sort((left, right) => left - right))
      .toEqual([1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2]);
  });
});
```

- [ ] **Step 2: Run the failing engine test**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/puzzles/square1/square1-engine.test.ts
```

Expected: FAIL because `square1-engine.ts` does not exist.

- [ ] **Step 3: Implement solved state**

Create `square1-engine.ts` with:

```ts
export interface SquareOneEngineSlot {
  readonly pieceId: string;
  readonly layer: 'top' | 'bottom';
  readonly pieceKind: 'corner' | 'edge';
  readonly slotWidth: 1 | 2;
}

export interface SquareOneEngineState {
  readonly wedges: readonly SquareOneEngineSlot[];
  readonly equatorOrientation: 0 | 3;
}

const SOLVED_WEDGE_PATTERN = [
  ['top-corner-0', 'corner'],
  ['top-corner-0', 'corner'],
  ['top-edge-0', 'edge'],
  ['top-corner-1', 'corner'],
  ['top-corner-1', 'corner'],
  ['top-edge-1', 'edge'],
  ['top-corner-2', 'corner'],
  ['top-corner-2', 'corner'],
  ['top-edge-2', 'edge'],
  ['top-corner-3', 'corner'],
  ['top-corner-3', 'corner'],
  ['top-edge-3', 'edge'],
  ['bottom-edge-0', 'edge'],
  ['bottom-corner-0', 'corner'],
  ['bottom-corner-0', 'corner'],
  ['bottom-edge-1', 'edge'],
  ['bottom-corner-1', 'corner'],
  ['bottom-corner-1', 'corner'],
  ['bottom-edge-2', 'edge'],
  ['bottom-corner-2', 'corner'],
  ['bottom-corner-2', 'corner'],
  ['bottom-edge-3', 'edge'],
  ['bottom-corner-3', 'corner'],
  ['bottom-corner-3', 'corner'],
] as const;
```

Map it to `SquareOneEngineSlot[]`, using `slotWidth: 2` for corners and
`slotWidth: 1` for edges.

- [ ] **Step 4: Run the engine state test**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/puzzles/square1/square1-engine.test.ts
```

Expected: PASS.

## Task 6: Implement Square-1 Tuple And Slash Transforms

**Files:**
- Modify: `packages/player/src/puzzles/square1/square1-engine.ts`
- Test: `packages/player/src/puzzles/square1/square1-engine.test.ts`

- [ ] **Step 1: Add failing tuple tests**

Add:

```ts
it('turns (1,0) by one top half-slot clockwise', () => {
  const state = createSolvedSquareOneEngineState();
  const transform = describeSquareOneTupleTransform({ top: 1, bottom: 0 }, state);
  const nextState = commitSquareOneTransform(state, transform);

  expect(transform.operations).toHaveLength(1);
  expect(transform.operations[0]).toMatchObject({
    angleRadians: Math.PI / 6,
    axis: { x: 0, y: 1, z: 0 },
    type: 'axis-rotation',
  });
  expect(nextState.wedges.slice(0, 12).map((slot) => slot.pieceId))
    .toEqual([
      state.wedges[11]?.pieceId,
      ...state.wedges.slice(0, 11).map((slot) => slot.pieceId),
    ]);
});
```

Add `(0,-1)` coverage that rotates only the bottom half-slots in the inverse
direction.

- [ ] **Step 2: Add failing slash tests**

Add:

```ts
it('slashes by swapping the current top-right and bottom-left half-slot ranges', () => {
  const state = createSolvedSquareOneEngineState();
  const transform = describeSquareOneSlashTransform(state);
  const nextState = commitSquareOneTransform(state, transform);

  expect(transform.operations).toHaveLength(1);
  expect(transform.operations[0]).toMatchObject({
    angleRadians: Math.PI,
    type: 'axis-rotation',
  });
  expect(nextState.equatorOrientation).toBe(3);
  expect(nextState.wedges.slice(6, 12).map((slot) => slot.pieceId))
    .toEqual(state.wedges.slice(12, 18).map((slot) => slot.pieceId));
  expect(nextState.wedges.slice(12, 18).map((slot) => slot.pieceId))
    .toEqual(state.wedges.slice(6, 12).map((slot) => slot.pieceId));
});
```

- [ ] **Step 3: Run failing transform tests**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/puzzles/square1/square1-engine.test.ts
```

Expected: FAIL because tuple and slash transform functions do not exist.

- [ ] **Step 4: Implement tuple transform**

Implement:

```ts
export interface SquareOneTupleTurn {
  readonly top: number;
  readonly bottom: number;
}

export type SquareOneEngineMove =
  | { readonly type: 'tuple'; readonly top: number; readonly bottom: number }
  | { readonly type: 'slash' };
```

For top turns, affected ids are unique piece ids in `wedges[0..11]`. For bottom
turns, affected ids are unique piece ids in `wedges[12..23]`. Commit by rotating
the top or bottom half-slot arrays by the signed number of slots.

- [ ] **Step 5: Implement slash transform**

Implement `describeSquareOneSlashTransform(state)` so the affected ids are
unique piece ids from `wedges[6..11]` and `wedges[12..17]`. Commit by swapping
those exact ranges and toggling `equatorOrientation` between `0` and `3`.

- [ ] **Step 6: Run transform tests**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/puzzles/square1/square1-engine.test.ts
```

Expected: PASS.

## Task 7: Wire Square-1 Adapter To The Engine

**Files:**
- Modify: `packages/player/src/puzzles/square1/square1-player-adapter.ts`
- Modify: `packages/player/src/puzzles/square1/square1-player-adapter.test.ts`

- [ ] **Step 1: Add failing adapter tests for engine transform methods**

Add tests that assert:

```ts
const adapter = createSquareOnePlayerAdapter();
const state = adapter.createInitialState();
const tupleMove = adapter.parseFormula('(1,0)')[0];
const tupleTransform = adapter.describeTransform?.(tupleMove, state);

expect(tupleTransform?.operations[0]).toMatchObject({
  angleRadians: Math.PI / 6,
  type: 'axis-rotation',
});
expect(adapter.commitTransform?.(state, tupleTransform!).wedges).toHaveLength(24);
```

Add `(1,0) /` coverage:

```ts
const [tupleMove, slashMove] = adapter.parseFormula('(1,0) /');
const afterTuple = adapter.commitTransform!(
  state,
  adapter.describeTransform!(tupleMove!, state),
);
const slashTransform = adapter.describeTransform!(slashMove!, afterTuple);

expect(slashTransform.operations[0]?.affectedPieceIds.length).toBeGreaterThan(0);
expect(adapter.commitTransform!(afterTuple, slashTransform).equatorOrientation).toBe(3);
```

- [ ] **Step 2: Run failing Square-1 adapter tests**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/puzzles/square1/square1-player-adapter.test.ts
```

Expected: FAIL because the adapter does not expose transform methods or the
engine state.

- [ ] **Step 3: Switch adapter state to engine state**

In `square1-player-adapter.ts`, keep parsing through
`createSquareOneDefinition()` but return `SquareOneEngineState` from
`createInitialState()`. Add a small conversion layer from parsed `SquareOneMove`
to engine move:

```ts
const toEngineMove = (move: SquareOneMove): SquareOneEngineMove =>
  move.type === 'slash'
    ? { type: 'slash' }
    : { type: 'tuple', top: move.top, bottom: move.bottom };
```

The current `SquareOneMove` type is:

```ts
export type SquareOneMove =
  | { readonly type: 'tuple'; readonly top: SquareOneTurn; readonly bottom: SquareOneTurn }
  | { readonly type: 'slash' };
```

Use `move.type`, `move.top`, and `move.bottom`; do not inspect other fields.

- [ ] **Step 4: Route transform methods**

Implement:

```ts
describeTransform(move, state) {
  return describeSquareOneMoveTransform(toEngineMove(move), state);
}

commitTransform(state, transform) {
  return commitSquareOneTransform(state, transform);
}
```

Keep old `describeMove()` and `applyMove()` as compatibility wrappers around
the transform methods until the adapter contract is fully migrated.

- [ ] **Step 5: Rebuild renderable model from engine state**

Update `createRenderableModel(state)` so contiguous half-slots with the same
`pieceId` become one renderable piece. Preserve the square silhouette, sticker
border thickness, side strip layout, default camera, and current color mapping.

- [ ] **Step 6: Run Square-1 tests**

Run:

```bash
corepack pnpm --filter @cubegin/player test -- src/puzzles/square1/square1-engine.test.ts src/puzzles/square1/square1-player-adapter.test.ts
```

Expected: PASS.

## Task 8: End-To-End Verification And Playground Check

**Files:**
- No planned edits. If this task exposes a failure, return to the specific
  earlier task boundary responsible for that failure instead of adding a broad
  verification-only patch.

- [ ] **Step 1: Run targeted player tests**

Run:

```bash
corepack pnpm --filter @cubegin/player test
```

Expected: PASS.

- [ ] **Step 2: Run player typecheck and build**

Run:

```bash
corepack pnpm --filter @cubegin/player typecheck
corepack pnpm --filter @cubegin/player build
```

Expected: PASS.

- [ ] **Step 3: Run playground tests**

Run:

```bash
corepack pnpm --filter playground test
corepack pnpm --filter playground typecheck
```

Expected: PASS.

- [ ] **Step 4: Manual browser verification**

Start or refresh the playground:

```bash
corepack pnpm --filter playground dev --host 127.0.0.1
```

Use the Player tab to check:

- Event `333`, formula `U U' F F'`, final state returns to solved and visible
  turns move in the expected direction.
- Event `sq1`, formula `(1,0)`, U layer moves one small slot clockwise.
- Event `sq1`, formula `(1,0) /`, slash rotates the right half front-to-back and
  the end state is visually compared against the scramble-image reference.

Expected: no obvious mismatch with the reference preview for the checked final
states.
