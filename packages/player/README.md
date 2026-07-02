# @cubegin/player

Three.js formula playback for Cubegin puzzle events.

This package is the browser-side interactive visualization layer for Cubegin. It
will render and play puzzle algorithms from `eventId + algorithm` input while
reusing `@cubegin/scramble-puzzle` for notation parsing.

The first release targets cube-family events from `222` through `777`, including
blindfolded, one-handed, FMC, and MultiBLD event aliases that share cube sizes.
It also supports Clock, Pyraminx, Skewb, Face-Turning Octahedron, and Megaminx
playback through package-internal puzzle adapters.

## Development

```bash
pnpm --filter @cubegin/player test
pnpm --filter @cubegin/player typecheck
pnpm --filter @cubegin/player build
```

## Boundary

- This package owns browser-side Three.js playback.
- `@cubegin/scramble-image` continues to own static SVG rendering.
- `@cubegin/scramble-puzzle` continues to own formula parsing and state
  transitions.
- Square-1 remains future work.

## License

GPL-3.0-only. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).
