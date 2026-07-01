# Cubegin Player Non-Cube Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add adapter-based 3D playback for Pyraminx, Skewb, FTO, and Megaminx while preserving existing cube-family player behavior.

**Architecture:** Introduce a package-internal puzzle adapter contract, migrate cube rendering to that contract, then add non-cube adapters that reuse `@cubegin/scramble-puzzle` parser/state definitions. The Three.js view becomes generic over renderable polygon-sticker pieces and remains the only DOM/WebGL owner.

**Tech Stack:** TypeScript, Three.js, React 19, Vitest/jsdom, vite-plus, existing `@cubegin/scramble-puzzle` definitions.

---

## File Structure

- Create `packages/player/src/puzzles/puzzle-adapter.ts` for shared model, move animation, and adapter types.
- Create `packages/player/src/puzzles/puzzle-registry.ts` for event-to-adapter lookup.
- Create `packages/player/src/puzzles/cube/cube-player-adapter.ts` and `cube-geometry.ts` to preserve cube behavior through the generic adapter.
- Create family directories under `packages/player/src/puzzles/{pyraminx,skewb,fto,megaminx}/`.
- Modify `packages/player/src/core/player-controller.ts` so it loads adapters instead of cube sizes.
- Modify `packages/player/src/core/timeline.ts` so timeline steps can store adapter-specific moves and duration multipliers.
- Modify `packages/player/src/three/three-player-view.ts` so it renders `PlayerRenderableModel` and applies adapter-provided move animations.
- Modify `packages/player/src/events/event-map.ts` so `pyram`, `skewb`, `fto`, and `minx` are supported.
- Modify `apps/playground` tests and player wiring so generated scrambles for non-cube events flow into the player.

## Task 1: Shared Adapter Contract And Registry

**Files:**
- Create: `packages/player/src/puzzles/puzzle-adapter.ts`
- Create: `packages/player/src/puzzles/puzzle-registry.ts`
- Test: `packages/player/src/puzzles/puzzle-registry.test.ts`
- Modify: `packages/player/src/events/event-map.ts`
- Modify: `packages/player/src/events/event-map.test.ts`

- [ ] **Step 1: Write failing registry and event tests**

Add tests that expect:

```ts
expect(getPlayerPuzzleSupport('pyram')).toEqual({ type: 'pyraminx' });
expect(getPlayerPuzzleSupport('skewb')).toEqual({ type: 'skewb' });
expect(getPlayerPuzzleSupport('fto')).toEqual({ type: 'fto' });
expect(getPlayerPuzzleSupport('minx')).toEqual({ type: 'megaminx' });
expect(getPlayerPuzzleSupport('sq1')).toEqual({ type: 'unsupported' });
expect(getPlayerPuzzleSupport('clock')).toEqual({ type: 'unsupported' });
```

Create registry tests:

```ts
expect(getPlayerPuzzleAdapter('333').type).toBe('cube');
expect(getPlayerPuzzleAdapter('pyram').type).toBe('pyraminx');
expect(getPlayerPuzzleAdapter('skewb').type).toBe('skewb');
expect(getPlayerPuzzleAdapter('fto').type).toBe('fto');
expect(getPlayerPuzzleAdapter('minx').type).toBe('megaminx');
expect(getPlayerPuzzleAdapter('clock')).toBeUndefined();
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
pnpm --filter @cubegin/player test -- src/events/event-map.test.ts src/puzzles/puzzle-registry.test.ts
```

Expected: fail because registry/types and non-cube support are missing.

- [ ] **Step 3: Implement minimal adapter contract**

Define:

