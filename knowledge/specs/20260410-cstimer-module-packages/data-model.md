# Data Model — WCA Scramble Generation & Visualization

This feature is a stateless wrapper around `cstimer_module`. "Data model" here means the public TypeScript types and the static whitelist table.

---

## Entity: `WcaEventId`

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
```

- **Kind**: string-literal union (compile-time only; no runtime representation)
- **Cardinality**: exactly 17 values (one per WCA event as of 2026)
- **Source of truth**: `src/wca-events.ts` exports both the type and a matching runtime array; a type-level check enforces they stay in sync.
- **Validation**: Runtime validation done by `getScramble` / `getImage` is not strict — non-WCA strings are accepted via the escape hatch. Only the WCA-specific length table lookup depends on WCA membership.

## Entity: `ScrambleType`

```ts
export type ScrambleType = WcaEventId | (string & {});
```

- **Kind**: type alias widening `WcaEventId` to any string while preserving autocomplete.
- **Purpose**: Single input type for `getScramble` / `getImage`; callers get IDE autocomplete on the 17 WCA ids and can still pass raw cstimer types (`'f2l'`, `'lsell'`, etc.).
- **Not exported** separately from the public entry point — it's the type of function parameters, not a standalone concept.

## Entity: `WcaEvent`

```ts
export interface WcaEvent {
  /** WCA short id, public API identifier. */
  id: WcaEventId;
  /** Human-readable label, suitable for dropdowns. */
  label: string;
  /** Underlying cstimer_module scramble type (normally hidden). */
  cstimerType: string;
  /** WCA scramble length passed to cstimer (0 = use cstimer default). */
  length: number;
}
```

- **Cardinality**: exactly 17 records (one per WCA event).
- **Source**: hardcoded in `src/wca-events.ts` as a `readonly` constant.
- **Returned by**: `getWcaEvents()`, which returns a `readonly WcaEvent[]`. Used primarily by the playground's event dropdown and by tests for table-driven iteration.
- **Invariants** (enforced by tests in `tests/wca-events.test.ts`):
  - `id` values are unique
  - `id` set equals the members of the `WcaEventId` type (type-level assertion)
  - Every `label` is non-empty
  - Every `cstimerType` is non-empty
  - `length` is a non-negative integer
  - `333` and `333oh` share the same `cstimerType` (`'333'`) — documented, not a bug

## Entity: Scramble (string)

- **Kind**: plain `string`
- **Shape**: whitespace-separated move tokens, specific to the event.
- **Produced by**: `getScramble` — no wrapper type; stays as a primitive.
- **Validation**: None on our side. We trust upstream `cstimer_module` output. If upstream returns empty, we throw.

## Entity: ScrambleImage (string)

- **Kind**: plain `string` containing an SVG document.
- **Shape**: starts with `<svg ...>` and ends with `</svg>`.
- **Produced by**: `getImage` — no wrapper type; stays as a primitive so callers can inline via `innerHTML`, serve as data URL, or save to disk.
- **Validation**: Minimal — we re-throw on empty output, otherwise pass through.

---

## Whitelist Table (runtime constant)

Lives in `src/wca-events.ts`. One source of truth for both the type and the runtime lookup:

```ts
// NOTE: implementation sketch — exact shape in src/wca-events.ts

// ─── WCA length constants ────────────────────────────────────────────────
// Per upstream cstimer_module README: length 0 means "use cstimer default".
// Non-zero values are WCA regulation lengths enforced by the whitelist.
const LENGTH_DEFAULT = 0;
const LENGTH_555 = 60;
const LENGTH_666 = 80;
const LENGTH_777 = 100;
const LENGTH_MINX = 70;
const LENGTH_PYRAM = 10;
const LENGTH_444BLD = 40;
const LENGTH_555BLD = 60;
const LENGTH_333MBLD = 5;

