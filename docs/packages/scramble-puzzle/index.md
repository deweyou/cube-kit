# Scramble Puzzle Package

```mermaid
flowchart TD
    Events["WCA event ids"] --> Registry["Puzzle registry"]
    Registry --> Parsers["Notation parsers"]
    Parsers --> States["State transitions"]
    States --> Core["@cubekit/scramble-core"]
    States --> Image["@cubekit/scramble-image"]
```

`@cubekit/scramble-puzzle` is the shared puzzle-domain layer for the new
TNoodle-compatible packages. It owns WCA event metadata, parser contracts, solved
states, move application, and registry helpers.

## Key Rules

- Keep this package platform-agnostic: no DOM, React, Taro, worker, or browser
  globals in `src/`.
- WCA ids and puzzle routing live in
  [packages/scramble-puzzle/src/events.ts#L1](../../../packages/scramble-puzzle/src/events.ts#L1).
- Public puzzle definitions expose `parseAlgorithm`, `applyMove`,
  `applyAlgorithm`, `createSolvedState`, and `isSolved`.
- State objects should be immutable at creation boundaries where the existing
  implementation already freezes them.

## Verify

```bash
pnpm --filter @cubekit/scramble-puzzle test
pnpm --filter @cubekit/scramble-puzzle test:coverage
pnpm --filter @cubekit/scramble-puzzle typecheck
```

## Key Files

- [packages/scramble-puzzle/src/index.ts#L1](../../../packages/scramble-puzzle/src/index.ts#L1) - public exports.
- [packages/scramble-puzzle/src/puzzle-definition.ts#L1](../../../packages/scramble-puzzle/src/puzzle-definition.ts#L1) - shared puzzle interface.
- [docs/packages/scramble-puzzle/wca-notation-and-state.md](wca-notation-and-state.md) - notation and state invariants.
- [docs/packages/scramble-puzzle/test-coverage.md](test-coverage.md) - coverage policy and remaining gaps.

---

_Last updated: 2026-05-26 | Reason: add package-scoped knowledge for scramble-puzzle_
