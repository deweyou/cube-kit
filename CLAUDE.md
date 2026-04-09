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
- **Feature specs**: [knowledge/specs/](knowledge/specs/)

> Scripts and templates are managed by harness-dev at `knowledge/.scripts/` — do not edit manually.
> Topic-specific knowledge files (e.g. `knowledge/design-tokens.md`) are added here by the archive step when generalizable patterns are discovered.

- **Cube Move Engine Validation**: [knowledge/cube-move-engine.md](knowledge/cube-move-engine.md)
- **WCA Scramble Rules**: [knowledge/wca-scramble-rules.md](knowledge/wca-scramble-rules.md)

## Active Technologies

- TypeScript 5.x (strict mode, `verbatimModuleSyntax`) + none (zero runtime dependencies — all algorithms implemented in TypeScript) (20260409-scramble-generator-and-visualizer)

## Recent Changes

- 20260409-scramble-generator-and-visualizer: Added TypeScript 5.x (strict mode, `verbatimModuleSyntax`) + none (zero runtime dependencies — all algorithms implemented in TypeScript)
