# cubegin

This package is the public npm aggregation package for Cubegin scramble tooling.

## Commands

```bash
pnpm --filter cubegin test
pnpm --filter cubegin typecheck
pnpm --filter cubegin build
```

## Ownership

- Keep `cubegin` root imports private by omitting `"."` from `exports`.
- Only expose package subpaths that map to reusable packages in `packages/*`.
- Start with `cubegin/scramble-core`, `cubegin/scramble-image`, and
  `cubegin/scramble-puzzle`.
- Add future public paths by setting `cubegin.publicSubpath` in the source
  package's own `package.json`; do not hard-code package names in core.
- Build this package as a bundled distribution boundary. The published package
  must not require unpublished `@cubegin/*` packages at runtime.
- Do not copy implementation logic from the source packages into
  `packages/core`; `scripts/build.mjs` vendors marked source packages into a
  temporary `.build` tree and lets `vp pack` emit module-split ESM.
- Preserve GPL-3.0-only licensing while any exposed subpath re-exports
  TNoodle-compatible packages.
