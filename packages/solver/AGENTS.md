# @cubekit/solver

This package owns platform-agnostic auxiliary solve helpers for CubeKit.

## Read First

- [../../docs/packages/solver/index.md](../../docs/packages/solver/index.md)
- [../../docs/packages/scramble-puzzle/index.md](../../docs/packages/scramble-puzzle/index.md)

## Verify

```bash
pnpm --filter @cubekit/solver test
pnpm --filter @cubekit/solver test:coverage
pnpm --filter @cubekit/solver typecheck
pnpm --filter @cubekit/solver build
```

## Constraints

- Keep `src/` platform-agnostic.
- Depend on `@cubekit/scramble-puzzle` only.
- Do not import `@cubekit/scramble-core` or `@cubekit/scramble-image`.
