# Cubegin Player Clock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Magic Clock formula playback to `@cubegin/player` and expose it in the playground Player tab.

**Architecture:** Implement a new Clock adapter behind the existing `PlayerPuzzleAdapter` registry. The adapter reuses `@cubegin/scramble-puzzle` Clock parsing/state, renders a two-sided 3D Clock model, rotates dial hands for turn moves, and rotates the whole body for `y2`.

**Tech Stack:** TypeScript, Three.js renderable model contract, Vitest, React Testing Library playground tests.

---

### Task 1: Clock Adapter Tests

**Files:**
- Create: `packages/player/src/puzzles/clock/clock-player-adapter.test.ts`

- [ ] **Step 1: Write failing adapter tests**

```ts
import { describe, expect, it } from 'vitest';
import { createClockPlayerAdapter } from './clock-player-adapter.js';

describe('createClockPlayerAdapter', () => {
  it('parses Clock notation and creates an 18-dial model', () => {
    const adapter = createClockPlayerAdapter();
    const moves = adapter.parseFormula('UR3+ DR2- y2 U1- ALL5-');
    const model = adapter.createRenderableModel(adapter.createInitialState());

    expect(moves).toHaveLength(5);
    expect(model.pieces.filter((piece) => piece.id.startsWith('clock-hand-'))).toHaveLength(18);
    expect(model.pieces.length).toBeGreaterThan(18);
  });

  it('rotates affected hands for turn moves', () => {
    const adapter = createClockPlayerAdapter();
    const state = adapter.createInitialState();
    const [move] = adapter.parseFormula('UR3+');
    const animation = adapter.describeMove(move, state);

    expect(animation.affectedPieceIds).toEqual(
      expect.arrayContaining(['clock-hand-1', 'clock-hand-2', 'clock-hand-4', 'clock-hand-5']),
    );
    expect(animation.angleRadians).toBeCloseTo(Math.PI / 2);
  });

  it('maps turns after y2 to the opposite physical side', () => {
    const adapter = createClockPlayerAdapter();
    const [rotation, turn] = adapter.parseFormula('y2 U1-');
    const rotated = adapter.applyMove(adapter.createInitialState(), rotation);
    const animation = adapter.describeMove(turn, rotated);

    expect(animation.affectedPieceIds).toContain('clock-hand-9');
    expect(animation.affectedPieceIds).toContain('clock-hand-11');
  });

  it('animates y2 as a whole Clock body rotation', () => {
    const adapter = createClockPlayerAdapter();
    const [rotation] = adapter.parseFormula('y2');
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const animation = adapter.describeMove(rotation, adapter.createInitialState());

    expect(animation.affectedPieceIds).toHaveLength(model.pieces.length);
    expect(animation.axis).toEqual({ x: 0, y: 1, z: 0 });
    expect(animation.angleRadians).toBeCloseTo(Math.PI);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm --filter @cubegin/player test -- src/puzzles/clock/clock-player-adapter.test.ts`

Expected: fail because `clock-player-adapter.ts` does not exist.

### Task 2: Clock Adapter Implementation

**Files:**
- Create: `packages/player/src/puzzles/clock/clock-player-adapter.ts`
- Modify: `packages/player/src/puzzles/puzzle-adapter.ts`
- Modify: `packages/player/src/puzzles/puzzle-registry.ts`

- [ ] **Step 1: Implement `createClockPlayerAdapter`**

Create a Clock adapter that imports `createClockDefinition`, `type ClockMove`,
and `type ClockState` from `@cubegin/scramble-puzzle`. Build board, pins,
dials, and hand pieces with colors aligned to the Clock SVG renderer. For turn
moves, compute signed dial angles with `amount * Math.PI / 6`; for `y2`, return
a body rotation with all piece ids affected.

- [ ] **Step 2: Wire the registry and type union**

Add `clock` to `PlayerPuzzleType`, import the adapter in
`puzzle-registry.ts`, and append it to `PLAYER_ADAPTERS`.

- [ ] **Step 3: Run the focused adapter test**

Run: `pnpm --filter @cubegin/player test -- src/puzzles/clock/clock-player-adapter.test.ts`

Expected: pass.

### Task 3: Event Map And Playground Support

**Files:**
- Modify: `packages/player/src/events/event-map.ts`
- Modify: `packages/player/src/events/event-map.test.ts`
- Modify: `packages/player/src/puzzles/puzzle-registry.test.ts`
- Modify: `apps/playground/src/app.tsx`
- Modify: `apps/playground/src/app.test.tsx`
- Modify: `docs/packages/player/index.md`
- Modify: `docs/apps/playground/index.md`

- [ ] **Step 1: Update tests to expect Clock support**

Change event-map and registry tests so `clock` maps to `{ type: 'clock' }` and
returns a Clock adapter, while `sq1` remains unsupported.

- [ ] **Step 2: Update playground Player event filtering**

Include `clock` in the Player tab supported event list. Keep generated Clock
scrambles flowing through the existing playground service.

- [ ] **Step 3: Run focused tests**

Run: `pnpm --filter @cubegin/player test -- src/events/event-map.test.ts src/puzzles/puzzle-registry.test.ts`

Run: `pnpm --filter playground test -- src/app.test.tsx`

Expected: both pass.

### Task 4: Verification

**Files:**
- No new files.

- [ ] **Step 1: Run player verification**

Run: `pnpm --filter @cubegin/player test`

Run: `pnpm --filter @cubegin/player typecheck`

Expected: both pass.

- [ ] **Step 2: Run playground verification**

Run: `pnpm --filter playground test -- src/app.test.tsx`

Run: `pnpm --filter playground typecheck`

Expected: both pass.

- [ ] **Step 3: Browser inspect the playground**

Open `http://127.0.0.1:5173/`, select Player, choose Clock, load the generated
formula, and verify the canvas renders a Magic Clock model and progress advances.
