# Project Structure

```mermaid
flowchart TD
    Root["cubegin workspace"] --> Apps["apps/* entry applications"]
    Root --> Packages["packages/* reusable libraries"]
    Root --> Docs["docs/ repository memory"]
    Root --> Ci[".github/workflows package CI"]
    Apps --> Web["apps/web React timer"]
    Apps --> Playground["apps/playground scramble test workbench"]
    Apps --> ScrambleDocs["apps/scramble-docs VitePress learning site"]
    Apps --> Wx["apps/wx-app Taro shell"]
    Web --> TimerPage["TimerPage"]
    TimerPage --> SharedTimer["@cubegin/shared/timer"]
    TimerPage --> SharedTimerSession["@cubegin/shared/timer-session"]
    Packages --> PublicCore["cubegin npm package"]
    Packages --> SharedPkg["@cubegin/shared"]
    Packages --> PuzzlePkg["@cubegin/scramble-puzzle"]
    Packages --> CorePkg["@cubegin/scramble-core"]
    Packages --> ImagePkg["@cubegin/scramble-image"]
    Packages --> IconsPkg["@cubegin/icons"]
    Packages --> SolverPkg["@cubegin/solver"]
    Packages --> CliPkg["@cubegin/cli"]
    PublicCore --> IconPath["cubegin/icons"]
    PublicCore --> CorePath["cubegin/scramble-core"]
    PublicCore --> ImagePath["cubegin/scramble-image"]
    PublicCore --> PuzzlePath["cubegin/scramble-puzzle"]
    PublicCore --> SolverPath["cubegin/solver"]
    PublicCore --> Bin["cubegin bin"]
    PublicCore --> Skills["bundled skills/cubegin"]
    CorePath --> CorePkg
    ImagePath --> ImagePkg
    PuzzlePath --> PuzzlePkg
    IconPath --> IconsPkg
    SolverPath --> SolverPkg
    Bin --> CliPkg
    Skills --> CliSkill["skills/cubegin/SKILL.md"]
    SharedPkg --> SharedWca["shared/wca"]
    SharedPkg --> SharedTimer
    SharedPkg --> SharedTimerSession
    CorePkg --> SharedPkg
    CorePkg --> PuzzlePkg
    ImagePkg --> SharedPkg
    ImagePkg --> PuzzlePkg
    SolverPkg --> PuzzlePkg
    PuzzlePkg --> SharedPkg
    CliPkg --> CorePkg
    CliPkg --> ImagePkg
    CliPkg --> PuzzlePkg
    CliPkg --> SolverPkg
    TimerPage --> SharedPkg
    TimerPage --> CorePkg
    TimerPage --> ImagePkg
    Playground --> CorePkg
    Playground --> ImagePkg
    Playground --> PuzzlePkg
    Playground --> SharedPkg
    Playground --> SolverPkg
    ScrambleDocs --> CorePkg
    ScrambleDocs --> ImagePkg
    ScrambleDocs --> Docs
    Ci --> PackageBuild["packages build job"]
    Ci --> PackageTest["packages test job"]
    PackageBuild --> Packages
    PackageTest --> Packages
```

Cubegin is organized as a pnpm workspace where apps compose reusable packages.
The web app currently carries the usable timer experience; the WeChat
miniprogram is a Taro shell waiting for feature parity.

## Directory Layout

```text
apps/web/              React 18 web/H5 app and timer UI
apps/playground/       React scramble generator/image testing workbench
apps/scramble-docs/    VitePress bilingual scramble learning site
apps/wx-app/           Taro WeChat miniprogram shell
packages/shared/       platform-agnostic WCA constants, timer state, and session rules
packages/core/         public cubegin npm package subpath exports
packages/scramble-puzzle/  TNoodle-compatible parsers, puzzle states, and registry helpers
packages/scramble-core/    TNoodle-compatible WCA scramble generators
packages/scramble-image/   DOM-free TNoodle-compatible SVG renderers
packages/icons/            Platform-agnostic Cubegin SVG icon assets
packages/solver/           platform-agnostic auxiliary and full solver helpers
packages/cli/              Source package for the public cubegin CLI
skills/                    Agent skills copied into the public cubegin package
docs/                  repository memory and Superpowers specs/plans
docs/packages/         package-scoped knowledge for new scramble packages
docs/apps/             app-scoped knowledge for playground and docs apps
scripts/               lightweight repository checks
.github/workflows/     GitHub Actions workflows
```

