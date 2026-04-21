# Archive: WCA Scramble Generation & Visualization

**Branch**: `20260410-cstimer-module-packages`
**Completed**: 2026-04-10
**Type**: feature

## Delivery Summary

**What was built**: Repurposed `@cubekit/scramble` from a generic text-animation utility into a platform-agnostic TypeScript wrapper around `cstimer_module` that generates WCA-official scrambles and SVG puzzle previews for all 17 WCA events. Ships a local vanilla-TS Vite playground for visual verification and 54 unit tests across 5 files covering every export and every event.

**Why it matters**: This is the foundation every downstream CubeKit feature depends on — timer, practice, algorithm trainer, scramble-of-the-day, etc. all require a scramble source that matches csTimer/WCA output. Before this feature the package was a stale placeholder; after it, the rest of the project can actually be built.

**Actual scope vs. original plan**:

- **Added during implementation**: (a) a browser main-thread shim for `cstimer_module`'s broken environment probe — not anticipated in the plan because the problem only surfaced when the playground silently failed; (b) a LICENSE swap from MIT to GPL-3.0 with full LICENSE/NOTICE files after the user asked to verify upstream licensing.
- **Deferred**: Taro / WeChat miniprogram rendering of the SVG output (explicitly out of scope in the spec). The core API runs in WX runtime, but Taro-native rendering is a follow-up feature.
- **Cut**: Nothing. Everything in US1–US4 landed.

## Key Decisions

| Decision                    | Options Considered                                                                                                                        | Choice Made                                                                           | Rationale                                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public API shape            | Overloads / discriminated union / single fn with `(string & {})` escape hatch                                                             | Single `getScramble(type, length?)` with `ScrambleType = WcaEventId \| (string & {})` | Keeps call sites tiny (`getScramble('333')`), preserves literal autocomplete for the 17 WCA ids, still allows non-WCA training types as an escape hatch with zero API-surface bloat |
| Event id naming             | Pass-through cstimer ids (`333ni`, `mgmp`, `pyrso`) / WCA official short codes (`333bld`, `minx`, `pyram`) / pure numeric (`3bld`, `meg`) | WCA official short codes                                                              | Matches WCA website, decouples public API from upstream's opaque naming, gives downstream apps stable ids even if we swap scramble engines later                                    |
| WCA length source           | Derive at runtime from cstimer / hardcode in a whitelist table                                                                            | Hardcode `LENGTH_*` named constants feeding into `WCA_EVENTS`                         | Upstream's lengths are a regulation contract, not runtime data; hardcoding documents intent; named constants keep the table readable                                                |
| Error strategy              | Structured `{ ok, error }` / custom error class / native `Error` with prefixed message                                                    | Native `Error` with `@cubekit/scramble:` prefix                                       | Matches JS ecosystem norms, matches what cstimer itself does, trivial to `try/catch`                                                                                                |
| `cstimer_module` bundling   | External runtime dep / bundled via `alwaysBundle` / dynamic Worker import                                                                 | Bundled via `deps.alwaysBundle`, moved to `devDependencies`                           | Downstream apps don't need to declare cstimer themselves. Trade-off: the bundled combined work is GPL-3.0 (see pitfalls)                                                            |
| Output chunk strategy       | Single file / manual chunks / rolldown `codeSplitting.groups`                                                                             | `codeSplitting.groups: [{ name: 'cstimer', test: /cstimer_module/ }]`                 | Keeps our 6 KB wrapper in its own file so wrapper updates don't force a re-download of the 411 KB solver tables                                                                     |
| Playground framework        | React (consistency with apps) / Vanilla TS + Vite / no playground                                                                         | Vanilla TS + Vite                                                                     | Diagnostic tool, not a product — React would add bundle and config noise for no benefit; <50 LOC delivers the whole thing                                                           |
| Old text-scramble migration | Keep under `legacy/` / rewrite with compat shims / delete and rewrite                                                                     | Delete and rewrite                                                                    | `grep -r` across `apps/` and `packages/` confirmed zero consumers; no migration burden                                                                                              |
| Package license             | Keep `"MIT"` (from scaffold) / switch to GPL-3.0 / restructure so cstimer runs out-of-process                                             | Switch to GPL-3.0                                                                     | `cstimer_module` is GPL-3.0 and we statically bundle its source; copyleft applies to the combined work; aligning with upstream is the safe default                                  |

