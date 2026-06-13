# cubegin

Public Cubegin npm entrypoints for TNoodle-compatible scramble generation,
scramble SVG rendering, puzzle notation/state helpers, Cubegin icon assets,
auxiliary solver helpers, and the `cubegin` CLI.

The package intentionally does not expose a root API. Import one of the
published subpaths instead:

```ts
import { createDefaultScrambleGenerator } from 'cubegin/scramble-core';
import { EVENT_ICON_333_SVG, EVENT_ICON_SVGS } from 'cubegin/icons/events';
import { BRAND_ICON_CUBEGIN_MARK_SVG } from 'cubegin/icons/brand';
import { CubeginAnimatedIcon } from 'cubegin/icons/react';
import { renderScrambleImage } from 'cubegin/scramble-image';
import { WCA_EVENT_IDS } from 'cubegin/scramble-puzzle';
import { solvePuzzleAssist } from 'cubegin/solver';
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

## CLI And Skill

```bash
npx cubegin@latest install
cubegin scramble events --json
cubegin scramble generate 333 --count 5 --json
cubegin scramble render 333 "R U R' U'" --json
cubegin solver methods 333 --json
```

`cubegin install` asks whether to install the bundled agent skill globally and
then delegates to `npx skills add <bundled-skill-path> --copy -g`.

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
