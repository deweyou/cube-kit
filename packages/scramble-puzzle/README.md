# @cubegin/scramble-puzzle

Puzzle notation, parser, state-transition, and event metadata for Cubegin's
TNoodle-compatible scramble packages.

This package is the shared foundation for `@cubegin/scramble-core` and
`@cubegin/scramble-image`. It owns the meaning of a move string, how that move
changes a puzzle state, and which event ids map to which puzzle family.

## Install

This package is consumed through the Cubegin pnpm workspace:

```bash
pnpm install
```

## Quick Start

```ts
import { EVENT_IDS, createCubeDefinition } from '@cubegin/scramble-puzzle';

const cube = createCubeDefinition(3, ['333']);
const solved = cube.createSolvedState();
const afterSexyMove = cube.applyAlgorithm(solved, "R U R' U'");

console.log(EVENT_IDS);
console.log(cube.isSolved(afterSexyMove));
```

## API Surface

- `EVENT_IDS`, `EVENT_INFO`, `EventId`, and `PuzzleId` describe the
  18 supported event ids.
- `splitAlgorithm` and `applyAlgorithm` provide common algorithm sequencing.
- `createCubeDefinition`, `createClockDefinition`, `createMegaminxDefinition`,
  `createPyraminxDefinition`, `createSkewbDefinition`, `createSquareOneDefinition`,
  and `createFtoDefinition` expose puzzle-specific parser/state contracts.
- Puzzle-specific parser and state helpers are exported for targeted tests and
  renderer integration.
- `./test-support` exports TNoodle fixture helpers for package tests only.

## WCA And TNoodle Scope

The package follows the TNoodle `lib-scrambles` v0.19.2 behavior captured in
[`../../docs/tnoodle-baseline.md`](../../docs/tnoodle-baseline.md). It is not an
official WCA scramble program; official competitions must use the current WCA
scramble program.

Durable notes:

- [Puzzle package overview](../../docs/packages/scramble-puzzle/index.md)
- [WCA notation and state contracts](../../docs/packages/scramble-puzzle/wca-notation-and-state.md)
- [Coverage notes](../../docs/packages/scramble-puzzle/test-coverage.md)

## Development

```bash
pnpm --filter @cubegin/scramble-puzzle test
pnpm --filter @cubegin/scramble-puzzle test:coverage
pnpm --filter @cubegin/scramble-puzzle typecheck
pnpm --filter @cubegin/scramble-puzzle build
```

Coverage thresholds are enforced in `vite.config.ts` and are intentionally tied
to WCA parser/state behavior rather than snapshot-only assertions.

## License

GPL-3.0-only. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).