```ts
export type PlayerPuzzleType =
  | 'cube'
  | 'pyraminx'
  | 'skewb'
  | 'face-turning-octahedron'
  | 'megaminx';

export interface Vector3Like {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface QuaternionLike {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface PlayerRenderableSticker {
  readonly id: string;
  readonly face: string;
  readonly color: string;
  readonly polygon: readonly Vector3Like[];
}

export interface PlayerRenderablePiece {
  readonly id: string;
  readonly position: Vector3Like;
  readonly orientation: QuaternionLike;
  readonly stickers: readonly PlayerRenderableSticker[];
}

export interface PlayerRenderableModel {
  readonly pieces: readonly PlayerRenderablePiece[];
  readonly cameraDistance: number;
}

export interface PlayerMoveAnimation<Move = unknown> {
  readonly move: Move;
  readonly affectedPieceIds: readonly string[];
  readonly axis: Vector3Like;
  readonly pivot: Vector3Like;
  readonly angleRadians: number;
  readonly durationMultiplier?: number;
}

export interface PlayerPuzzleAdapter<Move = unknown, State = unknown> {
  readonly type: PlayerPuzzleType;
  readonly eventIds: readonly EventId[];
  parseFormula(formula: string): readonly Move[];
  createInitialState(): State;
  createRenderableModel(state: State): PlayerRenderableModel;
  describeMove(move: Move, state: State): PlayerMoveAnimation<Move>;
  applyMove(state: State, move: Move): State;
}
```

- [ ] **Step 4: Implement minimal registry**

Export `getPlayerPuzzleAdapter(eventId)` and register cube plus transitional
non-cube adapter skeletons that parse via `@cubegin/scramble-puzzle` and return
a small deterministic solved model until the family-specific tasks replace them.

- [ ] **Step 5: Run registry tests**

Run:

```bash
pnpm --filter @cubegin/player test -- src/events/event-map.test.ts src/puzzles/puzzle-registry.test.ts
```

Expected: pass.

## Task 2: Generic Timeline And Controller

**Files:**
- Modify: `packages/player/src/core/timeline.ts`
- Modify: `packages/player/src/core/timeline.test.ts`
- Modify: `packages/player/src/core/player-controller.ts`
- Modify: `packages/player/src/core/player-controller.test.ts`

- [ ] **Step 1: Write failing timeline tests for duration multipliers**

Add:

```ts
const timeline = createPlayerTimeline([{ move: { name: 'R++' }, durationMultiplier: 2 }]);
expect(timeline.steps[0]?.durationMs).toBe(1040);
```

- [ ] **Step 2: Run failing timeline test**

Run:

```bash
pnpm --filter @cubegin/player test -- src/core/timeline.test.ts
```

Expected: fail because timeline still expects cube moves directly.

- [ ] **Step 3: Generalize timeline input**

Make `createPlayerTimeline()` accept either plain moves or step descriptors:

```ts
export interface PlayerTimelineInput<Move = unknown> {
  readonly move: Move;
  readonly durationMultiplier?: number;
}
```

Keep existing cube call sites working by normalizing plain moves into
`{ move }`.

- [ ] **Step 4: Write failing controller tests**

Update controller tests so a fake non-cube adapter can load and play through a
mock view without cube sizes:

```ts
expect(view.renderModel).toHaveBeenCalledWith(expect.objectContaining({ pieces: expect.any(Array) }));
expect(view.setTimeline).toHaveBeenCalled();
```

- [ ] **Step 5: Generalize controller view API**

Replace cube-specific view calls with:

```ts
renderModel(model: PlayerRenderableModel): void;
setTimeline(timeline: PlayerTimeline): void;
play(options: PlayerControllerPlayOptions): void;
pause(): void;
seek(progress: number): void;
dispose(): void;
```

- [ ] **Step 6: Run controller and timeline tests**

Run:

```bash
pnpm --filter @cubegin/player test -- src/core/timeline.test.ts src/core/player-controller.test.ts
```

Expected: pass.

## Task 3: Generic Three View And Cube Adapter Migration

**Files:**
- Create: `packages/player/src/puzzles/cube/cube-player-adapter.ts`
- Create: `packages/player/src/puzzles/cube/cube-geometry.ts`
- Modify: `packages/player/src/puzzles/cube/cube-move-map.ts`
- Modify: `packages/player/src/three/three-player-view.ts`
- Modify: `packages/player/src/three/three-player-view.test.ts`
- Modify: `packages/player/src/react/player.test.tsx`

- [ ] **Step 1: Write failing Three view test for polygon stickers**

