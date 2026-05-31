# @cubekit/solver

Platform-agnostic auxiliary solve helpers for CubeKit.

This package provides structured helper solutions such as Cross, XCross, EOline,
EOFC, Roux S1, Petrus S1, 2x2 Face/Layer, Square-1 shape, and Pyraminx V. It
depends on `@cubekit/scramble-puzzle` for notation parsing and stays independent
from scramble generation and SVG rendering packages.

## Development

```bash
pnpm --filter @cubekit/solver test
pnpm --filter @cubekit/solver typecheck
pnpm --filter @cubekit/solver build
```

## License

GPL-3.0-only. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).
