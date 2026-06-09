# cubegin

Public Cubegin npm entrypoints for TNoodle-compatible scramble generation,
scramble SVG rendering, puzzle notation/state helpers, and Cubegin icon assets.

The package intentionally does not expose a root API. Import one of the
published subpaths instead:

```ts
import { createDefaultScrambleGenerator } from 'cubegin/scramble-core';
import { EVENT_ICON_333_SVG, EVENT_ICON_SVGS } from 'cubegin/icons/events';
import { BRAND_ICON_CUBEGIN_MARK_SVG } from 'cubegin/icons/brand';
import { CubeginAnimatedIcon } from 'cubegin/icons/react';
import { renderScrambleImage } from 'cubegin/scramble-image';
import { WCA_EVENT_IDS } from 'cubegin/scramble-puzzle';
```

## Entrypoints

- `cubegin/icons` bundles the `@cubegin/icons` implementation.
- `cubegin/icons/events/svg/<eventId>.svg` exposes generated per-event SVG files.
- `cubegin/icons/brand/svg/<iconId>.svg` exposes imported brand SVG files.
- `cubegin/icons/react` exposes React components for interactive Cubegin mark animations.
- `cubegin/scramble-core` bundles the `@cubegin/scramble-core` implementation.
- `cubegin/scramble-image` bundles the `@cubegin/scramble-image` implementation.
- `cubegin/scramble-puzzle` bundles the `@cubegin/scramble-puzzle` implementation.

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
