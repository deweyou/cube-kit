# Scramble Playground

Developer playground for the new TNoodle-compatible scramble packages.

The app is intentionally separate from production `apps/web` and `apps/wx-app`.
It exists to manually and automatically exercise `@cubegin/scramble-core` and
`@cubegin/scramble-image` while the migration is still package-scoped.

## Run

```bash
pnpm dev:playground
```

Open the printed local Vite URL. For deterministic browser smoke and future E2E
runs, add a seed:

```text
http://localhost:5173/?seed=42
```

## What It Covers

- event selection across all supported event ids.
- Batch generation through `scramble-core`.
- `333mbld` cube count and one displayed row per cube.
- SVG preview and manual render through `scramble-image`.
- Lightweight generation/render diagnostics: count, duration, scramble length,
  and SVG byte size.
- Copy scrambles and download the selected SVG for manual inspection.

## Development

```bash
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
```

The build prepares the three package dependencies first, so it is a useful local
smoke test for package export shape.

Durable notes:

- [Playground knowledge](../../docs/apps/playground/index.md)
- [Diagnostics and E2E guidance](../../docs/apps/playground/diagnostics-and-e2e.md)

## License

GPL-3.0-only under the repository license.
