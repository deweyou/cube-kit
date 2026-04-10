# Research — WCA Scramble Generation & Visualization

## R1: cstimer_module API surface

**Decision**: Treat the following as the authoritative API of `cstimer_module@0.1.5`:

```ts
export function getScrambleTypes(): string[];
export function getScramble(type: string, length?: number, ...args: any[]): string;
export function setSeed(seed: string): void;
export function setGlobal(key: string, value: any): void;
export function getImage(scramble: string, type?: string): string;
```

**Rationale**: Verified by downloading `cstimer_module-0.1.5.tgz` during the clarify step and reading the shipped `cstimer_module.d.ts`. These are the only exported functions.

**Alternatives considered**: Dynamic inspection at runtime (`Object.keys(require('cstimer_module'))`) — rejected as brittle and opaque to TypeScript.

---

## R2: Authoritative WCA event → cstimer type mapping

**Decision**: Hardcode the table below in `src/wca-events.ts`. Source: `cstimer_module/README.md` (upstream), which extracts it from `cstimer/src/lang/en-us.js`.

| Our event id (WCA short) | Label            | cstimer type | WCA length arg |
| ------------------------ | ---------------- | ------------ | -------------- |
| `333`                    | 3x3x3 Cube       | `333`        | 0              |
| `222`                    | 2x2x2 Cube       | `222so`      | 0              |
| `444`                    | 4x4x4 Cube       | `444wca`     | 0              |
| `555`                    | 5x5x5 Cube       | `555wca`     | 60             |
| `666`                    | 6x6x6 Cube       | `666wca`     | 80             |
| `777`                    | 7x7x7 Cube       | `777wca`     | 100            |
| `333bld`                 | 3x3 Blindfolded  | `333ni`      | 0              |
| `333fm`                  | 3x3 Fewest Moves | `333fm`      | 0              |
| `333oh`                  | 3x3 One-Handed   | `333`        | 0              |
| `clock`                  | Clock            | `clkwca`     | 0              |
| `minx`                   | Megaminx         | `mgmp`       | 70             |
| `pyram`                  | Pyraminx         | `pyrso`      | 10             |
| `skewb`                  | Skewb            | `skbso`      | 0              |
| `sq1`                    | Square-1         | `sqrs`       | 0              |
| `444bld`                 | 4x4 Blindfolded  | `444bld`     | 40             |
| `555bld`                 | 5x5 Blindfolded  | `555bld`     | 60             |
| `333mbld`                | 3x3 Multi-Blind  | `r3ni`       | 5              |

**Rationale**: The `length` argument for 5x5 onwards is REQUIRED by upstream — passing 0 yields a too-short scramble that violates WCA regulations. Hardcoding the table avoids per-call magic numbers.

**Alternatives considered**:

- Pass-through to `getScrambleTypes()` — rejected: returns a superset including non-WCA training scrambles with no length guidance, forcing every caller to know the magic lengths.
- Derive lengths dynamically from cstimer at init time — rejected: lengths are a WCA/upstream contract, not runtime data; hardcoding is cheaper and safer.

---

## R3: Unified `getScramble` with escape hatch

**Decision**:

```ts
type WcaEventId = '333' | '222' | /* ... 17 ids ... */ | '333mbld';
type ScrambleType = WcaEventId | (string & {});

function getScramble(type: ScrambleType, length?: number): string;
```

- If `type` is in the WCA whitelist: apply the WCA length unless caller supplied one.
- Otherwise: forward to `cstimer_module.getScramble(type, length ?? 0)` as-is.
- If cstimer returns empty / throws: re-throw with context.

**Rationale**: Avoids API-surface bloat (no separate `getRawScramble`) while preserving:

- Static type safety for WCA events (autocomplete shows the 17 ids)
- String escape hatch for non-WCA types (`'f2l'`, `'lsell'`, etc.) without package changes
- WCA regulation correctness (auto length for 5x5+)

The `(string & {})` intersection is a documented TS idiom that preserves literal autocomplete while accepting any `string`. See TS playground examples at https://github.com/microsoft/TypeScript/issues/29729.

