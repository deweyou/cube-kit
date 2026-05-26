# @cubekit/scramble-image

This package owns DOM-free SVG rendering for scramble states.

## Read First

- [../../docs/packages/scramble-image/index.md](../../docs/packages/scramble-image/index.md)
- [../../docs/packages/scramble-image/renderer-contracts.md](../../docs/packages/scramble-image/renderer-contracts.md)
- [../../docs/tnoodle-baseline.md](../../docs/tnoodle-baseline.md)

## Verify

```bash
pnpm --filter @cubekit/scramble-image test
pnpm --filter @cubekit/scramble-image test:coverage
pnpm --filter @cubekit/scramble-image typecheck
```

## Constraints

- Keep renderers DOM-free.
- Escape SVG attributes and text through the shared serializer.
