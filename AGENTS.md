# Cubegin

Cubegin is a Rubik's cube tooling monorepo for a web/H5 timer, scramble
generation, scramble visualization, and a WeChat miniprogram shell.

## Development Workflow

- Route every development task in this repository through the globally
  installed `ddev` skill. Follow DDev from orientation and requirement alignment
  through implementation, evidence, and handoff; keep mechanical edits light.
- Do not install or copy `ddev` or its module skills into this repository.
  DDev loads its modules from the global Dewey asset cache.
- Install DDev globally once, then verify the runtime:

  ```bash
  npm install -g deweyou-cli
  deweyou-cli agent update
  deweyou-cli agent init --skills ddev --mode link --global --yes
  deweyou-cli dev install
  deweyou-cli dev doctor
  ```

## Knowledge Base

| Document                                                                         | What it covers                                            |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [docs/project-structure.md](docs/project-structure.md)                           | Workspace layout, startup paths, and package roles        |
| [docs/timer-workflow.md](docs/timer-workflow.md)                                 | Web timer state flow, gestures, and timer ownership       |
| [docs/scramble-runtime.md](docs/scramble-runtime.md)                             | WCA generation packages, SVG flow, and app runtime        |
| [docs/tnoodle-baseline.md](docs/tnoodle-baseline.md)                             | TNoodle official baseline, tags, and upgrade diff flow    |
| [docs/tnoodle-implementation-notes.md](docs/tnoodle-implementation-notes.md)     | TNoodle package split, verification, and runtime boundary |
| [docs/packages/scramble-puzzle/index.md](docs/packages/scramble-puzzle/index.md) | Puzzle notation, state, and parser package boundary       |
| [docs/packages/scramble-core/index.md](docs/packages/scramble-core/index.md)     | WCA generation rules and solver package boundary          |
| [docs/packages/scramble-image/index.md](docs/packages/scramble-image/index.md)   | SVG renderer contracts and package boundary               |
| [docs/packages/icons/index.md](docs/packages/icons/index.md)                     | Cubegin icon asset and React animation boundary           |
| [docs/packages/solver/index.md](docs/packages/solver/index.md)                   | Auxiliary/full solver API and package boundary            |
| [docs/packages/player/index.md](docs/packages/player/index.md)                   | Three.js formula player package boundary                  |
| [docs/packages/cli/index.md](docs/packages/cli/index.md)                         | Public CLI, JSON contract, and bundled agent skill        |
| [docs/apps/playground/index.md](docs/apps/playground/index.md)                   | Scramble playground diagnostics and E2E role              |
| [docs/apps/scramble-docs/index.md](docs/apps/scramble-docs/index.md)             | VitePress scramble learning site ownership                |
| [docs/dependency-licensing.md](docs/dependency-licensing.md)                     | GPL boundaries for TNoodle-compatible packages            |
| [docs/.state.md](docs/.state.md)                                                 | Last memory pass and covered areas                        |
| [docs/.todo.md](docs/.todo.md)                                                   | Follow-up memory and repo hygiene tasks                   |

## Hard Constraints

- Use pnpm 10 and Node >= 22.12. Root build, test, and lint commands go through
  vite-plus (`vp`) via `pnpm build`, `pnpm test`, and `pnpm check`.
- Keep `apps/*` as entry-point applications. Shared logic belongs in
  `packages/*`.
- Keep package `src/` directories platform-agnostic: no direct DOM, Taro, or
  platform globals in reusable package code.
- The TNoodle-compatible packages port GPL `tnoodle-lib` behavior. Distribution
  licensing and any new bundled dependency must be reviewed before merging.
- Do not restore the removed `packages/scramble` cstimer wrapper or the old
  generic text-scramble API.

## Task Routing

- If you change app startup, workspace layout, or package ownership, read
  [docs/project-structure.md](docs/project-structure.md) first.
- If you change timer states, gestures, or solve-result flow, read
  [docs/timer-workflow.md](docs/timer-workflow.md) first.
- If you change WCA events, scramble generation, SVG output, or browser runtime
  behavior, read [docs/scramble-runtime.md](docs/scramble-runtime.md) first.
- If you change TNoodle-compatible scramble logic or upgrade the upstream
  compatibility target, read [docs/tnoodle-baseline.md](docs/tnoodle-baseline.md)
  and [docs/tnoodle-implementation-notes.md](docs/tnoodle-implementation-notes.md)
  first.
- If you change a specific new scramble package, read its local `AGENTS.md` and
  owner-scoped docs under `docs/packages/`.
- If you change `packages/icons`, read
  [docs/packages/icons/index.md](docs/packages/icons/index.md),
  [docs/packages/icons/DESIGN.md](docs/packages/icons/DESIGN.md), and the local
  [packages/icons/AGENTS.md](packages/icons/AGENTS.md).
- If you change `packages/solver`, read
  [docs/packages/solver/index.md](docs/packages/solver/index.md) and the local
  [packages/solver/AGENTS.md](packages/solver/AGENTS.md).
- If you change `packages/player`, read
  [docs/packages/player/index.md](docs/packages/player/index.md), the local
  [packages/player/AGENTS.md](packages/player/AGENTS.md), and
  [docs/dependency-licensing.md](docs/dependency-licensing.md).
- If you change `packages/cli`, the public `cubegin` bin, or bundled agent skill
  assets, read [docs/packages/cli/index.md](docs/packages/cli/index.md), local
  [packages/cli/AGENTS.md](packages/cli/AGENTS.md), and
  [docs/packages/core/index.md](docs/packages/core/index.md).
- If you change `apps/playground`, read
  [docs/apps/playground/index.md](docs/apps/playground/index.md) and the local
  [apps/playground/AGENTS.md](apps/playground/AGENTS.md).
- If you change `apps/scramble-docs`, read
  [docs/apps/scramble-docs/index.md](docs/apps/scramble-docs/index.md) and the
  local [apps/scramble-docs/AGENTS.md](apps/scramble-docs/AGENTS.md).
- If you add bundled dependencies, change package licenses, or alter published
  files, read [docs/dependency-licensing.md](docs/dependency-licensing.md) first.
- If you update `README.md`, update `README_ZH.md` in the same change, then run
  `pnpm sync:readmes` so `packages/core` receives the generated npm package
  copies. `pnpm test:docs` verifies this stays in sync.
- If you update repository memory, keep docs Mermaid-first, concise, and linked
  with relative paths plus `#L` anchors where useful.
