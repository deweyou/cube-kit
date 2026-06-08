# @cubegin/solver

Platform-agnostic auxiliary and full solve helpers for Cubegin.

This package provides structured helper solutions such as Cross, XCross, EOline,
EOFC, Roux/Petrus/CFOP/ZZ staged helpers, 2x2 Face/Layer, Square-1 shape,
Pyraminx V, and Skewb Face. It also owns the full solver primitives used by
scramble generation, including 2x2, 3x3 min2phase, 4x4 threephase, Clock,
Pyraminx, Skewb, and Square-1.

It depends on `@cubegin/scramble-puzzle` for notation parsing and stays
independent from scramble generation and SVG rendering packages.

## Development

```bash
pnpm --filter @cubegin/solver test
pnpm --filter @cubegin/solver typecheck
pnpm --filter @cubegin/solver build
```

## License

GPL-3.0-only, inherited from the repository license.
