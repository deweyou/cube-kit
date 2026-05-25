# TNoodle Implementation Notes

```mermaid
flowchart TD
    Puzzle["packages/scramble-puzzle"] --> Core["packages/scramble-core"]
    Puzzle --> Image["packages/scramble-image"]
    Baseline["TNoodle baseline"] --> Puzzle
    Baseline --> Core
    Baseline --> Image
    Core -. "not app-wired yet" .-> Apps["apps/*"]
    Image -. "not app-wired yet" .-> Apps
```

CubeKit now has standalone TypeScript packages for TNoodle-compatible puzzle
notation/state, scramble generation, and SVG rendering. Apps still import the
existing `@cubekit/scramble` package in this implementation.

## Implemented Packages

- `packages/scramble-puzzle` owns WCA event metadata, puzzle registries,
  notation parsers, state transitions, and shared fixture helpers.
- `packages/scramble-core` owns random sources, batch uniqueness, WCA event
  generator dispatch, and the solver/random-turn implementations.
- `packages/scramble-image` owns DOM-free SVG serialization and WCA event
  renderer dispatch.

## Baseline

See [docs/tnoodle-baseline.md](tnoodle-baseline.md). The implementation tracks
TNoodle-WCA `1.2.3`, `thewca/tnoodle` `v1.2.3`, and `thewca/tnoodle-lib`
`v0.19.2`.

## Verification

Core package verification commands used during the implementation:

- `pnpm --filter @cubekit/scramble-puzzle test`
- `pnpm --filter @cubekit/scramble-core test`
- `pnpm --filter @cubekit/scramble-image test`
- `pnpm --filter @cubekit/scramble-puzzle typecheck`
- `pnpm --filter @cubekit/scramble-core typecheck`
- `pnpm --filter @cubekit/scramble-image typecheck`

Repository verification remains:

- `pnpm test`
- `pnpm check`

## Runtime Boundary

The new packages are platform-agnostic and do not require the `cstimer_module`
browser shim. Expensive scramble generation is exposed through
`createDefaultScrambleGenerator`, which is async-shaped so it can move behind a
Web Worker later without changing the high-level contract.

`@cubekit/scramble` remains the app-facing runtime today. Do not replace app
imports with the new packages until a separate migration task verifies worker,
browser, and WeChat runtime behavior.

## Upgrade Flow

When TNoodle changes, diff the pinned upstream tags recorded in
[docs/tnoodle-baseline.md](tnoodle-baseline.md) before editing CubeKit. Split
updates by upstream area:

- `scrambles` contracts and puzzle files -> `scramble-puzzle`
- `min2phase`, `threephase`, `sq12phase` -> `scramble-core`
- `svglite` and image layouts -> `scramble-image`

Keep update tasks small enough that fixtures and regression tests can identify
which puzzle family changed.

---

_Last updated: 2026-05-26 | Reason: document TNoodle-compatible package implementation_
