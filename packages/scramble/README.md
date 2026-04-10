# @cubekit/scramble

WCA scramble generation and scramble-image rendering, backed by [`cstimer_module`](https://www.npmjs.com/package/cstimer_module).

A platform-agnostic TypeScript wrapper that exposes four sync functions — `getScramble`, `getImage`, `setSeed`, `getWcaEvents` — on top of csTimer's scramble engine, plus a strictly-typed whitelist of the 17 WCA events.

---

## License — GPL-3.0

This package is licensed under the **GNU General Public License version 3**. See [`LICENSE`](./LICENSE) for the full text and [`NOTICE`](./NOTICE) for the attribution of the bundled `cstimer_module`.

**Why GPL-3.0 and not MIT**: `cstimer_module` (the upstream we wrap) is GPL-3.0, and this package bundles its source directly into `dist/cstimer-*.mjs` via the build config. Under GPL-3.0's copyleft clause, the combined work **must** be distributed under GPL-3.0 or a compatible license — MIT is not compatible. We've aligned with upstream.

**Implications for downstream consumers**:

- Any application that imports `@cubekit/scramble` and is then distributed (published, shipped, or deployed to end users) inherits GPL-3.0 obligations on the combined work. This means you must make source available, cannot add further restrictions, and any derivative must also be GPL-3.0.
- If you need an MIT- / Apache- / proprietary-compatible path, you cannot link against this package as-is. Alternatives: (a) replace the upstream with a differently-licensed scrambler, or (b) load `cstimer_module` out-of-process (dedicated Web Worker communicating over `postMessage`) so the boundary is "mere aggregation" rather than linkage. Both are non-trivial and have legal gray areas — consult your own counsel.
- Upstream cstimer: <https://github.com/cs0x7f/cstimer>. The upstream npm tarball does not ship a LICENSE file; we redistribute the canonical GPL-3.0 text in this package's LICENSE file.

---

## Install

This package lives inside the cubekit monorepo and is consumed via workspace linking. From the repo root:

```bash
pnpm install
```

`cstimer_module` is a `devDependency` and is bundled into the published output (`dist/cstimer-*.mjs`) at build time, so consumers do not need to declare it.

## Quick start

```ts
import { getScramble, getImage, setSeed, getWcaEvents } from '@cubekit/scramble';

// 1. Generate a scramble for any WCA event
const scramble = getScramble('333');
// → "R U R' U' F2 D L2 ..."

// 2. Render its SVG preview
const svg = getImage(scramble, '333');
// → '<svg width="..." ...><g ...>...</g></svg>'

// 3. Make scrambles reproducible
setSeed('cubekit-2026');
const a = getScramble('444'); // deterministic while this seed holds

// 4. Enumerate events (handy for UI dropdowns)
for (const event of getWcaEvents()) {
  console.log(event.id, event.label, event.length);
}

// 5. Escape hatch — any non-WCA cstimer training scramble
const f2l = getScramble('f2l'); // forwarded to cstimer_module as-is
```

## Runtime environment — ⚠️ important

`cstimer_module` probes its environment at load time and **only initializes correctly in Node.js or a Web Worker**. In a browser main thread it silently fails to install its internal `$` helper, causing `ReferenceError: $ is not defined` the moment anything touches `getScramble` / `getImage`.

This matters for three distinct consumers:

| Environment | Works out of the box? | Notes |
|---|---|---|
| **Node.js / vitest / build-time scripts** | ✅ | This is the normal case. No shim needed. |
| **Web Worker (browser)** | ✅ | Import `@cubekit/scramble` from inside a worker and it just works. Recommended approach for browser apps — matches upstream's official guidance. |
| **Browser main thread** | ❌ by default | You must install a pre-import shim that fakes `process` / `require` / `global` on `globalThis`. See the shim used by the playground at `playground/cstimer-browser-shim.ts`. |

The package's **core API stays synchronous and platform-agnostic** (string in, string out) — the shim / worker concern lives entirely on the consumer side.

### Browser main-thread shim (copy-paste reference)

```ts
// Side-effect import. MUST be the first import in your entry file,
// BEFORE any import that transitively loads cstimer_module.
const g = globalThis as unknown as {
  process?: unknown;
  require?: unknown;
  global?: unknown;
};
if (typeof g.process !== 'object') g.process = { browser: true, env: {} };
if (typeof g.require !== 'function') g.require = () => ({});
if (typeof g.global !== 'object') g.global = globalThis;
```

Put this in a standalone file (e.g. `cstimer-browser-shim.ts`) and `import './cstimer-browser-shim.js'` at the top of your entry. ES module imports run in source order, so listing the shim first guarantees the globals are in place before `cstimer_module` evaluates.

### Web Worker approach (recommended for production browser code)

```ts
// worker.ts — this is what your app ships
import { getScramble, getImage } from '@cubekit/scramble';

self.addEventListener('message', (e) => {
  const { type, eventId, scramble } = e.data;
  if (type === 'scramble') {
    self.postMessage({ id: e.data.id, result: getScramble(eventId) });
  } else if (type === 'image') {
    self.postMessage({ id: e.data.id, result: getImage(scramble, eventId) });
  }
});
```

```ts
// main.ts — on the main thread
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
// postMessage / onmessage communication here.
```

## Playground

```bash
pnpm --filter @cubekit/scramble playground
```

Opens a local Vite dev server. Pick an event from the dropdown, click **Generate**, see the scramble string and its SVG rendered side by side. Re-click for a new scramble. Not published to npm — lives in `playground/` outside `files`.

The playground uses the browser main-thread shim above. Treat it as a worked example for your own integration.

## API contract

### `getScramble(type, length?)`

```ts
function getScramble(type: ScrambleType, length?: number): string;
```

- If `type` is a `WcaEventId` the WCA regulation length is applied automatically unless you pass an explicit `length`.
- If `type` is any other string it is forwarded to `cstimer_module` as-is (escape hatch for training scrambles like `f2l`, `lsell`, `2gll`).
- Throws `Error` (prefixed `@cubekit/scramble:`) on unknown types, empty upstream results, or upstream throws.

### `getImage(scramble, type)`

```ts
function getImage(scramble: string, type: ScrambleType): string;
```

- Returns an SVG string you can inline via `innerHTML`, save to disk, or serialize as a data URL.
- Empty `scramble` returns the solved-state SVG (not an error).
- Throws on unknown types or empty upstream output.

### `setSeed(seed)`

```ts
function setSeed(seed: string): void;
```

Seeds cstimer's internal CSPRNG. Two `setSeed(s) → getScramble('333')` pairs with the same `s` are guaranteed identical. This is **global mutable state** — it is the only function in this package with side effects. Use sparingly; typically only in tests or reproducibility demos.

### `getWcaEvents()`

```ts
function getWcaEvents(): readonly WcaEvent[];

interface WcaEvent {
  id: WcaEventId;     // '333' | '222' | ... | '333mbld'
  label: string;      // 'e.g. 3x3x3 Cube'
  cstimerType: string; // underlying cstimer type id (normally hidden)
  length: number;      // WCA scramble length (0 = cstimer default)
}
```

Returns a stable reference — the same array is returned on every call. Do not mutate.

### Types

```ts
type WcaEventId =
  | '333' | '222' | '444' | '555' | '666' | '777'
  | '333bld' | '333fm' | '333oh'
  | 'clock' | 'minx' | 'pyram' | 'skewb' | 'sq1'
  | '444bld' | '555bld' | '333mbld';

type ScrambleType = WcaEventId | (string & {});
```

The `(string & {})` intersection is a TypeScript idiom that keeps literal autocomplete for the 17 WCA ids while still accepting any string for the escape hatch.

## Supported WCA events

| ID | Event | Default length |
|---|---|---|
| `333` | 3x3x3 Cube | cstimer default |
| `222` | 2x2x2 Cube | cstimer default |
| `444` | 4x4x4 Cube | cstimer default |
| `555` | 5x5x5 Cube | 60 |
| `666` | 6x6x6 Cube | 80 |
| `777` | 7x7x7 Cube | 100 |
| `333bld` | 3x3 Blindfolded | cstimer default |
| `333fm` | 3x3 Fewest Moves | cstimer default |
| `333oh` | 3x3 One-Handed | cstimer default (same scramble as `333`) |
| `clock` | Clock | cstimer default |
| `minx` | Megaminx | 70 |
| `pyram` | Pyraminx | 10 |
| `skewb` | Skewb | cstimer default |
| `sq1` | Square-1 | cstimer default |
| `444bld` | 4x4 Blindfolded | 40 |
| `555bld` | 5x5 Blindfolded | 60 |
| `333mbld` | 3x3 Multi-Blind | 5 |

Lengths > 0 are WCA regulation requirements — upstream `cstimer_module` returns scrambles that are too short without them.

## Bundle shape

```
dist/
├── index.mjs              ~6 KB   (gzip ~2 KB)  — your wrapper code
├── cstimer-<hash>.mjs     ~411 KB (gzip ~108 KB) — bundled cstimer_module
├── rolldown-runtime-*.mjs ~1 KB                  — runtime helpers
└── index.d.mts            ~6 KB                  — TypeScript declarations
```

`cstimer_module` is split into its own output chunk so updates to the wrapper code don't force consumers to re-download the 400 KB solver tables. See `vite.config.ts` for the `codeSplitting.groups` configuration.

## Scripts

```bash
pnpm --filter @cubekit/scramble build       # vp pack → dist/
pnpm --filter @cubekit/scramble test        # vitest
pnpm --filter @cubekit/scramble typecheck   # tsc --noEmit
pnpm --filter @cubekit/scramble playground  # vite dev server on :5180
pnpm --filter @cubekit/scramble dev         # vp pack --watch
```

All of these can also be run from repo root via the workspace-wide scripts (`pnpm test`, `pnpm build`, `pnpm check`).