## README Distribution

`README.md` and `README_ZH.md` in the repository root are the only hand-edited
public README sources. The public npm package copies are generated at
`packages/core/README.md` and `packages/core/README_ZH.md` by
`pnpm sync:readmes`; `pnpm test:docs` fails when the copies drift.
`packages/core/scripts/build.mjs` also syncs both files before packing so the
published `cubegin` package includes the current English and Chinese README
files.

When changing the English README, update `README_ZH.md` in the same change and
rerun the sync script.

## Startup Path

- Web starts at [apps/web/src/main.tsx#L1](../apps/web/src/main.tsx#L1), which
  renders React without the removed cstimer browser shim.
- [apps/web/src/app.tsx#L1](../apps/web/src/app.tsx#L1) wraps
  [TimerPage](../apps/web/src/timer/timer-page.tsx#L14) in the app shell.
- `TimerPage` owns the page-level `scramble -> timing -> result` state, uses
  IndexedDB for web solve persistence, and calls `@cubegin/shared/timer`,
  `@cubegin/shared/timer-session`, `@cubegin/scramble-core`, and
  `@cubegin/scramble-image`.
- Playground starts with `pnpm dev:playground` at
  [apps/playground/src/main.tsx#L1](../apps/playground/src/main.tsx#L1). Its
  [App](../apps/playground/src/app.tsx#L1) calls the new `scramble-core`,
  `scramble-image`, and `solver` packages through
  [usePlayground](../apps/playground/src/playground/use-playground.ts#L1).
- The playground Icons tab consumes `@cubegin/icons` to inspect brand SVG
  assets, animated React components, and WCA event SVG assets from one UI
  surface.
- Scramble Docs starts with `pnpm dev:scramble-docs` at
  [apps/scramble-docs/docs/index.md#L1](../apps/scramble-docs/docs/index.md#L1).
  Its [VitePress config](../apps/scramble-docs/docs/.vitepress/config.mts#L1)
  owns bilingual routing and Mermaid diagram rendering.
- WeChat starts from [apps/wx-app/src/app.ts#L1](../apps/wx-app/src/app.ts#L1)
  and currently renders the placeholder index page at
  [apps/wx-app/src/pages/index/index.tsx#L1](../apps/wx-app/src/pages/index/index.tsx#L1).
- The public CLI is published as the `cubegin` bin from
  [packages/core/package.json#L1](../packages/core/package.json#L1). Its source
  lives in [packages/cli/src/index.ts#L1](../packages/cli/src/index.ts#L1), and
  `cubegin install` forwards the bundled
  [skills/cubegin/SKILL.md#L1](../skills/cubegin/SKILL.md#L1) path to
  `npx skills add ... --copy -g`.

## Key Files

- [package.json#L7](../package.json#L7) - root scripts for dev, build, test,
  docs guard, README sync, and check.
- [README.md#L1](../README.md#L1) and
  [README_ZH.md#L1](../README_ZH.md#L1) - canonical public README sources.
- [scripts/sync-package-readmes.mjs#L1](../scripts/sync-package-readmes.mjs#L1) -
  syncs canonical README files into `packages/core` for npm publishing.
- [pnpm-workspace.yaml#L1](../pnpm-workspace.yaml#L1) - workspace packages and
  dependency catalog.
- [.github/workflows/packages.yml#L1](../.github/workflows/packages.yml#L1) -
  package-only CI build and test jobs.
- [vite.config.ts#L3](../vite.config.ts#L3) - root vite-plus lint and formatting
  policy.
- [apps/web/vite.config.ts#L9](../apps/web/vite.config.ts#L9) - React plugin,
  browser aliases, and jsdom test environment.
- [apps/playground/vite.config.ts#L1](../apps/playground/vite.config.ts#L1) - React plugin and source aliases for testing the new scramble packages.
- [apps/playground/src/playground/playground-service.ts#L1](../apps/playground/src/playground/playground-service.ts#L1) - adapter boundary around generator and renderer package calls.
- [apps/scramble-docs/docs/.vitepress/config.mts#L1](../apps/scramble-docs/docs/.vitepress/config.mts#L1) - VitePress locale routing and Mermaid fence conversion.
- [docs/apps/scramble-docs/index.md#L1](apps/scramble-docs/index.md#L1) - scramble docs app ownership and verification.
- [apps/wx-app/config/index.ts#L3](../apps/wx-app/config/index.ts#L3) - Taro
  build configuration.
- [apps/web/package.json#L7](../apps/web/package.json#L7) - web scripts build workspace dependencies before dev, test, typecheck, and build.
- [packages/shared/src/wca/index.ts#L1](../packages/shared/src/wca/index.ts#L1) - shared WCA event metadata barrel.
- [packages/shared/src/timer/index.ts#L1](../packages/shared/src/timer/index.ts#L1) - platform-agnostic timer state and formatting barrel.
- [packages/shared/src/timer-session/index.ts#L1](../packages/shared/src/timer-session/index.ts#L1) - platform-agnostic solve/session rule barrel.
- [packages/scramble-puzzle/src/index.ts#L1](../packages/scramble-puzzle/src/index.ts#L1) - TNoodle-compatible puzzle domain barrel.
- [packages/scramble-core/src/index.ts#L1](../packages/scramble-core/src/index.ts#L1) - TNoodle-compatible generator barrel.
- [packages/scramble-image/src/index.ts#L1](../packages/scramble-image/src/index.ts#L1) - TNoodle-compatible SVG renderer barrel.
- [packages/icons/src/index.ts#L1](../packages/icons/src/index.ts#L1) - platform-agnostic Cubegin icon asset barrel.
- [packages/core/package.json#L1](../packages/core/package.json#L1) - public
  `cubegin` npm package with subpath exports, CLI bin, and bundled skills.
- [packages/solver/src/index.ts#L1](../packages/solver/src/index.ts#L1) - auxiliary and full solver barrel.
- [packages/cli/src/index.ts#L1](../packages/cli/src/index.ts#L1) - public CLI command tree.
- [skills/cubegin/SKILL.md#L1](../skills/cubegin/SKILL.md#L1) - agent-facing CLI usage skill.
- [docs/packages/core/index.md#L1](packages/core/index.md#L1) - public package
  ownership, subpaths, and verification.
- [docs/packages/scramble-puzzle/index.md#L1](packages/scramble-puzzle/index.md#L1) - puzzle package ownership and verification.
- [docs/packages/scramble-core/index.md#L1](packages/scramble-core/index.md#L1) - core generator ownership and verification.
- [docs/packages/scramble-image/index.md#L1](packages/scramble-image/index.md#L1) - image renderer ownership and verification.
- [docs/packages/icons/index.md#L1](packages/icons/index.md#L1) - icon asset ownership and verification.
- [docs/packages/solver/index.md#L1](packages/solver/index.md#L1) - solver package ownership and verification.
- [docs/packages/cli/index.md#L1](packages/cli/index.md#L1) - CLI ownership, JSON contract, and skill install boundary.
- [docs/apps/playground/index.md#L1](apps/playground/index.md#L1) - playground ownership and diagnostics role.
- [docs/tnoodle-implementation-notes.md#L1](tnoodle-implementation-notes.md#L1) - implementation notes and upgrade routing for the new packages.

---

_Last updated: 2026-06-13 | Reason: record README sync and bilingual npm package distribution_
