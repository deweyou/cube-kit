# @cubegin/scramble-puzzle

This package owns TNoodle-compatible notation parsers, puzzle state transitions,
and registry helpers. Event metadata lives in `@cubegin/shared/events` and is
re-exported here for compatibility.

## Read First

- [../../docs/packages/scramble-puzzle/index.md](../../docs/packages/scramble-puzzle/index.md)
- [../../docs/packages/scramble-puzzle/wca-notation-and-state.md](../../docs/packages/scramble-puzzle/wca-notation-and-state.md)
- [../../docs/tnoodle-baseline.md](../../docs/tnoodle-baseline.md)

## Verify

```bash
pnpm --filter @cubegin/scramble-puzzle test
pnpm --filter @cubegin/scramble-puzzle test:coverage
pnpm --filter @cubegin/scramble-puzzle typecheck
```

## Constraints

- Keep `src/` platform-agnostic.
- Do not change event ids, puzzle routing, or notation semantics without
  updating the package docs and coverage notes.