Assert a renderable model with one piece and one square polygon sticker creates
a mesh named with the sticker id and calls `renderer.render`.

- [ ] **Step 2: Run failing Three view test**

Run:

```bash
pnpm --filter @cubegin/player test -- src/three/three-player-view.test.ts
```

Expected: fail because view only knows `renderSolvedCube`.

- [ ] **Step 3: Implement polygon sticker rendering**

Build `THREE.ShapeGeometry` or `THREE.BufferGeometry` from sticker polygons.
Keep cubie body behavior for cube pieces by representing a cube piece as body
plus rectangular sticker polygons.

- [ ] **Step 4: Migrate cube into adapter**

`cube-player-adapter.ts` should:

```ts
parseFormula(formula) => createCubeDefinition(size, eventIds).parseAlgorithm(formula)
createInitialState() => cube definition solved state
createRenderableModel(state) => current cube cubie/sticker model
describeMove(move, state) => mapCubeMoveToAnimation(move, size)
applyMove(state, move) => definition.applyMove(state, move)
```

- [ ] **Step 5: Run cube and Three tests**

Run:

```bash
pnpm --filter @cubegin/player test -- src/puzzles/cube/cube-move-map.test.ts src/three/three-player-view.test.ts src/react/player.test.tsx
```

Expected: pass and cube behavior preserved.

## Task 4: Pyraminx And Skewb Adapters

**Files:**
- Create: `packages/player/src/puzzles/pyraminx/pyraminx-player-adapter.ts`
- Create: `packages/player/src/puzzles/pyraminx/pyraminx-player-adapter.test.ts`
- Create: `packages/player/src/puzzles/skewb/skewb-player-adapter.ts`
- Create: `packages/player/src/puzzles/skewb/skewb-player-adapter.test.ts`
- Modify: `packages/player/src/puzzles/puzzle-registry.ts`

- [ ] **Step 1: Write failing Pyraminx adapter tests**

Assert:

```ts
const adapter = createPyraminxPlayerAdapter();
expect(adapter.parseFormula("U L R B u' l' r' b'")).toHaveLength(8);
expect(adapter.createRenderableModel(adapter.createInitialState()).pieces.length).toBeGreaterThan(0);
expect(adapter.describeMove(adapter.parseFormula('U')[0], adapter.createInitialState()).affectedPieceIds.length).toBeGreaterThan(0);
expect(adapter.describeMove(adapter.parseFormula('u')[0], adapter.createInitialState()).affectedPieceIds.length)
  .toBeLessThan(adapter.describeMove(adapter.parseFormula('U')[0], adapter.createInitialState()).affectedPieceIds.length);
```

- [ ] **Step 2: Write failing Skewb adapter tests**

Assert:

```ts
const adapter = createSkewbPlayerAdapter();
expect(adapter.parseFormula("R U L B R' U'")).toHaveLength(6);
expect(adapter.createRenderableModel(adapter.createInitialState()).pieces.length).toBeGreaterThan(0);
expect(adapter.describeMove(adapter.parseFormula('R')[0], adapter.createInitialState()).affectedPieceIds.length).toBeGreaterThan(0);
```

- [ ] **Step 3: Run failing adapter tests**

Run:

```bash
pnpm --filter @cubegin/player test -- src/puzzles/pyraminx/pyraminx-player-adapter.test.ts src/puzzles/skewb/skewb-player-adapter.test.ts
```

Expected: fail because adapters are missing.

- [ ] **Step 4: Implement adapters**

Use `createPyraminxDefinition()` and `createSkewbDefinition()`. Start with
clear playable geometry and deterministic affected-piece ids. Use adapter-local
geometry helpers so implementation does not leak into the generic view.

- [ ] **Step 5: Run Pyraminx and Skewb tests**

Run:

```bash
pnpm --filter @cubegin/player test -- src/puzzles/pyraminx/pyraminx-player-adapter.test.ts src/puzzles/skewb/skewb-player-adapter.test.ts src/puzzles/puzzle-registry.test.ts
```

Expected: pass.

## Task 5: FTO And Megaminx Adapters

