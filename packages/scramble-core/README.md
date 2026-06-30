# @cubegin/scramble-core

TNoodle-compatible scramble generation for Cubegin.

This package generates scramble strings for all supported event ids without
depending on DOM APIs or production app code. It depends on
`@cubegin/scramble-puzzle` for event metadata and shared puzzle contracts.

## Install

This package is consumed through the Cubegin pnpm workspace:

```bash
pnpm install
```

## Quick Start

```ts
import { createDefaultScrambleGenerator, createMathRandomSource } from '@cubegin/scramble-core';

const generator = createDefaultScrambleGenerator({
  random: createMathRandomSource(),
});

const three = await generator.generate('333');
const batch = await generator.generateBatch('pyram', 5);
const multiBlind = await generator.generate('333mbld', {
  multiBlindCubeCount: 3,
});

console.log(three.scramble);
console.log(batch.map((item) => item.scramble));
console.log(multiBlind.scramble.split('\n'));
```

## API Surface

- `createDefaultScrambleGenerator` creates the event generator map.
- `createScrambleGenerator` allows tests or apps to inject a custom event
  generator map.
- `generateBatch` deduplicates generated scramble strings inside one batch.
- `createMathRandomSource` adapts `Math.random` to the package `RandomSource`
  interface.
- Event-specific helpers such as `generateTwoByTwoScramble`,
  `generateSquareOneScramble`, and `generateThreeByThreeFewestMovesScramble`
  are exported for focused tests and diagnostics.

## Generation Rules Covered

- 2x2, Pyraminx, Skewb, and Square-1 reject states below their WCA minimum
  scramble distance before returning a scramble.
- 3x3, 3x3 One-Handed, and 3x3 Fewest Moves use the min2phase WCA search path.
- 3x3/4x4/5x5 blindfolded add no-inspection orientation moves.
- `333mbld` requires `multiBlindCubeCount` and returns one no-inspection 3x3
  scramble per cube, separated by newlines.
- 5x5, 6x6, 7x7, Clock, and Megaminx use the TNoodle-compatible random-turn
  families documented in the package tests.
- FTO uses legal face-turn notation over `U D F B L R BL BR`.

The baseline is TNoodle `lib-scrambles` v0.19.2, recorded in
[`../../docs/tnoodle-baseline.md`](../../docs/tnoodle-baseline.md). Cubegin is
not an official WCA scramble program.

Durable notes:

- [Core package overview](../../docs/packages/scramble-core/index.md)
- [Generation rule notes](../../docs/packages/scramble-core/wca-generation-rules.md)
- [Coverage notes](../../docs/packages/scramble-core/test-coverage.md)

## Development

```bash
pnpm --filter @cubegin/scramble-core test
pnpm --filter @cubegin/scramble-core test:coverage
pnpm --filter @cubegin/scramble-core typecheck
pnpm --filter @cubegin/scramble-core build
```

Coverage thresholds are enforced in `vite.config.ts`. Some large solver ports
retain defensive branches that are intentionally covered through public event
contracts rather than direct private-state mutation.

## License

GPL-3.0-only. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).
