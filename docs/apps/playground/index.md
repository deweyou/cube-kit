# Scramble Playground App

```mermaid
flowchart TD
    Controls["Controls"] --> Service["playground service"]
    Service --> Core["@cubekit/scramble-core"]
    Service --> Image["@cubekit/scramble-image"]
    Service --> Solver["@cubekit/solver"]
    Service --> Diagnostics["diagnostics"]
```

`apps/playground` is a developer test workbench for exercising the scramble and
auxiliary solver packages without wiring them into production apps.

## Key Rules

- It imports package source through Vite aliases for fast local feedback.
- It is allowed to run generation on the main thread because it is not a
  production app.
- The Solvers tab calls `@cubekit/solver` through the playground service boundary
  and is for manual diagnostics, not production timer integration.
- `?seed=<integer>` provides deterministic browser smoke and future E2E runs.
- `333mbld` attempts are split into one displayed row per cube.

## Verify

```bash
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
```

## Key Files

- [apps/playground/src/playground/playground-service.ts#L1](../../../apps/playground/src/playground/playground-service.ts#L1) - package adapter.
- [apps/playground/src/playground/use-playground.ts#L1](../../../apps/playground/src/playground/use-playground.ts#L1) - React state boundary.
- [packages/solver/src/index.ts#L1](../../../packages/solver/src/index.ts#L1) - auxiliary solver API used by the Solvers tab.
- [docs/apps/playground/diagnostics-and-e2e.md](diagnostics-and-e2e.md) - diagnostics and E2E guidance.

---

_Last updated: 2026-05-31 | Reason: add solver diagnostics tab to playground ownership_
