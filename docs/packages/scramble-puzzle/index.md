# Scramble Puzzle Package

```mermaid
flowchart TD
    Events["@cubegin/shared/events event ids"] --> Registry["Puzzle registry"]
    Registry --> Parsers["Notation parsers"]
    Parsers --> States["State transitions"]
    States --> Core["@cubegin/scramble-core"]
    States --> Image["@cubegin/scramble-image"]
    States --> Cubies["FTO state / cubie boundary"]
    Cubies --> Solver["@cubegin/solver"]
```

`@cubegin/scramble-puzzle` is the shared puzzle-domain layer for the new
TNoodle-compatible packages. It owns parser contracts, solved states, move
application, and registry helpers. Event metadata lives in
`@cubegin/shared/events` and is re-exported here.

## Key Rules

- Keep this package platform-agnostic: no DOM, React, Taro, worker, or browser
  globals in `src/`.
- Event ids and puzzle routing live in
  [packages/shared/src/events/events.ts#L1](../../../packages/shared/src/events/events.ts#L1).
- Public puzzle definitions expose `parseAlgorithm`, `applyMove`,
  `applyAlgorithm`, `createSolvedState`, and `isSolved`.
- State objects should be immutable at creation boundaries where the existing
  implementation already freezes them.
- FTO exposes validated `FtoState`/`FtoCubie` conversion for solver ownership.
  The conversion rejects invalid color counts, corner orientation, and
  corner/edge parity instead of passing malformed coordinates downstream.

## Verify

```bash
pnpm --filter @cubegin/scramble-puzzle test
pnpm --filter @cubegin/scramble-puzzle test:coverage
pnpm --filter @cubegin/scramble-puzzle typecheck
```

## Key Files

- [packages/scramble-puzzle/src/index.ts#L1](../../../packages/scramble-puzzle/src/index.ts#L1) - public exports.
- [packages/scramble-puzzle/src/events.ts#L1](../../../packages/scramble-puzzle/src/events.ts#L1) - re-export of shared event metadata.
- [packages/shared/src/events/events.ts#L1](../../../packages/shared/src/events/events.ts#L1) - canonical event metadata.
- [packages/scramble-puzzle/src/puzzle-definition.ts#L1](../../../packages/scramble-puzzle/src/puzzle-definition.ts#L1) - shared puzzle interface.
- [packages/scramble-puzzle/src/fto/fto-cubie.ts#L1](../../../packages/scramble-puzzle/src/fto/fto-cubie.ts#L1) - FTO cubies, legal-state decoding, and move tables.
- [docs/packages/scramble-puzzle/wca-notation-and-state.md](wca-notation-and-state.md) - notation and state invariants.
- [docs/packages/scramble-puzzle/test-coverage.md](test-coverage.md) - coverage policy and remaining gaps.

---

_Last updated: 2026-07-27 | Reason: document the validated FTO solver state boundary_
