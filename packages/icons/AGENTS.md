# @cubegin/icons

This package owns platform-agnostic SVG icon assets for Cubegin.

## Read First

- [../../docs/packages/icons/index.md](../../docs/packages/icons/index.md)
- [../../docs/packages/icons/DESIGN.md](../../docs/packages/icons/DESIGN.md)
- [../../docs/packages/scramble-puzzle/index.md](../../docs/packages/scramble-puzzle/index.md)

## Verify

```bash
pnpm --filter @cubegin/icons test
pnpm --filter @cubegin/icons typecheck
pnpm --filter @cubegin/icons build
```

## Constraints

- Keep `src/` platform-agnostic.
- Keep event icons single-color with `currentColor` and `viewBox="0 0 24 24"`.
- Keep React-only animation behavior isolated under `src/react`.
- Keep the event icon set aligned with `EVENT_IDS`.
