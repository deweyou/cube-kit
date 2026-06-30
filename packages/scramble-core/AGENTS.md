# @cubegin/scramble-core

This package owns event-based scramble generation, TNoodle-compatible solver
boundaries, random sources, and unique batch generation.

## Read First

- [../../docs/packages/scramble-core/index.md](../../docs/packages/scramble-core/index.md)
- [../../docs/packages/scramble-core/wca-generation-rules.md](../../docs/packages/scramble-core/wca-generation-rules.md)
- [../../docs/tnoodle-baseline.md](../../docs/tnoodle-baseline.md)

## Verify

```bash
pnpm --filter @cubegin/scramble-core test
pnpm --filter @cubegin/scramble-core test:coverage
pnpm --filter @cubegin/scramble-core typecheck
```

## Constraints

- Keep TNoodle-compatible generator behavior aligned with WCA rule tests.
- Do not wire this package into production apps without a separate worker/runtime
  migration task.
