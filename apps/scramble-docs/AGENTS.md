# Scramble Docs

This app is the bilingual VitePress learning site for WCA scramble generation
and scramble image rendering principles.

## Read First

- [../../docs/apps/scramble-docs/index.md](../../docs/apps/scramble-docs/index.md)
- [../../docs/tnoodle-baseline.md](../../docs/tnoodle-baseline.md)
- [../../docs/tnoodle-implementation-notes.md](../../docs/tnoodle-implementation-notes.md)
- [../../docs/packages/scramble-core/index.md](../../docs/packages/scramble-core/index.md)
- [../../docs/packages/scramble-image/index.md](../../docs/packages/scramble-image/index.md)

## Verify

```bash
pnpm --filter scramble-docs build
pnpm build:scramble-docs
```

## Constraints

- Keep the site content-only unless the user explicitly asks for runtime demos.
- Keep Chinese and English navigation in sync.
- Cite WCA and TNoodle/CubeKit boundaries instead of presenting this app as an
  official WCA scramble program.