## Pitfalls

### P1 — `cstimer_module` does not work in browser main thread

**What happened**: The playground's dropdown populated correctly but clicking Generate did nothing. No visible error. Scramble and SVG stayed empty. Console was silent.

**Why non-obvious**:

- All 54 unit tests passed — vitest runs in Node, where cstimer's environment probe succeeds.
- The build produced a valid bundle — bundlers don't care about runtime environment assumptions.
- The browser DevTools network panel showed the module loading successfully (200 OK).
- The failure only surfaced when `getScramble()` was actually called in-browser; until then the package looked completely healthy.
- cstimer's upstream README mentions "use it as a webworker in browser" but it's buried near the bottom; the Node examples are first.

Root cause: `cstimer_module`'s IIFE has this shape (abbreviated):

```js
var Na = typeof process === 'object' && typeof require === 'function' && typeof global === 'object';
var lb = (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) || Na;
function tb(b, I) { return !lb && b ? b.apply(...) : lb && I ? I.apply(...) : {}; }
tb(void 0, function () {
  Na && (global.self = global);
  self.$ = { isArray: Array.isArray, noop: ..., now: ... };
}, void 0);
```

In a browser main thread: `Na = false`, `lb = false`, `tb` returns `{}` **without calling the init function**, so the global `$` helper (required by every subsequent `$.svg = ...`, `$.ctxDrawPolygon = ...` in the file) is never installed. The next time any exported function touches `$`, it throws `ReferenceError: $ is not defined`.

**Resolution**: `packages/scramble/playground/cstimer-browser-shim.ts` — a side-effect-only module that installs fake `process`, `require`, and `global` on `globalThis` BEFORE `@cubekit/scramble` is imported. This flips `Na` to true, which flips `lb` to true, which makes `tb` run the init. Import order in `main.ts` is load-bearing — the shim MUST be the first import.

**Signal to watch for**: Any "the package works in Node but fails silently in a browser" report for an npm package wrapping a cube solver / WASM / dense algorithmic library. The pattern "npm package designed around Web Worker postMessage API" often means the package does not work in the main thread, even though it looks like a normal ESM import.

### P2 — `tsgo: true` in `vite.config.ts` is undocumented and requires an unshipped peer dep

**What happened**: `pnpm --filter @cubekit/scramble build` failed with `Cannot find package '@typescript/native-preview'`.

**Why non-obvious**: The option was already present in the scaffolding `vite.config.ts` before this feature began, so it looked like a "working" setting. Its failure was masked by the fact that nobody had run `pnpm build` on the scramble package before — tests passed, CI was green.

**Resolution**: Remove `dts: { tsgo: true }` and replace with `dts: {}` so the standard TypeScript compiler generates declarations. Also discovered the hard way that omitting `dts` entirely disables `.d.mts` generation (auto-detect is stricter than documented), so `dts: {}` is mandatory to force it on.

**Signal to watch for**: `Cannot find package '@typescript/native-preview'` errors during `vp pack`. This means someone enabled `tsgo: true` speculatively. Either install `@typescript/native-preview` as a devDep (if you want the experimental native compiler) or remove the `tsgo` flag.

### P3 — MIT license inherited from scaffold is incompatible with bundled GPL-3.0 upstream

**What happened**: `package.json` declared `"license": "MIT"` throughout the feature work. The user specifically asked to verify upstream licensing during the archive phase, and investigation revealed the mismatch.

**Why non-obvious**:

