# Scramble Playground

This app is a developer workbench for testing `@cubekit/scramble-core` and
`@cubekit/scramble-image` together.

## Read First

- [../../docs/apps/playground/index.md](../../docs/apps/playground/index.md)
- [../../docs/apps/playground/diagnostics-and-e2e.md](../../docs/apps/playground/diagnostics-and-e2e.md)
- [../../docs/packages/scramble-core/index.md](../../docs/packages/scramble-core/index.md)
- [../../docs/packages/scramble-image/index.md](../../docs/packages/scramble-image/index.md)

## Verify

```bash
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
```

## Constraints

- This app is not a production migration target.
- Keep deterministic smoke paths working with `?seed=<integer>`.
