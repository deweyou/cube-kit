# Scramble Image Isometric View Design

## Goal

Add an optional static isometric SVG view to `@cubekit/scramble-image` while
preserving the existing 2D net output as the default. Expose the option in the
playground so maintainers can compare 2D and 3D SVG output quickly.

## Scope

- Keep `renderScrambleImage(eventId, scramble)` behavior unchanged.
- Add a render option that accepts `view: 'net' | 'isometric'`.
- Treat `view: 'net'` as the existing renderer path.
- Render isometric SVG for cube events, Megaminx, Pyraminx, and Skewb.
- Fall back to the existing 2D renderer for Clock and Square-1 when
  `view: 'isometric'` is requested.
- Keep all renderer code DOM-free and serialized through the existing SVG node
  utilities.
- Add a `2D` / `3D` image-view switch to `apps/playground` that controls both
  generated previews and manual renders.

## Supported Events

The isometric path covers the official WCA events backed by these puzzle
families:

- Cube: `222`, `333`, `444`, `555`, `666`, `777`, `333bld`, `333fm`,
  `333oh`, `333mbld`, `444bld`, `555bld`
- Megaminx: `minx`
- Pyraminx: `pyram`
- Skewb: `skewb`

Clock and Square-1 remain supported by fallback to the current 2D renderers.

## API

```ts
export type ScrambleImageView = 'net' | 'isometric';

export interface ScrambleImageOptions {
  view?: ScrambleImageView;
}

renderScrambleImage('333', "R U R'", { view: 'isometric' });
```

`view` defaults to `net`. This keeps existing consumers source-compatible and
runtime-compatible.

## Architecture

The public render dispatch stays in `packages/scramble-image/src/render.ts`.
It parses and applies the scramble exactly as it does today, then chooses a
family renderer based on the requested view. Current renderers stay in place as
the `net` path.

New isometric renderer files should be small and family-scoped:

- `renderers/cube-isometric.ts`
- `renderers/pyraminx-isometric.ts`
- `renderers/skewb-isometric.ts`
- `renderers/megaminx-isometric.ts`

Shared math that is useful across several renderers can live under
`renderers/isometric-geometry.ts` only if duplication becomes meaningful.

## Rendering Rules

- SVG output remains a single serialized SVG string.
- Isometric SVG uses fixed camera angles; it is not interactive 3D.
- Cube rendering shows two fixed three-face views: `U/F/R` plus `D/B/L`, so a
  static 3D SVG can expose all six cube faces without interaction.
- Skewb rendering also shows two fixed three-face views: `U/L/F` plus `R/B/D`.
- Megaminx rendering shows paired `F`-center and `B`-center views, so all 12
  faces are visible in one static SVG.
- Pyraminx uses a fixed three-face `F/L/R` view plus a flat `D` companion face,
  not exact physical camera simulation.
- Renderers should produce stable element counts for solved states so tests can
  catch accidental layout regressions.
- The new option must not alter current SVG dimensions, element counts, or
  fallback behavior for `view: 'net'` and omitted options.

## Testing

Tests should verify:

- Default calls and `view: 'net'` return the same shape as existing renderers.
- `view: 'isometric'` returns distinct SVG for supported families.
- Cube isometric output scales with cube size.
- Clock and Square-1 fallback to the existing 2D output for `view:
'isometric'`.
- Public exports include the new option types and family renderers needed by
  tests.
- Playground service passes the selected view to `scramble-image`.
- Playground state rerenders the selected scramble when the image view changes.
- Playground UI switches the visible SVG preview between the 2D net and the
  path-based 3D SVG.

Verification commands:

```bash
pnpm --filter @cubekit/scramble-puzzle build
pnpm --filter @cubekit/scramble-image test
pnpm --filter @cubekit/scramble-image typecheck
pnpm --filter playground test
pnpm --filter playground typecheck
```

## Out Of Scope

- Three.js or interactive 3D.
- Move animation or playback timeline.
- Clock or Square-1 isometric designs.
- Changes to scramble generation, puzzle state, or event ids.
- Production app integration beyond the playground workbench.
