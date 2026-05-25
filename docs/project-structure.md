# Project Structure

```mermaid
flowchart TD
    Root["cubekit workspace"] --> Apps["apps/* entry applications"]
    Root --> Packages["packages/* reusable libraries"]
    Root --> Docs["docs/ repository memory"]
    Apps --> Web["apps/web React timer"]
    Apps --> Wx["apps/wx-app Taro shell"]
    Web --> TimerPage["TimerPage"]
    TimerPage --> TimerPkg["@cubekit/timer"]
    TimerPage --> ScramblePkg["@cubekit/scramble"]
    ScramblePkg --> Cstimer["cstimer_module"]
    Packages --> PuzzlePkg["@cubekit/scramble-puzzle"]
    Packages --> CorePkg["@cubekit/scramble-core"]
    Packages --> ImagePkg["@cubekit/scramble-image"]
    CorePkg --> PuzzlePkg
    ImagePkg --> PuzzlePkg
    CorePkg -. "not app-wired yet" .-> Apps
    ImagePkg -. "not app-wired yet" .-> Apps
```

CubeKit is organized as a pnpm workspace where apps compose reusable packages.
The web app currently carries the usable timer experience; the WeChat
miniprogram is a Taro shell waiting for feature parity.

## Directory Layout

```text
apps/web/              React 18 web/H5 app and timer UI
apps/wx-app/           Taro WeChat miniprogram shell
packages/timer/        platform-agnostic timer state and formatting
packages/scramble/     WCA scramble and SVG wrapper around cstimer_module
packages/scramble-puzzle/  TNoodle-compatible event ids, parsers, and states
packages/scramble-core/    TNoodle-compatible WCA scramble generators
packages/scramble-image/   DOM-free TNoodle-compatible SVG renderers
docs/                  repository memory and Superpowers specs/plans
scripts/               lightweight repository checks
```

## Startup Path

- Web starts at [apps/web/src/main.tsx#L1](../apps/web/src/main.tsx#L1), which
  imports the cstimer browser shim before rendering React.
- [apps/web/src/app.tsx#L1](../apps/web/src/app.tsx#L1) wraps
  [TimerPage](../apps/web/src/timer/timer-page.tsx#L14) in the app shell.
- `TimerPage` owns the page-level `scramble -> timing -> result` state and calls
  `@cubekit/timer` and `@cubekit/scramble`.
- WeChat starts from [apps/wx-app/src/app.ts#L1](../apps/wx-app/src/app.ts#L1)
  and currently renders the placeholder index page at
  [apps/wx-app/src/pages/index/index.tsx#L1](../apps/wx-app/src/pages/index/index.tsx#L1).

## Key Files

- [package.json#L7](../package.json#L7) - root scripts for dev, build, test,
  docs guard, and check.
- [pnpm-workspace.yaml#L1](../pnpm-workspace.yaml#L1) - workspace packages and
  dependency catalog.
- [vite.config.ts#L3](../vite.config.ts#L3) - root vite-plus lint and formatting
  policy.
- [apps/web/vite.config.ts#L9](../apps/web/vite.config.ts#L9) - React plugin,
  browser aliases, and jsdom test environment.
- [apps/wx-app/config/index.ts#L3](../apps/wx-app/config/index.ts#L3) - Taro
  build configuration.
- [packages/scramble-puzzle/src/index.ts#L1](../packages/scramble-puzzle/src/index.ts#L1) - TNoodle-compatible puzzle domain barrel.
- [packages/scramble-core/src/index.ts#L1](../packages/scramble-core/src/index.ts#L1) - TNoodle-compatible generator barrel.
- [packages/scramble-image/src/index.ts#L1](../packages/scramble-image/src/index.ts#L1) - TNoodle-compatible SVG renderer barrel.
- [docs/tnoodle-implementation-notes.md#L1](tnoodle-implementation-notes.md#L1) - implementation notes and upgrade routing for the new packages.

---

_Last updated: 2026-05-26 | Reason: document TNoodle-compatible package split_
