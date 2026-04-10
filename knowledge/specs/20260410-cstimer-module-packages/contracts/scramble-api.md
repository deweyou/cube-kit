# Public API Contract — @cubekit/scramble

## Package entry point

```ts
// packages/scramble/src/index.ts
export { getScramble } from './scramble.ts';
export { getImage } from './image.ts';
export { setSeed } from './seed.ts';
export { getWcaEvents } from './wca-events.ts';
export type { WcaEventId, WcaEvent, ScrambleType } from './wca-events.ts';
```

No default export. All named.

---

## `getScramble(type, length?)`

```ts
export function getScramble(type: ScrambleType, length?: number): string;
```

**Behavior**:

1. If `type` is a known WCA event id: look up the event in `WCA_EVENT_BY_ID`, call `cstimer_module.getScramble(event.cstimerType, length ?? event.length)`.
2. Otherwise: call `cstimer_module.getScramble(type, length ?? 0)` directly (escape hatch).
3. If the upstream result is an empty string or falsy: throw `Error(@cubekit/scramble: cstimer_module returned an empty scramble for type '${type}')`.
4. If the upstream throws: re-throw with context: `Error(@cubekit/scramble: scramble type '${type}' was rejected by cstimer_module: ${upstream.message})`.
5. Otherwise: return the upstream string unchanged.

**Examples**:

```ts
getScramble('333'); // "R U R' U' F2 D L2 ..."
getScramble('555'); // length 60 applied automatically
getScramble('333', 20); // explicit length override wins
getScramble('f2l'); // escape hatch, forwarded as-is
getScramble('not-a-type'); // throws Error
```

**Preconditions**: none (stateless).
**Postconditions**: return value is a non-empty string on success.
**Side effects**: none visible to caller (upstream uses an internal PRNG).

---

## `getImage(scramble, type)`

```ts
export function getImage(scramble: string, type: ScrambleType): string;
```

**Behavior**:

1. If `type` is a known WCA event id: use its `cstimerType`.
2. Otherwise: forward `type` as-is.
3. Call `cstimer_module.getImage(scramble, resolvedType)`.
4. If upstream returns empty / falsy: throw `Error(@cubekit/scramble: cstimer_module produced no image for type '${type}')`.
5. If upstream throws: re-throw with context.
6. Otherwise: return the SVG string.

**Examples**:

```ts
const scr = getScramble('333');
const svg = getImage(scr, '333'); // "<svg xmlns=..."
getImage('', '333'); // solved state, still returns <svg>
getImage(scr, 'definitely-not-real'); // throws
```

**Preconditions**: `scramble` is a string (may be empty).
**Postconditions**: return value starts with `<svg` and ends with `</svg>` on success.
**Side effects**: none.

---

## `setSeed(seed)`

```ts
export function setSeed(seed: string): void;
```

**Behavior**:

1. Calls `cstimer_module.setSeed(seed)` directly. Upstream uses the string seed to initialize its CSPRNG deterministically.
2. Does not validate the argument beyond TypeScript types. Upstream coerces non-strings via `Object.prototype.toString`.

**Examples**:

```ts
setSeed('cubekit-2026');
const a = getScramble('333');
setSeed('cubekit-2026');
const b = getScramble('333');
// a === b
```

**Preconditions**: `seed` is a string (TypeScript enforced).
**Postconditions**: subsequent `getScramble` calls are deterministic with respect to this seed until `setSeed` is called again.
**Side effects**: mutates upstream global PRNG state. This is the only function in the package with side effects.

---

## `getWcaEvents()`

```ts
export function getWcaEvents(): readonly WcaEvent[];
```

**Behavior**:

1. Returns the `WCA_EVENTS` constant directly (same reference on every call).

**Examples**:

```ts
for (const event of getWcaEvents()) {
  console.log(event.id, event.label);
  const scr = getScramble(event.id);
  const svg = getImage(scr, event.id);
}
```

**Preconditions**: none.
**Postconditions**: returns exactly 17 `WcaEvent` records.
**Side effects**: none.

---

## Types exported from public entry

```ts
export type WcaEventId =
  | '333'
  | '222'
  | '444'
  | '555'
  | '666'
  | '777'
  | '333bld'
  | '333fm'
  | '333oh'
  | 'clock'
  | 'minx'
  | 'pyram'
  | 'skewb'
  | 'sq1'
  | '444bld'
  | '555bld'
  | '333mbld';

export type ScrambleType = WcaEventId | (string & {});

export interface WcaEvent {
  id: WcaEventId;
  label: string;
  cstimerType: string;
  length: number;
}
```

---

## Error matrix

| Call                               | Condition                        | Outcome                            |
| ---------------------------------- | -------------------------------- | ---------------------------------- |
| `getScramble('333')`               | happy path                       | returns non-empty string           |
| `getScramble('555')`               | WCA length auto-applied          | returns scramble of length 60      |
| `getScramble('333', 20)`           | explicit length wins             | passes 20 to upstream              |
| `getScramble('f2l')`               | escape hatch, valid cstimer type | returns string                     |
| `getScramble('xyz')`               | unknown to cstimer               | throws wrapped `Error`             |
| `getImage(scr, '333')`             | happy path                       | returns `<svg>…</svg>`             |
| `getImage('', '333')`              | empty scramble                   | returns solved-state SVG           |
| `getImage(scr, 'xyz')`             | unknown type                     | throws wrapped `Error`             |
| `setSeed('x'); getScramble('333')` | deterministic                    | equal across calls with same seed  |
| `getWcaEvents()`                   | stateless                        | returns 17 entries, same reference |

---

## Non-goals (explicitly not in the contract)

- No validation of scramble strings passed to `getImage` (we trust upstream to render garbage as garbage)
- No caching layer
- No async API (all calls are synchronous, matching upstream's Node API)
- No Taro / WeChat miniprogram rendering helpers — core API is string-in / string-out and platform-agnostic; wiring into Taro is left to consumers
