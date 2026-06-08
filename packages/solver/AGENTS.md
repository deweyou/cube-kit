# @cubegin/solver

This package owns platform-agnostic auxiliary and full solve helpers for Cubegin.

## Read First

- [../../docs/packages/solver/index.md](../../docs/packages/solver/index.md)
- [../../docs/packages/scramble-puzzle/index.md](../../docs/packages/scramble-puzzle/index.md)

## Verify

```bash
pnpm --filter @cubegin/solver test
pnpm --filter @cubegin/solver test:coverage
pnpm --filter @cubegin/solver typecheck
pnpm --filter @cubegin/solver build
```

## Constraints

- Keep `src/` platform-agnostic.
- Depend on `@cubegin/scramble-puzzle` only.
- Do not import `@cubegin/scramble-core` or `@cubegin/scramble-image`.
