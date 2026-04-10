/**
 * WCA event whitelist.
 *
 * This is the single source of truth mapping the public {@link WcaEventId}
 * (WCA-official short codes) to `cstimer_module`'s internal scramble type
 * ids and WCA regulation scramble lengths.
 *
 * The `LENGTH_*` and `CSTIMER_*` constants below are module-private — they
 * exist to eliminate magic values from the table and to document intent.
 * Consumers should always go through {@link getWcaEvents} or
 * {@link WCA_EVENT_BY_ID}, never touch these constants directly.
 */

// ─── WCA scramble-length constants (passed to cstimer_module.getScramble) ──
// A length of 0 means "use cstimer_module's default length" for that type.
const LENGTH_DEFAULT = 0;
const LENGTH_555 = 60;
const LENGTH_666 = 80;
const LENGTH_777 = 100;
const LENGTH_MINX = 70;
const LENGTH_PYRAM = 10;
const LENGTH_444BLD = 40;
const LENGTH_555BLD = 60;
const LENGTH_333MBLD = 5;

// ─── cstimer_module internal type-id constants ─────────────────────────────
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

/**
 * Public WCA event identifiers. These are the WCA-official short codes (e.g.
 * `333` for "3x3x3 Cube"), chosen so this package's API stays decoupled from
 * cstimer_module's opaque internal type ids.
 *
 * Note: `333` and `333oh` share the same underlying cstimer scramble algorithm
 * but are exposed as separate events so UIs can list them independently.
 */
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

/**
 * A single WCA event's metadata.
 */
export interface WcaEvent {
  /** WCA short code; public identifier used by {@link getScramble} and {@link getImage}. */
  id: WcaEventId;
  /** Human-readable label suitable for UI. */
  label: string;
  /** Underlying cstimer_module scramble type id (normally hidden from consumers). */
  cstimerType: string;
  /** WCA regulation scramble length (0 = use cstimer_module default). */
  length: number;
}

/**
 * Input accepted by {@link getScramble} / {@link getImage}.
 *
 * `WcaEventId | (string & {})` is a TypeScript idiom: it widens the type to
 * accept any string (the escape hatch for non-WCA cstimer scramble types like
 * `f2l` / `lsell`) while preserving literal autocomplete for the 17 WCA ids.
 */
export type ScrambleType = WcaEventId | (string & {});

export const WCA_EVENTS = [
  { id: '333', label: '3x3x3 Cube', cstimerType: CSTIMER_333, length: LENGTH_DEFAULT },
  { id: '222', label: '2x2x2 Cube', cstimerType: CSTIMER_222, length: LENGTH_DEFAULT },
  { id: '444', label: '4x4x4 Cube', cstimerType: CSTIMER_444, length: LENGTH_DEFAULT },
  { id: '555', label: '5x5x5 Cube', cstimerType: CSTIMER_555, length: LENGTH_555 },
  { id: '666', label: '6x6x6 Cube', cstimerType: CSTIMER_666, length: LENGTH_666 },
  { id: '777', label: '7x7x7 Cube', cstimerType: CSTIMER_777, length: LENGTH_777 },
  { id: '333bld', label: '3x3 Blindfolded', cstimerType: CSTIMER_333BLD, length: LENGTH_DEFAULT },
  { id: '333fm', label: '3x3 Fewest Moves', cstimerType: CSTIMER_333FM, length: LENGTH_DEFAULT },
  { id: '333oh', label: '3x3 One-Handed', cstimerType: CSTIMER_333, length: LENGTH_DEFAULT },
  { id: 'clock', label: 'Clock', cstimerType: CSTIMER_CLOCK, length: LENGTH_DEFAULT },
  { id: 'minx', label: 'Megaminx', cstimerType: CSTIMER_MINX, length: LENGTH_MINX },
  { id: 'pyram', label: 'Pyraminx', cstimerType: CSTIMER_PYRAM, length: LENGTH_PYRAM },
  { id: 'skewb', label: 'Skewb', cstimerType: CSTIMER_SKEWB, length: LENGTH_DEFAULT },
  { id: 'sq1', label: 'Square-1', cstimerType: CSTIMER_SQ1, length: LENGTH_DEFAULT },
  { id: '444bld', label: '4x4 Blindfolded', cstimerType: CSTIMER_444BLD, length: LENGTH_444BLD },
  { id: '555bld', label: '5x5 Blindfolded', cstimerType: CSTIMER_555BLD, length: LENGTH_555BLD },
  { id: '333mbld', label: '3x3 Multi-Blind', cstimerType: CSTIMER_333MBLD, length: LENGTH_333MBLD },
] as const satisfies readonly WcaEvent[];

/**
 * Compile-time exhaustiveness check: every {@link WcaEventId} MUST appear in
 * {@link WCA_EVENTS}. If you add a new id to the union, TypeScript will fail
 * here until you add a matching entry above. Purely type-level — no runtime
 * artifact — so `noUnusedLocals` is satisfied.
 */
type _AssertAllWcaEventIdsCovered =
  Exclude<WcaEventId, (typeof WCA_EVENTS)[number]['id']> extends never ? true : never;
export type _WcaEventIdCoverageProof = _AssertAllWcaEventIdsCovered;

/**
 * O(1) lookup from {@link WcaEventId} to its {@link WcaEvent} metadata.
 */
export const WCA_EVENT_BY_ID: Readonly<Record<WcaEventId, WcaEvent>> = Object.freeze(
  WCA_EVENTS.reduce(
    (acc, event) => {
      acc[event.id] = event;
      return acc;
    },
    {} as Record<WcaEventId, WcaEvent>,
  ),
);

/**
 * Returns the full list of supported WCA events. The same reference is
 * returned on every call — do not mutate the result.
 */
export const getWcaEvents = (): readonly WcaEvent[] => WCA_EVENTS;
