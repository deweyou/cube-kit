# @cubegin/event-icons

This package owns platform-agnostic SVG icons for WCA events.

## Read First

- [../../docs/packages/event-icons/index.md](../../docs/packages/event-icons/index.md)
- [../../docs/packages/event-icons/DESIGN.md](../../docs/packages/event-icons/DESIGN.md)
- [../../docs/packages/scramble-puzzle/index.md](../../docs/packages/scramble-puzzle/index.md)

## Verify

```bash
pnpm --filter @cubegin/event-icons test
pnpm --filter @cubegin/event-icons typecheck
pnpm --filter @cubegin/event-icons build
```

## Constraints

- Keep `src/` platform-agnostic.
- Keep icons single-color with `currentColor` and `viewBox="0 0 24 24"`.
- Keep the icon event set aligned with `WCA_EVENT_IDS`.