- The scaffold's MIT declaration was correct at the time the file was created (when the package was a text-animation utility with no deps).
- `cstimer_module`'s own npm tarball does NOT include a LICENSE file — its `package.json` declares `"license": "GPL-3.0"` but the canonical text is only in the upstream GitHub repo, which is easy to miss if you only look at `node_modules`.
- It's tempting to reason "we're just calling an API, we don't modify anything" — but GPL-3.0 treats statically linked / bundled code as part of the combined work, and `deps.alwaysBundle: ['cstimer_module']` literally inlines cstimer's minified source into our `dist/cstimer-*.mjs`.

**Resolution**:

- `packages/scramble/package.json`: `"license": "GPL-3.0"`, `files` extended to include `LICENSE`, `NOTICE`, `README.md`.
- `packages/scramble/LICENSE`: full GPL-3.0 text fetched from `https://www.gnu.org/licenses/gpl-3.0.txt`.
- `packages/scramble/NOTICE`: attribution of `cstimer_module@0.1.5` with upstream repo link, noting that cstimer is bundled verbatim with no modifications.
- `packages/scramble/README.md` and `packages/scramble/CLAUDE.md`: prominent GPL-3.0 notices explaining downstream implications.

**Signal to watch for**:

- Any monorepo package declaring `"license": "MIT"` while bundling / linking code from a `devDependencies` entry — audit the dep tree for GPL, LGPL, MPL, AGPL packages.
- `package.json` `license` field inherited from scaffolding rather than set intentionally for the current code.
- `pnpm licenses list` or `license-checker` output showing any GPL/AGPL package in the transitive closure of a package you intend to publish permissively.

### P4 — `cstimer_module`'s SVG output has no `viewBox`, so CSS resize silently clips the image

**What happened**: After the playground was rendering correctly for 3x3, switching to 7x7 showed only the top face fully plus part of two middle-row faces — the bottom half of the unfolded net was gone. At first glance it looked like a layout / overflow bug.

**Why non-obvious**:

- The SVG returned by `cstimer_module.getImage` has proper `width` and `height` attributes (`916` and `682.667` for 7x7). Inspecting the raw output looks fine.
- CSS `max-width: 100%; height: auto;` on the `<svg>` element scales the element's bounding box correctly, and the element's `getBoundingClientRect()` reports the expected scaled size (e.g. 602×449). No visible overflow on the wrapper div.
- The clipped faces are still PRESENT in the DOM — `querySelectorAll('polygon').length === 294`, matching a full 7x7 net. They're just drawn at user-space coordinates (like `(700, 600)`) that fall outside the CSS pixel box after scaling.
- The failure mode depends on viewport width. On a large enough screen where the SVG doesn't need to shrink, it renders fine. On any realistic responsive container, it breaks. Our 3x3 tests passed because 3x3's 396×296 natural size fits most layouts unscaled.
- Nothing in the upstream README mentions this — `getImage` is described as "Generate scramble image for previous scramble (in svg)" with no note about sizing.

Root cause: without a `viewBox` attribute, an SVG's user-space coordinate system is decoupled from its CSS pixel size. When CSS sizes the element down, the coordinate system stays at its natural extent, so any drawing command referencing coordinates outside the CSS box gets clipped. Adding `viewBox="0 0 W H"` ties the coordinate system to the CSS box and the whole drawing scales cleanly.

**Resolution**: `src/image.ts` now runs an `ensureViewBox()` post-processor on every upstream SVG. It parses the `<svg>` opening tag, reads the `width` and `height` attributes, and injects `viewBox="0 0 W H"` if no viewBox exists. Idempotent — if the upstream ever starts emitting its own viewBox we skip the injection. Regression guard in `tests/image.test.ts`: `test.each(getWcaEvents())` asserts every event's SVG has a viewBox that matches its declared width/height exactly (so any future upstream change that drifts the numbers fails loudly instead of silently distorting aspect ratio).

**Signal to watch for**:

