# Scramble Docs Site Design

## Goal

Create `apps/scramble-docs`, a VitePress-based bilingual learning website that
explains WCA scramble generation and scramble image rendering using the current
TNoodle/CubeKit context.

## Scope

The first version is a static content site. It does not embed runtime scramble
generation or SVG-preview widgets; interactive validation remains owned by
`apps/playground`.

The site must include:

- Chinese and English content with matching page structure.
- A clear disclaimer that CubeKit is not an official WCA scramble program and
  competitions must use the current official WCA program.
- Source links to WCA Regulations, TNoodle baseline records, and CubeKit package
  docs.
- Mermaid diagrams where useful to explain pipelines.
- A package-boundary explanation for `scramble-puzzle`, `scramble-core`, and
  `scramble-image`.

## Information Architecture

```text
apps/scramble-docs/
├── package.json
├── docs/
│   ├── .vitepress/config.mts
│   ├── index.md
│   ├── zh/
│   │   ├── index.md
│   │   ├── wca-rules.md
│   │   ├── generation.md
│   │   ├── state-transition.md
│   │   ├── image-rendering.md
│   │   └── cubekit-packages.md
│   └── en/
│       ├── index.md
│       ├── wca-rules.md
│       ├── generation.md
│       ├── state-transition.md
│       ├── image-rendering.md
│       └── cubekit-packages.md
└── tsconfig.json
```

Root `index.md` redirects readers to the language choices and explains the
site's learning role. `zh` is the default locale, with `en` as the English
locale.

## Content Model

Each locale covers the same six pages:

1. Overview: WCA, TNoodle, and CubeKit relationship.
2. WCA Rules: Regulation 4b3, random-state expectations, and event-specific
   minimum-distance exceptions.
3. Generation: event dispatch, random sources, random-state solvers,
   random-turn generators, no-inspection BLD orientation moves, and `333mbld`.
4. State Transition: why parsers and state transitions are shared capabilities,
   and how text becomes typed moves and immutable puzzle state.
5. Image Rendering: parse/apply/render pipeline from scramble text to SVG.
6. CubeKit Packages: boundaries, tests, coverage, docs, and follow-up migration
   notes.

Content should teach principles and map them to local implementation files rather
than copying large code blocks.

## Architecture

`apps/scramble-docs` is a standalone workspace app using VitePress. It should
not depend on `@cubekit/scramble-*` packages at runtime. Local implementation
references are Markdown links to source and docs files.

Root scripts:

- `pnpm dev:scramble-docs`
- `pnpm build:scramble-docs`

Package scripts:

- `pnpm --filter scramble-docs dev`
- `pnpm --filter scramble-docs build`
- `pnpm --filter scramble-docs preview`

## Verification

Required checks:

- `pnpm --filter scramble-docs build`
- `pnpm build:scramble-docs`
- `pnpm test:docs`

Docs memory should be updated because this adds a new app and durable knowledge
route. Package/test CI does not need to run for this app, because it is under
`apps/*` and intentionally outside the package-only workflow.

## Non-Goals

- No interactive scramble generator.
- No playground replacement.
- No app production integration.
- No new package API.
- No claim of official WCA scramble-program status.

## Sources

- WCA Regulations: <https://www.worldcubeassociation.org/regulations/>
- WCA Scrambles page and CubeKit baseline:
  [docs/tnoodle-baseline.md](../../tnoodle-baseline.md)
- TNoodle implementation notes:
  [docs/tnoodle-implementation-notes.md](../../tnoodle-implementation-notes.md)

## Self-Review

- No placeholders remain.
- Scope is a single static VitePress app.
- Interactive examples are explicitly out of scope.
- The bilingual page set is symmetric.
- The official-WCA disclaimer is required on overview and rules pages.
