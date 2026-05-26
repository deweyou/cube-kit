# @cubekit/scramble-core

This package owns TNoodle-compatible WCA scramble generation, solver boundaries,
random sources, and unique batch generation.

## Read First

- [../../docs/packages/scramble-core/index.md](../../docs/packages/scramble-core/index.md)
- [../../docs/packages/scramble-core/wca-generation-rules.md](../../docs/packages/scramble-core/wca-generation-rules.md)
- [../../docs/tnoodle-baseline.md](../../docs/tnoodle-baseline.md)

## Verify

```bash
pnpm --filter @cubekit/scramble-core test
pnpm --filter @cubekit/scramble-core test:coverage
pnpm --filter @cubekit/scramble-core typecheck
```

## Constraints

- Keep generator behavior aligned with WCA rule tests.
- Do not wire this package into production apps without a separate worker/runtime
  migration task.
