# CubeKit

CubeKit is a Rubik's cube tooling monorepo for a web/H5 timer, scramble
generation, scramble visualization, and a WeChat miniprogram shell.

## Knowledge Base

| Document                                                                     | What it covers                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| [docs/project-structure.md](docs/project-structure.md)                       | Workspace layout, startup paths, and package roles        |
| [docs/timer-workflow.md](docs/timer-workflow.md)                             | Web timer state flow, gestures, and timer ownership       |
| [docs/scramble-runtime.md](docs/scramble-runtime.md)                         | cstimer wrapper, WCA events, browser shim, SVG flow       |
| [docs/tnoodle-baseline.md](docs/tnoodle-baseline.md)                         | TNoodle official baseline, tags, and upgrade diff flow    |
| [docs/tnoodle-implementation-notes.md](docs/tnoodle-implementation-notes.md) | TNoodle package split, verification, and runtime boundary |
| [docs/dependency-licensing.md](docs/dependency-licensing.md)                 | GPL boundary created by bundled cstimer_module            |
| [docs/.state.md](docs/.state.md)                                             | Last memory pass and covered areas                        |
| [docs/.todo.md](docs/.todo.md)                                               | Follow-up memory and repo hygiene tasks                   |

## Hard Constraints

- Use pnpm 10 and Node >= 22.12. Root build, test, and lint commands go through
  vite-plus (`vp`) via `pnpm build`, `pnpm test`, and `pnpm check`.
- Keep `apps/*` as entry-point applications. Shared logic belongs in
  `packages/*`.
- Keep package `src/` directories platform-agnostic: no direct DOM, Taro, or
  platform globals in reusable package code.
- `@cubekit/scramble` bundles GPL-3.0 `cstimer_module`; distribution licensing
  and any new bundled dependency must be reviewed before merging.
- Do not restore the old generic text-scramble API in `packages/scramble`; that
  package is now the WCA scramble and SVG wrapper.

## Task Routing

- If you change app startup, workspace layout, or package ownership, read
  [docs/project-structure.md](docs/project-structure.md) first.
- If you change timer states, gestures, or solve-result flow, read
  [docs/timer-workflow.md](docs/timer-workflow.md) first.
- If you change WCA events, scramble generation, SVG output, cstimer integration,
  or browser runtime behavior, read [docs/scramble-runtime.md](docs/scramble-runtime.md)
  first.
- If you change TNoodle-compatible scramble logic or upgrade the upstream
  compatibility target, read [docs/tnoodle-baseline.md](docs/tnoodle-baseline.md)
  and [docs/tnoodle-implementation-notes.md](docs/tnoodle-implementation-notes.md)
  first.
- If you add bundled dependencies, change package licenses, or alter published
  files, read [docs/dependency-licensing.md](docs/dependency-licensing.md) first.
- If you update repository memory, keep docs Mermaid-first, concise, and linked
  with relative paths plus `#L` anchors where useful.
