# cubegin

Public Cubegin npm entrypoints for TNoodle-compatible scramble generation,
scramble SVG rendering, and puzzle notation/state helpers.

The package intentionally does not expose a root API. Import one of the
published subpaths instead:

```ts
import { createDefaultScrambleGenerator } from 'cubegin/scramble-core';
import { renderScrambleImage } from 'cubegin/scramble-image';
import { WCA_EVENT_IDS } from 'cubegin/scramble-puzzle';
```

## Entrypoints

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