// ─── cstimer type id constants ───────────────────────────────────────────
// Opaque string ids from cstimer_module. Centralized so the rest of the
// codebase never sees these magic strings directly.
const CSTIMER_333 = '333';
const CSTIMER_222 = '222so';
const CSTIMER_444 = '444wca';
const CSTIMER_555 = '555wca';
const CSTIMER_666 = '666wca';
const CSTIMER_777 = '777wca';
const CSTIMER_333BLD = '333ni';
const CSTIMER_333FM = '333fm';
const CSTIMER_CLOCK = 'clkwca';
const CSTIMER_MINX = 'mgmp';
const CSTIMER_PYRAM = 'pyrso';
const CSTIMER_SKEWB = 'skbso';
const CSTIMER_SQ1 = 'sqrs';
const CSTIMER_444BLD = '444bld';
const CSTIMER_555BLD = '555bld';
const CSTIMER_333MBLD = 'r3ni';

// ─── Whitelist table ─────────────────────────────────────────────────────
export const WCA_EVENTS = [
  { id: '333',     label: '3x3x3 Cube',       cstimerType: CSTIMER_333,     length: LENGTH_DEFAULT  },
  { id: '222',     label: '2x2x2 Cube',       cstimerType: CSTIMER_222,     length: LENGTH_DEFAULT  },
  { id: '444',     label: '4x4x4 Cube',       cstimerType: CSTIMER_444,     length: LENGTH_DEFAULT  },
  { id: '555',     label: '5x5x5 Cube',       cstimerType: CSTIMER_555,     length: LENGTH_555      },
  { id: '666',     label: '6x6x6 Cube',       cstimerType: CSTIMER_666,     length: LENGTH_666      },
  { id: '777',     label: '7x7x7 Cube',       cstimerType: CSTIMER_777,     length: LENGTH_777      },
  { id: '333bld',  label: '3x3 Blindfolded',  cstimerType: CSTIMER_333BLD,  length: LENGTH_DEFAULT  },
  { id: '333fm',   label: '3x3 Fewest Moves', cstimerType: CSTIMER_333FM,   length: LENGTH_DEFAULT  },
  { id: '333oh',   label: '3x3 One-Handed',   cstimerType: CSTIMER_333,     length: LENGTH_DEFAULT  },
  { id: 'clock',   label: 'Clock',            cstimerType: CSTIMER_CLOCK,   length: LENGTH_DEFAULT  },
  { id: 'minx',    label: 'Megaminx',         cstimerType: CSTIMER_MINX,    length: LENGTH_MINX     },
  { id: 'pyram',   label: 'Pyraminx',         cstimerType: CSTIMER_PYRAM,   length: LENGTH_PYRAM    },
  { id: 'skewb',   label: 'Skewb',            cstimerType: CSTIMER_SKEWB,   length: LENGTH_DEFAULT  },
  { id: 'sq1',     label: 'Square-1',         cstimerType: CSTIMER_SQ1,     length: LENGTH_DEFAULT  },
  { id: '444bld',  label: '4x4 Blindfolded',  cstimerType: CSTIMER_444BLD,  length: LENGTH_444BLD   },
  { id: '555bld',  label: '5x5 Blindfolded',  cstimerType: CSTIMER_555BLD,  length: LENGTH_555BLD   },
  { id: '333mbld', label: '3x3 Multi-Blind',  cstimerType: CSTIMER_333MBLD, length: LENGTH_333MBLD  },
] as const satisfies readonly WcaEvent[];

// Derive the lookup map (id → event) from the array.
export const WCA_EVENT_BY_ID: Readonly<Record<WcaEventId, WcaEvent>> = /* reduce */;
```

The `as const satisfies readonly WcaEvent[]` pattern guarantees:

- The array is immutable
- Each entry conforms to `WcaEvent`
- The inferred `id` literals are preserved for downstream type-level use

The `LENGTH_*` and `CSTIMER_*` constants are **module-private** (not exported) — they exist only to make the table self-documenting and to eliminate repeated magic values. Consumers should always go through `getWcaEvents()` / `WCA_EVENT_BY_ID`, never touch these constants directly.