**Alternatives considered**:

- Function overloads (`getScramble(event: WcaEventId): string; getScramble(raw: string, len?: number): string`) — rejected: overload resolution for literal vs string is ambiguous in practice, and IntelliSense shows two signatures which is noisier.
- Discriminated union input (`getScramble({ event: '333' } | { raw: 'f2l', length: 0 })`) — rejected: verbose at call sites, 95% of calls are just `getScramble('333')`.

---

## R4: Error strategy

**Decision**: Throw a native `Error` with a descriptive message. No structured error objects, no `{ ok, error }` results.

**Rationale**: Matches JS ecosystem norms, matches what `cstimer_module` itself does. Keeps the API surface tight. Callers can `try/catch` if needed.

**Error messages**:

- Invalid event id: wrapped to `"@cubekit/scramble: scramble type '${type}' was rejected by cstimer_module (${upstream.message})"`
- Empty scramble from upstream: `"@cubekit/scramble: cstimer_module returned an empty scramble for type '${type}'"`

---

## R5: Playground technical stack

**Decision**: Vanilla TypeScript + Vite. Single `index.html` + single `main.ts`. Uses the package source directly (`import { getScramble, getImage, getWcaEvents } from '../src/index.ts'`).

**Rationale**: The playground is a diagnostic tool for developers of the package, not a product. It needs (1) an event dropdown, (2) a Generate button, (3) a text output, (4) an SVG output. Vanilla TS delivers this in < 50 LOC with zero framework bundle.

**Alternatives considered**:

- React — rejected: adds `react` + `react-dom` + `@vitejs/plugin-react` dev deps for no user-visible benefit.
- No playground, only tests — rejected: user explicitly requested a playground as a visual check; tests validate strings but can't reveal rendering bugs.

---

## R6: Test strategy

**Decision**: colocated under `packages/scramble/tests/`, one test file per source module. Table-driven tests iterate over the 17 WCA events. SVG assertions are string-level (`contains('<svg')`, `contains('</svg>')`). Seed reproducibility is tested by calling `setSeed('cubekit-test')` twice and comparing outputs. Escape-hatch is tested by picking one known-stable non-WCA cstimer type (`'sqrcdo'` or similar — confirmed during implementation). Error paths are tested with `'definitely-not-a-real-type'`.

**Rationale**:

- No JSDOM needed → tests stay fast, run in Node under vite-plus/test without setup.
- Table-driven per-event tests give coverage proof for FR-009 without repetitive boilerplate.
- String-level SVG assertion is robust: we trust upstream rendering, we only verify the plumbing.

**Alternatives considered**:

- Integration tests via the playground — rejected: playground is for humans, not CI.
- Snapshot tests on SVG output — rejected: SVG string may change across cstimer versions, creating brittle snapshots.

---

## R7: Dependency policy

**Decision**:

- Runtime deps: `cstimer_module` only.
- Dev deps: no additions beyond what `packages/scramble` already declares (`vite-plus`, `vitest`, `typescript`, `@types/node`).

The playground does NOT need React or `@vitejs/plugin-react`. Vite's default vanilla behavior handles HTML + TS entrypoints.

**Rationale**: Satisfies SC-005 ("zero runtime dependencies other than `cstimer_module`"). Keeps install cost minimal.

---

## R8: Old text-scramble code removal safety

**Decision**: Delete `packages/scramble/src/index.ts` and `packages/scramble/tests/index.test.ts` entirely. Rewrite both from scratch.

**Rationale**: Grep of `apps/` and `packages/` (excluding `scramble` itself) returns zero imports of `@cubekit/scramble`, `scrambleText`, or `createScrambler`. Confirmed during the plan step — safe to delete with no migration work.

Command used:

```bash
grep -r "scrambleText\|createScrambler\|@cubekit/scramble" apps/ packages/ --exclude-dir=node_modules
# → no matches
```

**Alternatives considered**: Keep old code under a `legacy` subpath — rejected: speculative, no consumers to serve, violates "no dead code" instinct.
