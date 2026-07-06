# Cubegin Player Square-1 Implementation Plan

## Goal

Implement Square-1 playback in `@cubegin/player` and expose it in the playground
Player tab.

## Tasks

- [x] Update player support mapping so `sq1` resolves to `square1`.
- [x] Add failing registry and app tests for `sq1` support.
- [x] Add `packages/player/src/puzzles/square1/square1-player-adapter.test.ts`
  covering parsed moves, solved model geometry, tuple turns, slash turns, and
  invalid slash handling through the existing puzzle definition.
- [x] Implement `square1-player-adapter.ts` using
  `createSquareOneDefinition()`.
- [x] Register the adapter in `puzzle-registry.ts` and extend
  `PlayerPuzzleType`.
- [x] Update player and playground docs to list `sq1` as supported.
- [x] Run:
  - `pnpm --filter @cubegin/player test`
  - `pnpm --filter @cubegin/player typecheck`
  - `pnpm --filter playground test`
  - `pnpm --filter playground typecheck`

## Verification Notes

Use the playground Player tab to compare the final state against the
`scramble-image` reference preview. If the player visually disagrees with the
reference, treat the reference SVG plus `@cubegin/scramble-puzzle` state as the
truth source.
