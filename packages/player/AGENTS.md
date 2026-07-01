# @cubegin/player

This package owns browser-side Three.js formula playback for Cubegin puzzle
events.

## Read First

- [../../docs/superpowers/specs/2026-06-30-cubegin-player-design.md](../../docs/superpowers/specs/2026-06-30-cubegin-player-design.md)
- [../../docs/superpowers/specs/2026-06-30-cubegin-player-non-cube-design.md](../../docs/superpowers/specs/2026-06-30-cubegin-player-non-cube-design.md)
- [../../docs/superpowers/plans/2026-06-30-cubegin-player.md](../../docs/superpowers/plans/2026-06-30-cubegin-player.md)
- [../../docs/packages/scramble-puzzle/index.md](../../docs/packages/scramble-puzzle/index.md)
- [../../docs/dependency-licensing.md](../../docs/dependency-licensing.md)

## Verify

```bash
pnpm --filter @cubegin/player test
pnpm --filter @cubegin/player typecheck
pnpm --filter @cubegin/player build
```

## Constraints

- Keep parser and state semantics in `@cubegin/scramble-puzzle`.
- Keep Three.js, DOM, canvas, and React code out of reusable scramble packages.
- Do not couple this package to `@cubegin/scramble-image`.