- Any SVG from a third-party library that "works small but breaks when resized". Inspect the SVG's outer attributes: if there's `width=` and `height=` but no `viewBox=`, this bug is waiting to happen.
- Users reporting "the image is getting cut off" or "only half the image shows" on mobile / narrow viewports, while the same image renders correctly on desktop.
- `querySelectorAll('polygon').length` (or similar) showing the expected element count while the rendered image only shows a subset — strong hint that content exists but is drawn outside the visible coordinate space.

## Reusable Patterns

### Pattern 1 — "Whitelist + escape hatch" with `(string & {})`

To build a function that takes a known-set identifier AND still accepts arbitrary strings for power-user cases, without losing IDE autocomplete on the known set:

```ts
type KnownId = 'a' | 'b' | 'c';
type Input = KnownId | (string & {});

function doThing(id: Input): Result {
  if (isKnown(id)) return doKnown(id);
  return doUnknown(id); // escape hatch
}
```

The `(string & {})` intersection is a documented TypeScript idiom (microsoft/TypeScript#29729) that prevents the union from collapsing to `string`. Runtime cost: zero — it's purely a type-level trick. Works with overload-free single-signature APIs, keeping call sites terse.

When to use: a small, known set of "first-class" values where you also want an escape hatch for power-user / future-extension use cases, without shipping a second function.

### Pattern 2 — Pre-import environment shim for broken-environment upstream deps

To use an npm package that assumes Node/Worker globals in a browser main thread without forking the package or forcing consumers into async APIs:

1. Create a side-effect-only module (`xxx-shim.ts`) that writes the required globals onto `globalThis` conditionally (never clobber existing values).
2. In the entry file that uses the upstream, import the shim FIRST, then import the upstream (or any wrapper that transitively imports it).
3. Document the ordering requirement inline and in the README so future refactors don't accidentally reorder imports.

ES module imports run in source order and side effects execute fully before the next import's evaluation starts, so this pattern is safe as long as the shim file is truly side-effects-only.

When to use: an upstream package does an environment probe at module-load time using globals like `process`, `require`, `global`, or `WorkerGlobalScope`, and you can't (or don't want to) patch the upstream.
When NOT to use: if the upstream can be replaced with a properly isomorphic alternative, do that instead — shims are a maintenance tax.

### Pattern 3 — Single choke point for an external SDK

For any package that wraps a third-party library, concentrate all direct imports of that library in ONE internal file (convention: `src/<dep>.ts`). Every other source file in the package goes through wrapper functions exported from that file.

Benefits:

