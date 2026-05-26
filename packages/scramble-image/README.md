# @cubekit/scramble-image

DOM-free SVG rendering for TNoodle-compatible scramble states.

This package parses a WCA scramble through `@cubekit/scramble-puzzle`, applies it
to a solved puzzle state, and renders a standalone SVG string. It is intended for
tests, diagnostics, playground previews, and future worker-backed app flows.

## Install

This package is consumed through the CubeKit pnpm workspace:

```bash
pnpm install
```

## Quick Start

```ts
import { renderScrambleImage } from '@cubekit/scramble-image';

const svg = renderScrambleImage('333', "R U R' U' F2");

console.log(svg.startsWith('<svg'));
```

## API Surface

- `renderScrambleImage(eventId, scramble)` dispatches WCA event ids to the right
  puzzle parser and renderer.
- `renderCubeNet`, `renderClockState`, `renderMegaminxState`,
  `renderPyraminxState`, `renderSkewbState`, and `renderSquareOneState` are
  exported for focused renderer tests.
- `createSvgDocument`, `rect`, `path`, `circle`, `text`, and `group` expose the
  small internal SVG builder used by all renderers.
- Color scheme types are exported where a renderer supports custom colors.

## Rendering Contract

- The package returns SVG strings only; it never touches `document`, canvas, or
  framework APIs.
- Invalid scramble syntax surfaces through `@cubekit/scramble-puzzle` parser
  errors.
- Cube-family events render as unfolded cube nets; non-cube events render their
  TNoodle-compatible puzzle-specific layouts.
- `333mbld` is renderable as a 3x3 net when a single selected scramble line is
  passed to `renderScrambleImage`.

The baseline is TNoodle `lib-scrambles` v0.19.2, recorded in
[`../../docs/tnoodle-baseline.md`](../../docs/tnoodle-baseline.md). CubeKit is
not an official WCA scramble program.

Durable notes:

- [Image package overview](../../docs/packages/scramble-image/index.md)
- [Renderer contracts](../../docs/packages/scramble-image/renderer-contracts.md)
- [Coverage notes](../../docs/packages/scramble-image/test-coverage.md)

## Development

```bash
pnpm --filter @cubekit/scramble-image test
pnpm --filter @cubekit/scramble-image test:coverage
pnpm --filter @cubekit/scramble-image typecheck
pnpm --filter @cubekit/scramble-image build
```

Coverage thresholds are enforced in `vite.config.ts` and focus on parser/render
dispatch plus SVG-level renderer output.

## License

GPL-3.0-only. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).
