# Scramble Image Isometric View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add optional DOM-free isometric SVG previews for cube, Megaminx, Pyraminx, and Skewb events while preserving the existing net renderer as the default, then expose the option in the playground for visual inspection.

**Architecture:** Keep render dispatch in `packages/scramble-image/src/render.ts`, add a `ScrambleImageOptions` object with `view?: 'net' | 'isometric'`, and add family-scoped isometric renderers. Clock and Square-1 use the existing 2D renderers even when `view: 'isometric'` is requested. The playground owns a UI-level image-view state and passes it through its service boundary.

**Tech Stack:** TypeScript, vite-plus, Vitest, existing `SvgNode` serialization helpers.

---

### Task 1: Public View Option And Dispatch

**Files:**

- Modify: `packages/scramble-image/src/render.ts`
- Modify: `packages/scramble-image/src/index.ts`
- Test: `packages/scramble-image/src/render-dispatch.test.ts`

- [x] **Step 1: Write failing dispatch tests**

Add tests that prove omitted options and `{ view: 'net' }` keep existing output,
that a supported event can request `{ view: 'isometric' }`, and that Clock and
Square-1 fall back to current 2D output under the isometric option.

Run: `pnpm --filter @cubekit/scramble-image test -- src/render-dispatch.test.ts`

Expected: fail because `renderScrambleImage` does not accept the new options and
no isometric renderer exists.

- [x] **Step 2: Add option types and dispatch shape**

Add:

```ts
export type ScrambleImageView = 'net' | 'isometric';

export interface ScrambleImageOptions {
  view?: ScrambleImageView;
}
```

Update `renderScrambleImage(eventId, scramble, options = {})` and choose net
rendering unless `options.view === 'isometric'` and the family has an
isometric renderer.

- [x] **Step 3: Run dispatch tests**

Run: `pnpm --filter @cubekit/scramble-image test -- src/render-dispatch.test.ts`

Expected: pass after temporary isometric stubs or the first real renderer is in
place.

### Task 2: Cube Isometric Renderer

**Files:**

- Create: `packages/scramble-image/src/renderers/cube-isometric.ts`
- Modify: `packages/scramble-image/src/render.ts`
- Modify: `packages/scramble-image/src/index.ts`
- Test: `packages/scramble-image/src/renderers/cube-isometric.test.ts`
- Test: `packages/scramble-image/src/integration.test.ts`

- [x] **Step 1: Write failing cube renderer tests**

Assert solved 3x3 isometric SVG has one root, no `rect` stickers, contains
`path` stickers, and has `3 * size * size` sticker paths for visible `U`, `F`,
and `R` faces. Assert `renderScrambleImage('333', scramble, { view:
'isometric' })` differs from the default net output.

Run: `pnpm --filter @cubekit/scramble-image test -- src/renderers/cube-isometric.test.ts src/integration.test.ts`

Expected: fail because `cube-isometric.ts` does not exist.

- [x] **Step 2: Implement cube projection**

Create paired fixed three-face projections:

- Front view: `U/F/R`.
- Opposite view: `D/B/L`.

Use only existing `path()` and `createSvgDocument()` helpers. Keep color input
compatible with `CubeColorScheme`.

- [x] **Step 3: Wire cube dispatch**

When `eventInfo.puzzleId === 'cube'` and `view === 'isometric'`, call
`renderCubeIsometric(state)` instead of `renderCubeNet(state)`.

- [x] **Step 4: Run cube tests**

Run: `pnpm --filter @cubekit/scramble-image test -- src/renderers/cube-isometric.test.ts src/integration.test.ts src/render-dispatch.test.ts`

Expected: pass.

### Task 3: Pyraminx And Skewb Isometric Renderers

**Files:**

- Create: `packages/scramble-image/src/renderers/pyraminx-isometric.ts`
- Create: `packages/scramble-image/src/renderers/skewb-isometric.ts`
- Modify: `packages/scramble-image/src/render.ts`
- Modify: `packages/scramble-image/src/index.ts`
- Test: `packages/scramble-image/src/renderers/pyraminx-isometric.test.ts`
- Test: `packages/scramble-image/src/renderers/skewb-isometric.test.ts`

- [x] **Step 1: Write failing side-event tests**

