# cubegin

Public Cubegin npm package for Rubik's cube tooling. It ships both the
agent-friendly `cubegin` CLI and bundled package subpaths for
TNoodle-compatible scramble generation, scramble SVG rendering, puzzle
notation/state helpers, Cubegin icon assets, and auxiliary solver helpers.

## CLI Install And Usage

Use the CLI directly with `npx`, or install it globally when you want repeated
local use:

```bash
npx cubegin@latest scramble events --json
npx cubegin@latest scramble generate 333 --count 5 --json
npx cubegin@latest scramble render 333 "R U R' U'" --json
npx cubegin@latest solver methods 333 --json
```

```bash
npm install -g cubegin

cubegin scramble events --json
cubegin scramble generate 333 --count 5 --json
```

`npx cubegin@latest install` runs the installer flow. It can install the
bundled `cubegin` agent skill globally by delegating to `npx skills add`, so
compatible agents can discover the CLI workflow from the installed skill.

## Package Install And Usage

Install `cubegin` when you want to call the scramble, renderer, puzzle, icon, or
solver APIs from JavaScript/TypeScript:

```bash
pnpm add cubegin
```

The package intentionally has no root API. Import one of the public subpaths:

```ts
import { createDefaultScrambleGenerator, createMathRandomSource } from 'cubegin/scramble-core';
import { renderScrambleImage } from 'cubegin/scramble-image';
import { WCA_EVENT_IDS } from 'cubegin/scramble-puzzle';
import { EVENT_ICON_333_SVG } from 'cubegin/icons/events';
import { solvePuzzleAssist } from 'cubegin/solver';

const generator = createDefaultScrambleGenerator({
  random: createMathRandomSource(),
});
const scramble = await generator.generate('333');
const svg = renderScrambleImage('333', scramble.scramble);
const [cross] = solvePuzzleAssist('333', ['cross'], scramble.scramble);

console.log(WCA_EVENT_IDS);
console.log(EVENT_ICON_333_SVG);
console.log(scramble.scramble);
console.log(svg);
console.log(cross.solutions[0]?.solution);
```

## Entrypoints

- `cubegin/icons` bundles the `@cubegin/icons` implementation.
- `cubegin/icons/events/svg/<eventId>.svg` exposes generated per-event SVG files.
- `cubegin/icons/brand/svg/<iconId>.svg` exposes imported brand SVG files.
- `cubegin/icons/react` exposes React components for interactive Cubegin mark animations.
- `cubegin/scramble-core` bundles the `@cubegin/scramble-core` implementation.
- `cubegin/scramble-image` bundles the `@cubegin/scramble-image` implementation.
- `cubegin/scramble-puzzle` bundles the `@cubegin/scramble-puzzle` implementation.
- `cubegin/solver` bundles the `@cubegin/solver` implementation.
- `cubegin` is the public CLI bin, emitted from `@cubegin/cli` source.

The package root is reserved and not listed in `exports`.

## Adding Entrypoints

Add a `cubegin.publicSubpath` field to the source package:

```json
{
  "cubegin": {
    "publicSubpath": "scramble-core"
  }
}
```

`pnpm --filter cubegin build` scans those markers, syncs `exports`, vendors the
source package into a temporary build tree, and emits module-split ESM under
`dist`.

## Development

```bash
pnpm --filter cubegin test
pnpm --filter cubegin typecheck
pnpm --filter cubegin build
```

## License

GPL-3.0-only. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).