- Error wrapping, retry, logging, and telemetry happen in one place.
- Type refinement (turning `any` from a loose upstream `.d.ts` into safer local types) lives in one place.
- Swapping the upstream or upgrading across a breaking change means editing one file.
- Tests can mock the choke point cleanly (though in this feature we chose not to mock — trust cstimer's output, test the plumbing, assert at the string level).

When to use: any wrapper package around a third-party library.
When NOT to use: if the wrapper is trivially a single re-export with no wrapping logic.

### Pattern 4 — Compile-time exhaustiveness check between a string-literal union and a runtime table

To guarantee a string-literal union type and a runtime array stay in sync:

```ts
export type KnownId = 'a' | 'b' | 'c';

export const ITEMS = [
  { id: 'a', label: '...' },
  { id: 'b', label: '...' },
  { id: 'c', label: '...' },
] as const satisfies readonly { id: KnownId; label: string }[];

// Compile-time assertion: every KnownId must appear in ITEMS.
type _Coverage = Exclude<KnownId, (typeof ITEMS)[number]['id']> extends never ? true : never;
export type _ItemsCoverageProof = _Coverage;
```

The `export type` line is purely type-level — no runtime artifact — so `noUnusedLocals` is satisfied. Adding a new id to the union without a matching `ITEMS` entry fails TypeScript compilation.

When to use: any time you have a type-level enum AND a runtime table indexed by the same keys, and drift between them would be a silent bug.

## Constitution Feedback

### Gap 1 — License compatibility policy for bundled dependencies

The constitution says nothing about license compatibility. This feature hit a concrete conflict (MIT scaffold vs. GPL-3.0 upstream) with no written rule to appeal to.

**Suggested principle**:

> **License Compatibility Gate**: Any package that bundles (`alwaysBundle`, `noExternal`, or equivalent) a dependency MUST declare a `license` field compatible with every bundled dependency's license. Before enabling bundling for any new dependency, verify its license via `node_modules/<dep>/package.json` and its `LICENSE` file if shipped, and cross-check against the package's own declared license. GPL-family licenses (GPL, AGPL) are copyleft — bundling them forces the combined work to be GPL-compatible. When in doubt, prefer `peerDependencies` or out-of-process loading over static bundling.

### Gap 2 — Runtime environment declaration for published packages

The constitution's Architecture Boundaries section says "packages should remain platform-agnostic where possible" but does not define what "platform-agnostic" means or require packages to document their actual runtime support matrix. `@cubekit/scramble` has a non-trivial runtime constraint (browser main thread needs a shim) that would have been missed entirely if the playground hadn't been part of the feature scope.

**Suggested principle**:

> **Runtime Support Matrix**: Every published package MUST document its supported runtime environments in its `README.md`, explicitly listing any that require a shim, polyfill, or worker boundary. Environments to enumerate: Node.js, vitest, browser main thread, browser Web Worker, WeChat miniprogram runtime. Default stance: if it's not listed as "works out of the box", assume it doesn't.

### Gap 3 — Build / typecheck gates alongside test gates

The scaffolded `vite.config.ts` had `dts: { tsgo: true }` which silently broke `pnpm build` — a problem that only surfaced because this feature actually ran `pnpm build` for the first time. Tests passing is not the same thing as the package being shippable.

**Suggested principle**:

> **All Gates Must Green Before Feature Close**: A feature is not complete until `pnpm test`, `pnpm build`, `pnpm --filter <pkg> typecheck`, and `pnpm check` all pass from a clean working directory. Pre-existing failures in OTHER packages should be reported but do not block the current feature; pre-existing failures in the package being modified ARE in scope and MUST be fixed.

### Refinement — "platform-agnostic" scope

Section IV says packages should be platform-agnostic "where possible". This feature interpreted that as "`src/` is platform-agnostic; auxiliary artifacts like `playground/` may touch DOM globals". This interpretation worked well.

**Suggested refinement** to §IV:

> Packages in `packages/` MUST keep `src/` platform-agnostic (no direct access to `window`, `document`, Taro APIs, or any platform-specific global). Auxiliary directories inside a package (e.g., `playground/`, `examples/`) may be platform-specific but MUST NOT be included in `package.json`'s `files` array, and thus MUST NOT ship in the published tarball.

## Next Steps

- [ ] **License policy decision** — the monorepo's top-level license story is now inconsistent. `@cubekit/scramble` is GPL-3.0 but `apps/web`, `apps/wx-app`, and the root `package.json` either have no license or inherit something else. Before publishing any package or shipping any app, decide: align the whole repo to GPL-3.0, or restructure so `cstimer_module` runs out-of-process. Track as a separate follow-up.
- [ ] **Apps integration** — neither `apps/web` nor `apps/wx-app` consumes `@cubekit/scramble` yet. A follow-up feature should wire it into the web app's timer/scramble view (this will surface the Web Worker integration question immediately).
- [ ] **Taro/WX SVG rendering** — explicitly out of scope for this feature. When `apps/wx-app` first tries to render an SVG string from `getImage`, a follow-up may be needed to convert SVG → Taro `<view>` primitives or use a Taro-compatible SVG component.
- [ ] **Upstream issue** — `cstimer_module@0.1.5` does not ship a LICENSE file in its npm tarball. Consider opening an issue at <https://github.com/cs0x7f/cstimer> to ship the LICENSE in the published package.
- [ ] **`deps.onlyBundle` hint** — every build prints `Hint: consider adding deps.onlyBundle option to avoid unintended bundling of dependencies`. Not blocking, but adding `onlyBundle: ['cstimer_module']` would silence the hint and guarantee we catch accidental bundling of other deps in the future.