Assert Pyraminx and Skewb isometric SVGs are distinct from their net renderers,
use path-based stickers, and preserve custom color schemes.

Run: `pnpm --filter @cubekit/scramble-image test -- src/renderers/pyraminx-isometric.test.ts src/renderers/skewb-isometric.test.ts`

Expected: fail because renderers do not exist.

- [x] **Step 2: Implement Pyraminx renderer**

Render fixed visible faces with triangle subdivision and SVG paths. Reuse the
same facelet color mapping as the existing Pyraminx net renderer.

- [x] **Step 3: Implement Skewb renderer**

Render fixed visible faces with the same five-sticker face model as the current
Skewb state image. Use paired `U/L/F` and `R/B/D` views so the static SVG exposes
all six Skewb faces without interaction.

- [x] **Step 4: Wire dispatch and exports**

Dispatch `pyram` and `skewb` families to the new renderers when `view:
'isometric'` is requested.

- [x] **Step 5: Run side-event tests**

Run: `pnpm --filter @cubekit/scramble-image test -- src/renderers/pyraminx-isometric.test.ts src/renderers/skewb-isometric.test.ts src/render-dispatch.test.ts`

Expected: pass.

### Task 4: Megaminx Isometric Renderer

**Files:**

- Create: `packages/scramble-image/src/renderers/megaminx-isometric.ts`
- Modify: `packages/scramble-image/src/render.ts`
- Modify: `packages/scramble-image/src/index.ts`
- Test: `packages/scramble-image/src/renderers/megaminx-isometric.test.ts`

- [x] **Step 1: Write failing Megaminx tests**

Assert `renderMegaminxIsometricState()` returns a single SVG, renders visible
pentagon-derived sticker paths, supports custom colors, and differs from the
current unfolded net renderer.

Run: `pnpm --filter @cubekit/scramble-image test -- src/renderers/megaminx-isometric.test.ts`

Expected: fail because renderer does not exist.

- [x] **Step 2: Implement Megaminx renderer**

Use a readable fixed visible face set, starting with `U`, `F`, `R`, `L`, `BR`,
and `BL` if the layout remains legible. Draw each visible face with pentagon
sticker subdivision and a fixed projection offset.

- [x] **Step 3: Wire Megaminx dispatch**

Dispatch `minx` to `renderMegaminxIsometricState()` when requested.

- [x] **Step 4: Run Megaminx tests**

Run: `pnpm --filter @cubekit/scramble-image test -- src/renderers/megaminx-isometric.test.ts src/integration.test.ts`

Expected: pass.

### Task 5: Final Verification And Docs

**Files:**

- Modify: `docs/packages/scramble-image/index.md`
- Modify: `docs/packages/scramble-image/renderer-contracts.md`

- [x] **Step 1: Update package docs**

Document the optional `view` setting, isometric family support, and Clock /
Square-1 fallback behavior.

- [x] **Step 2: Run target verification**

Run:

```bash
pnpm --filter @cubekit/scramble-puzzle build
pnpm --filter @cubekit/scramble-image test
pnpm --filter @cubekit/scramble-image typecheck
```

Expected: all commands exit 0.

- [x] **Step 3: Inspect git status**

Run: `git status --short`

Expected: only intended spec, plan, docs, tests, and scramble-image source files
are modified.

### Task 6: Playground 2D / 3D Switch

**Files:**

- Modify: `apps/playground/src/playground/types.ts`
- Modify: `apps/playground/src/playground/playground-service.ts`
- Modify: `apps/playground/src/playground/use-playground.ts`
- Modify: `apps/playground/src/app.tsx`
- Modify: `apps/playground/src/styles.css`
- Test: `apps/playground/src/playground/playground-service.test.ts`
- Test: `apps/playground/src/playground/use-playground.test.ts`
- Test: `apps/playground/src/app.test.tsx`

- [x] **Step 1: Extend the playground service contract**

Add `imageView` to generated and manual render inputs and pass it through to
`renderScrambleImage()`.

- [x] **Step 2: Add playground state and UI control**

Keep `net` as the default, add a `2D` / `3D` segmented control, and rerender the
selected scramble immediately when the view changes.

- [x] **Step 3: Cover playground behavior**

Add service, hook, and app tests for view propagation and visible SVG switching.

Run: `pnpm --filter playground test`

Expected: pass.
