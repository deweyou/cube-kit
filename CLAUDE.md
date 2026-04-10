# CubeKit

A Rubik's cube tooling monorepo with timer, scramble generator, scramble visualizer, algorithm list, and practice apps — targeting web, H5, and WeChat miniprogram.

## Commands

```bash
pnpm dev:web       # Start web dev server
pnpm dev:wx        # Start WeChat miniprogram dev server
pnpm build         # Build all apps (vp run build -r)
pnpm test          # Run all tests (vp run test -r)
pnpm check         # Lint + format check (vp check)
```

## Harness Development

Context and knowledge base for AI-assisted development:

- **Constitution** (project principles): [knowledge/constitution.md](knowledge/constitution.md)
- **Feature specs index**: [knowledge/specs/index.md](knowledge/specs/index.md)
- **Dependency licensing** (bundle + license audit flow): [knowledge/dependency-licensing.md](knowledge/dependency-licensing.md)

> Scripts and templates are managed by harness-dev at `knowledge/.scripts/` — do not edit manually.
> Topic-specific knowledge files under `knowledge/` are added by the archive step when generalizable patterns are discovered.

## Active Technologies

- **Monorepo**: pnpm 10 workspaces (`apps/*` + `packages/*`), `vite-plus` (`vp`) for build/test/lint
- **Language**: TypeScript 5.x strict, `module: preserve`, `moduleResolution: bundler`, `verbatimModuleSyntax: true`
- **Apps**: React 18 (web/H5), Taro (WeChat miniprogram)
- **Packages**: `@cubekit/scramble` — WCA scramble + SVG preview backed by `cstimer_module@^0.1.5` (bundled, GPL-3.0 — see package CLAUDE.md)
