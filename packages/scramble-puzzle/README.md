# @cubekit/scramble-puzzle

Puzzle notation, parser, state-transition, and WCA event metadata for CubeKit's
TNoodle-compatible scramble packages.

This package is the shared foundation for `@cubekit/scramble-core` and
`@cubekit/scramble-image`. It owns the meaning of a move string, how that move
changes a puzzle state, and which WCA event ids map to which puzzle family.

## Install

This package is consumed through the CubeKit pnpm workspace:

```bash
pnpm install
```

## Quick Start

```ts
import { WCA_EVENT_IDS, createCubeDefinition } from '@cubekit/scramble-puzzle';

const cube = createCubeDefinition(3, ['333']);
const solved = cube.createSolvedState();
const afterSexyMove = cube.applyAlgorithm(solved, "R U R' U'");

console.log(WCA_EVENT_IDS);
console.log(cube.isSolved(afterSexyMove));
```

## API Surface

- `WCA_EVENT_IDS`, `WCA_EVENT_INFO`, `WcaEventId`, and `PuzzleId` describe the
  17 supported WCA event ids.
- `splitAlgorithm` and `applyAlgorithm` provide common algorithm sequencing.
- `createCubeDefinition`, `createClockDefinition`, `createMegaminxDefinition`,
  `createPyraminxDefinition`, `createSkewbDefinition`, and
  `createSquareOneDefinition` expose puzzle-specific parser/state contracts.
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
pnpm --filter @cubekit/scramble-puzzle test
pnpm --filter @cubekit/scramble-puzzle test:coverage
pnpm --filter @cubekit/scramble-puzzle typecheck
pnpm --filter @cubekit/scramble-puzzle build
```

Coverage thresholds are enforced in `vite.config.ts` and are intentionally tied
to WCA parser/state behavior rather than snapshot-only assertions.

## License

GPL-3.0-only. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).
