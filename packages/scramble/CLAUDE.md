# @cubekit/scramble — guidance for Claude sessions

Package-level notes that apply when Claude is working inside `packages/scramble`. Read this alongside the repo-root `AGENTS.md`, especially `docs/scramble-runtime.md` and `docs/dependency-licensing.md`.

## What this package is

A platform-agnostic TypeScript wrapper around [`cstimer_module`](https://www.npmjs.com/package/cstimer_module). Exposes exactly four functions — `getScramble`, `getImage`, `setSeed`, `getWcaEvents` — plus the types `WcaEventId`, `WcaEvent`, `ScrambleType`. Details in [`README.md`](./README.md).

The package used to host a generic text-scramble animation utility; that code was deleted and replaced with the current WCA scrambler in feature `20260410-cstimer-module-packages`. Do not restore the old API — the constitution is clear that `packages/scramble` is the cube scrambler.

## Non-negotiable invariants

1. **No direct DOM access in `src/`.** The core must run in Node, vitest, web/H5, and WeChat miniprogram. The playground in `playground/` is the only place `window`/`document` may appear.
2. **Single choke point for `cstimer_module`.** Only `src/cstimer.ts` is allowed to `import 'cstimer_module'`. Every other source file must go through `rawGetScramble` / `rawGetImage` / `rawSetSeed`. This is how error wrapping, environment concerns, and future upgrades stay in one place.
3. **WCA whitelist is the single source of truth.** Both the `WcaEventId` string-literal union AND the `WCA_EVENTS` runtime array live in `src/wca-events.ts`. A compile-time exhaustiveness check in that file fails the build if the two drift apart — do not disable it. Add new events in BOTH locations, or not at all.
4. **Error strategy: throw `Error` with `@cubekit/scramble:` prefix.** Not structured error objects, not `{ ok, error }` tuples. Match the existing pattern in `src/scramble.ts` and `src/image.ts`.
5. **Sync API only.** Callers assume `getScramble('333')` returns a string synchronously. Do not introduce top-level await, dynamic imports, or Promise-returning signatures on the core API.
6. **Zero runtime dependencies beyond `cstimer_module`.** And `cstimer_module` is a `devDependency` that gets bundled into `dist/` via `deps.alwaysBundle`. Never move it to `dependencies` and never add a new runtime dep without explicit approval.

## License — GPL-3.0 ⚠️

This package is **GPL-3.0** (see [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE)). The license is fixed by an upstream constraint and cannot be relaxed without restructuring the package:

- `cstimer_module` (the upstream we wrap) is **GPL-3.0**.
- We bundle it directly — see `vite.config.ts` → `deps.alwaysBundle: ['cstimer_module']`. The published `dist/cstimer-*.mjs` contains cstimer's GPL-covered source verbatim.
- GPL-3.0's copyleft clause requires the combined work to be distributed under GPL-3.0 or a compatible license. MIT / Apache / proprietary are NOT compatible.

**Invariants Claude MUST preserve**:

1. `package.json` `license` field stays `"GPL-3.0"`. Do not "fix" it to MIT — that was the scaffolding default and is incorrect for the current content.
2. `packages/scramble/LICENSE` must exist and must contain the full GPL-3.0 text. If it's ever missing, restore it from <https://www.gnu.org/licenses/gpl-3.0.txt>.
3. `packages/scramble/NOTICE` must exist and must attribute cstimer_module + its upstream repo.
4. Both files must be listed in `package.json` `files` so they ship to npm.
5. **Downstream implication** — every app in this monorepo that imports `@cubekit/scramble` inherits GPL-3.0 on distribution. If the user later wants a permissive-licensed app, the fix is at THIS package (not the app): either load `cstimer_module` out-of-process (Web Worker so it's "mere aggregation"), or swap it for a differently-licensed scrambler. Flag this in your response if the user brings it up; do not silently paper over it.

## Environment quirks you will hit

**`cstimer_module` only runs cleanly in Node.js or a Web Worker.** In a browser main thread its environment probe fails, its internal `$` helper is never installed, and `getScramble` throws `ReferenceError: $ is not defined` at call time.

- Tests under vitest run in Node → no problem.
- The playground is a browser main-thread app → it imports a shim at `playground/cstimer-browser-shim.ts` BEFORE any scramble import. The shim fakes `process`/`require`/`global` on `globalThis` so cstimer's `Na` detection passes. Do NOT remove or reorder this import without verifying the playground still renders.
- Apps shipping this package to browsers should either reuse the same shim pattern or — better — load `@cubekit/scramble` inside a Web Worker and communicate via `postMessage`. The worker approach matches upstream's official guidance and keeps the main thread clean.

## File layout

```
packages/scramble/
├── src/
│   ├── index.ts         # barrel, re-exports only
│   ├── wca-events.ts    # whitelist + types + exhaustiveness check
│   ├── scramble.ts      # getScramble()
│   ├── image.ts         # getImage()
│   ├── seed.ts          # setSeed()
│   └── cstimer.ts       # ONLY file importing cstimer_module
├── tests/
│   ├── wca-events.test.ts
│   ├── scramble.test.ts
│   ├── image.test.ts
│   ├── seed.test.ts
│   └── index.test.ts
├── playground/
│   ├── index.html
│   ├── main.ts
│   ├── cstimer-browser-shim.ts   # MUST be imported first in main.ts
│   └── vite.config.ts
├── dist/                # published output, generated
├── vite.config.ts       # pack config (codeSplitting, alwaysBundle)
├── tsconfig.json
├── package.json
└── README.md
```

## Coding conventions in this package

- **Arrow functions, not function declarations.** Repo-wide ESLint rule: `func-style`. `export function foo()` fails lint. Use `export const foo = (): T => { ... }`.
- **File names**: kebab-case. Types: PascalCase. Variables / functions: camelCase. Constants: SCREAMING_SNAKE_CASE.
- **Test imports from `vite-plus/test`**, not `vitest` directly. Matches the rest of the monorepo.
- **Table-driven tests** for anything that ranges over WCA events. Use `test.each(getWcaEvents())` — no manual repetition for the 17 ids.
- **SVG assertions are string-level** (`expect(svg).toContain('<svg')` etc). Do not introduce JSDOM.
- **The `(string & {})` idiom in `ScrambleType`**: preserve it. Do not "simplify" to `string`, which collapses the union and kills the literal autocomplete. Read `src/wca-events.ts` comment for rationale.

## Build / test commands

```bash
pnpm --filter @cubekit/scramble build       # produces dist/
pnpm --filter @cubekit/scramble test        # runs vitest via vite-plus
pnpm --filter @cubekit/scramble typecheck   # tsc --noEmit
pnpm --filter @cubekit/scramble playground  # vite dev server
```

From repo root: `pnpm test` / `pnpm build` / `pnpm check` run the workspace-wide passes.

## When adding new events

1. Add the id to `WcaEventId` in `src/wca-events.ts`.
2. Add the corresponding entry to the `WCA_EVENTS` table (same file). The type-level coverage check will fail the build if you forget step 1 or step 2.
3. If the event needs a fixed length (like 5x5 → 60), add it via the existing `LENGTH_*` / `CSTIMER_*` constants block at the top of `wca-events.ts`. Do not inline magic numbers.
4. `test.each(getWcaEvents())` automatically picks it up in `scramble.test.ts` and `image.test.ts` — no test edits needed.

## When adding new functions

1. New source file in `src/`, importing from `./cstimer.js` (never directly from `cstimer_module`).
2. Re-export from `src/index.ts` — this is the only barrel.
3. Co-locate a test file under `tests/`.
4. Add the function to the public API surface test in `tests/index.test.ts`.
5. Update `README.md` API section.
6. Update `docs/scramble-runtime.md` or `docs/dependency-licensing.md` when the change moves a durable runtime or licensing invariant.

## Things to leave alone unless explicitly asked

- The chunk-splitting config in `vite.config.ts`. The `cstimer` group label is referenced by the published filename pattern — renaming it breaks consumer caches.
- The playground shim. It exists for a non-obvious runtime reason — removing it makes the playground break silently.
- The WCA length constants. They come from upstream's README and map to WCA regulation requirements; changing them produces invalid scrambles.
- The `inlinedDependencies` field in `package.json`. Vite-plus writes it automatically during `build`; hand-editing it will be overwritten.
