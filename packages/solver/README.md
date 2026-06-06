# @cubegin/solver

Platform-agnostic auxiliary solve helpers for Cubegin.

This package provides structured helper solutions such as Cross, XCross, EOline,
EOFC, Roux S1, Petrus S1, 2x2 Face/Layer, Square-1 shape, and Pyraminx V. It
depends on `@cubegin/scramble-puzzle` for notation parsing and stays independent
from scramble generation and SVG rendering packages.

## Development

```bash
pnpm --filter @cubegin/solver test
pnpm --filter @cubegin/solver typecheck
pnpm --filter @cubegin/solver build
```

## License

GPL-3.0-only, inherited from the repository license.