**Files:**
- Create: `packages/player/src/puzzles/fto/fto-player-adapter.ts`
- Create: `packages/player/src/puzzles/fto/fto-player-adapter.test.ts`
- Create: `packages/player/src/puzzles/megaminx/megaminx-player-adapter.ts`
- Create: `packages/player/src/puzzles/megaminx/megaminx-player-adapter.test.ts`
- Modify: `packages/player/src/puzzles/puzzle-registry.ts`

- [ ] **Step 1: Write failing FTO adapter tests**

Assert:

```ts
const adapter = createFtoPlayerAdapter();
expect(adapter.parseFormula("U D F B L R BL BR")).toHaveLength(8);
expect(adapter.createRenderableModel(adapter.createInitialState()).pieces.length).toBeGreaterThan(0);
expect(adapter.describeMove(adapter.parseFormula('BL')[0], adapter.createInitialState()).affectedPieceIds.length).toBeGreaterThan(0);
```

- [ ] **Step 2: Write failing Megaminx adapter tests**

Assert:

```ts
const adapter = createMegaminxPlayerAdapter();
expect(adapter.parseFormula("R++ D-- R-- D++ U'")).toHaveLength(5);
expect(adapter.createRenderableModel(adapter.createInitialState()).pieces.length).toBeGreaterThan(0);
expect(adapter.describeMove(adapter.parseFormula('R++')[0], adapter.createInitialState()).durationMultiplier).toBeGreaterThan(1);
```

- [ ] **Step 3: Run failing adapter tests**

Run:

```bash
pnpm --filter @cubegin/player test -- src/puzzles/fto/fto-player-adapter.test.ts src/puzzles/megaminx/megaminx-player-adapter.test.ts
```

Expected: fail because adapters are missing.

- [ ] **Step 4: Implement adapters**

Use `createFtoDefinition()` and `createMegaminxDefinition()`. FTO uses
triangular polygon stickers. Megaminx uses pentagonal polygon stickers and
duration multipliers for multi-amount turns and big turns.

- [ ] **Step 5: Run FTO and Megaminx tests**

Run:

```bash
pnpm --filter @cubegin/player test -- src/puzzles/fto/fto-player-adapter.test.ts src/puzzles/megaminx/megaminx-player-adapter.test.ts src/puzzles/puzzle-registry.test.ts
```

Expected: pass.

## Task 6: Playground Integration And Verification

**Files:**
- Modify: `apps/playground/src/app.test.tsx`
- Modify: `apps/playground/src/playground/use-playground.test.ts`
- Modify: `apps/playground/src/playground/use-playground.ts`
- Modify: `apps/playground/src/app.tsx`
- Modify: `packages/player/src/core/errors.test.ts`

- [ ] **Step 1: Write failing playground tests**

Assert selecting `pyram`, `skewb`, `fto`, and `minx` in the Player tab loads
the generated scramble formula into the player. Assert `sq1` and `clock`
remain unsupported.

- [ ] **Step 2: Run failing playground tests**

Run:

```bash
pnpm --filter playground test -- src/app.test.tsx src/playground/use-playground.test.ts
```

Expected: fail until the event-map and playground player wiring accept the new
events.

- [ ] **Step 3: Wire playground and error handling**

Update event support so generated scrambles flow into `CubeginPlayer` for
`pyram`, `skewb`, `fto`, and `minx`. Keep unsupported UI for `sq1` and `clock`.

- [ ] **Step 4: Run package and playground verification**

Run:

```bash
pnpm --filter @cubegin/player test
pnpm --filter @cubegin/player typecheck
pnpm --filter @cubegin/player build
pnpm --filter playground test -- src/app.test.tsx src/playground/use-playground.test.ts
pnpm --filter playground typecheck
```

Expected: pass.

- [ ] **Step 5: Browser smoke**

Against the running playground:

1. Open the Player tab.
2. Load `333`, `pyram`, `skewb`, `fto`, and `minx`.
3. Confirm each canvas is non-empty.
4. Play each formula long enough for progress to advance.
5. Confirm console errors remain empty.
