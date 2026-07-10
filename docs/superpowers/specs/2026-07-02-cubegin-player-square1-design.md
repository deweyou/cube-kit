# Cubegin Player Square-1 Design

## Status

Drafted on 2026-07-02 as the follow-up after Clock player support was merged.

## Goal

Add `sq1` support to `@cubegin/player` so the playground Player tab can load a
generated or typed Square-1 formula, play it move by move, seek by move step, and
compare the final visual state against the existing `@cubegin/scramble-image`
Square-1 preview.

## Scope

- Add a Square-1 adapter under `packages/player/src/puzzles/square1/`.
- Reuse `createSquareOneDefinition()` from `@cubegin/scramble-puzzle` for all
  parser and state semantics.
- Render a 3D Square-1 prism model with stacked top, middle, and bottom layers,
  square outer boundaries, visible piece thickness, and sticker borders.
- Animate tuple moves `(top,bottom)` as independent top and bottom face turns.
- Animate slash moves `/` as the state-defined half swap.
- Enable `sq1` in player event mapping, registry, React/playground tests, and
  playground Player event options.
- Keep the player package independent from `@cubegin/scramble-image`; only the
  playground may show the reference SVG beside the player.

## Non-Goals

- Do not redesign the Square-1 parser, solver, generator, or SVG renderer.
- Do not add PNG/SVG export from the player.
- Do not add custom color editing or sticker themes.
- Do not attempt a full physically accurate Square-1 mechanism in this pass.
  The first version favors deterministic state comparison with the existing
  scramble image.

## Design

The adapter maps the existing `SquareOneState` to renderable pieces. Each real
Square-1 piece has a stable id (`square1-piece-0` through `square1-piece-15`).
Corners span two 30-degree slots and receive three stickers; edges span one slot
and receive two stickers. The model positions pieces as stacked prism wedges:
the U layer sits above the middle slice, the D layer sits below it, and the
outer boundary follows the real puzzle's square silhouette instead of a circular
net.

For every move, the controller already calls `describeMove(move, state)` before
committing `applyMove(state, move)`. The Square-1 adapter uses that current state
to select stable piece ids:

- Tuple moves affect the unique pieces currently on the top ring when `top` is
  non-zero and the unique pieces on the bottom ring when `bottom` is non-zero.
- The top and bottom layers rotate around the vertical `y` axis. Turn values
  are multiples of 30 degrees.
- Slash moves affect the unique pieces in `top[6..11]` and `bottom[0..5]`, the
  same positions swapped by `applySquareOneMove`.
- Slash animation uses a 180-degree right-half turn around the horizontal axis
  normal to the middle-layer seam, so the front side rolls toward the back side
  while the final committed state still comes from `@cubegin/scramble-puzzle`.

Square-1 uses state render checkpoints because its geometry changes after slash
moves. The controller stores the renderable model for the initial state and for
each committed move state, while the Three view applies only the active step's
partial animation on top of the latest completed checkpoint. Static puzzle
families keep the original solved-model animation path.

## Testing

- Unit-test event mapping and registry support for `sq1`.
- Unit-test the Square-1 adapter parser, solved model shape, tuple affected
  piece sets, slash affected piece sets, camera defaults, and duration
  multipliers.
- Extend React/playground tests so `sq1` appears in the Player event selector
  and loads generated formulas.
- Run targeted package tests and typechecks for `@cubegin/player` and
  `playground`.
