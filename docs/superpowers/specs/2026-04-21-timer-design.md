# Cubegin Timer — Design Spec

**Date**: 2026-04-21
**Scope**: `packages/timer` (new) + `apps/web` timer feature
**Out of scope this iteration**: solve history, stats (ao5/ao12), wx-app implementation

---

## 1. Goals

Build a minimalist Rubik's cube timer in `apps/web` that:

- Displays a WCA scramble + scramble image before timing starts
- Supports switching between all 17 WCA event types
- Times a solve with millisecond precision
- Shows the result with the scramble (for post-solve review)
- Extracts reusable timer logic into `packages/timer` for future wx-app reuse

---

## 2. Architecture

### Module boundaries

```
packages/
  timer/            # NEW — pure timing logic, platform-agnostic
  scramble/         # EXISTING — WCA scramble generation + SVG image

apps/
  web/
    src/
      layout/       # AppShell: collapsible sidebar + main area
      timer/        # Timer page: UI components + gesture hooks
      routes.tsx    # Route definitions (only /timer this iteration)
      App.tsx
```

### packages/timer exports

Pure functions only — no React dependency, usable in any platform (Node, browser, wx-app).

```ts
// Core timer factory
export function createTimer(): Timer;

// Display utility — format raw ms for UI display
export function formatElapsed(ms: number, decimals: 0 | 1 | 2 | 3 = 3): string;
// formatElapsed(12347, 3) → "12.347"
// formatElapsed(12347, 2) → "12.34"
// formatElapsed(12347, 0) → "12"
```

### apps/web — useTimer hook

React hook lives in `apps/web/src/timer/hooks/use-timer.ts`, not in the package:

```ts
// Thin wrapper over createTimer(); drives re-renders via requestAnimationFrame
export function useTimer(): {
  state: TimerState;
  elapsed: number; // real-time ms when running; final ms when stopped
  start: () => void;
  stop: () => number;
  reset: () => void;
};
```

This keeps `packages/timer` platform-agnostic (follows the same convention as `packages/scramble`).

### TimerState

```ts
type TimerState =
  | { status: 'idle' }
  | { status: 'running'; startTime: number }
  | { status: 'stopped'; elapsed: number };
```

### Timer interface

```ts
interface Timer {
  getState(): TimerState;
  start(): void; // idle → running
  stop(): number; // running → stopped; returns elapsed ms
  reset(): void; // any state → idle
}
```

State transitions: `idle → running → stopped → idle`
Illegal calls (e.g., `stop()` when idle) are no-ops, no exceptions thrown.
Timing uses `performance.now()` for sub-millisecond accuracy.

---

## 3. Navigation Shell

### Desktop (≥ 640px)

Left sidebar, collapsible:

- **Expanded** (128px): logo + text nav items (计时 / 历史 / 设置)
- **Collapsed** (44px): icon-only nav items
- Toggle button (⊞ / ⊟) persisted to `localStorage`

### H5 (< 640px)

No bottom tabbar. Same sidebar pattern as Claude/ChatGPT mobile:

- Sidebar hidden by default
- Toggle icon button (⊞) in top-left corner of main content area
- Tap toggle → sidebar slides in as a drawer overlay from the left
- Tap overlay backdrop → closes drawer

### This iteration

Only the **计时** tab is implemented. 历史 and 设置 tabs are rendered but disabled/placeholder.

---

## 4. Timer Page — States & Components

### State machine

```
scramble → timing → result
              ↑ cancel       ↓ continue / discard
           scramble ←─────── scramble
```

### Component tree

```
TimerPage
├── ScrambleView          # state: scramble
│   ├── EventSelector     # WCA event dropdown (@deweyou-design Select)
│   ├── ScrambleText      # scramble formula + ↻ refresh button
│   └── ScrambleImage     # SVG from @cubegin/scramble getImage()
│
├── TimingView            # state: timing
│   ├── CancelZone        # top strip — activates on H5 swipe-up
│   └── ElapsedDisplay    # large monospace digits, updates via rAF
│
└── ResultView            # state: result
    ├── ElapsedDisplay    # final time (3 decimal places)
    ├── ScrambleCollapse  # native <details>, shows scramble for review
    └── ResultActions     # +2 / DNF buttons + "不记录" ghost link
```

### Component / design token mapping

| Element                  | Component                                   | Notes                                                                                       |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| WCA event selector       | `Select`                                    | All 17 WCA events from `getWcaEvents()`                                                     |
| ↻ refresh scramble       | `Button` variant=`ghost` size=`sm`          |                                                                                             |
| +2                       | `Button` variant=`outlined` color=`neutral` |                                                                                             |
| DNF                      | `Button` variant=`outlined` color=`danger`  |                                                                                             |
| 「不记录」discard        | `Button` variant=`link` color=`neutral`     | Low-visibility ghost link                                                                   |
| Elapsed display          | `<span>`                                    | `font-family: var(--ui-font-mono)`, custom large size — outside Text component's type scale |
| Scramble text            | `Text` variant=`caption`                    |                                                                                             |
| Scramble review (result) | `<details>` + `Text` variant=`caption`      | Native collapsible                                                                          |

---

## 5. Interaction Design

### Desktop

| Trigger                 | Action                                   |
| ----------------------- | ---------------------------------------- |
| Hold `Space`            | Enter timing UI immediately, start timer |
| Release `Space`         | Stop timer, go to result                 |
| `Escape` (while timing) | No-op (no cancel on desktop)             |

### H5

**Starting:**

- Long press anywhere (> 300ms `touchstart`) → immediately switch to timing UI, start timer

**While timing — cancel gesture:**

- Timer UI shows a faint "↑ 上滑取消" hint at the top
- Finger swipes up into the top cancel zone → zone turns red, elapsed display dims
- Release finger:
  - In cancel zone → `reset()`, return to scramble page (same scramble, not regenerated)
  - Outside cancel zone → `stop()`, go to result

**Why long-press (not tap):** Prevents accidental starts when tapping the ↻ refresh button or the event selector in the scramble view.

### Timing display precision

- **While running**: 2 decimal places (`12.34`) — rendered via `requestAnimationFrame` (~60fps), smooth without jank
- **When stopped**: 3 decimal places (`12.347`) — static value, full precision
- Raw `elapsed` ms is always full precision; `formatElapsed` handles display rounding only

### Result page actions

- **+2**: marks the solve as +2 penalty (UI state only, no persistence this iteration)
- **DNF**: marks as did-not-finish (UI state only)
- **「不记录」**: discards result silently, returns to scramble page
- **Tap anywhere else**: proceeds to next scramble (new scramble generated)

---

## 6. Scramble & Image

- Scramble generated via `@cubegin/scramble` `getScramble(eventId)`
- Image rendered via `getImage(scramble, eventId)` → SVG string → `dangerouslySetInnerHTML`
- New scramble generated when: page loads, user taps ↻, user taps result to continue
- Cancel does NOT regenerate scramble (user returns to same scramble)

---

## 7. Testing Plan

### packages/timer

All logic tested with vitest, co-located at `src/timer.test.ts` and `src/format.test.ts`:

**createTimer:**

- Initial state is `idle`
- `start()` transitions to `running`
- `stop()` transitions to `stopped` and returns elapsed ms > 0
- `reset()` from any state returns to `idle`
- Calling `stop()` when idle is a no-op (no throw)
- Calling `start()` when already running is a no-op
- `elapsed` increases monotonically while running

**formatElapsed:**

- `(0, 3)` → `"0.000"`
- `(1500, 3)` → `"1.500"`
- `(12347, 3)` → `"12.347"`
- `(12347, 2)` → `"12.34"` (truncate, not round)
- `(12347, 0)` → `"12"`
- `(3600000, 3)` → `"3600.000"` (no minute formatting this iteration)

**useTimer (renderHook, in apps/web):**

- Initial state is `idle`, elapsed is 0
- After `start()`, state becomes `running`
- After `stop()`, state becomes `stopped`, elapsed is final value
- After `reset()`, state returns to `idle`

### apps/web

- `useTimerGesture`: unit test long-press threshold, cancel zone detection logic
- `EventSelector`: renders all 17 WCA events, onChange fires with correct event id
- `ScrambleView`: renders scramble text and SVG image
- `ResultView`: shows correct elapsed, shows scramble in collapsible, +2/DNF/discard actions work

---

## 8. wx-app Design (Next Iteration Reference)

Interaction design is identical to H5. Implementation notes for when wx-app is built:

**Navigation:**
Use Taro `CustomTabBar` for the sidebar. Default hidden; toggle icon in top-left opens drawer overlay. Same visual design as H5 drawer.

**Timer logic:**
`createTimer()` and `formatElapsed()` from `packages/timer` are imported directly — no changes needed.

**Gesture implementation:**
Use `bindtouchstart` / `bindtouchmove` / `bindtouchend` on a full-screen view. Long-press detection: if `touchend` fires < 300ms after `touchstart`, treat as tap (refresh scramble), otherwise start timer. Swipe-up cancel: same Y-axis threshold logic as H5 `useTimerGesture`.

**SVG scramble image — known technical risk:**
WeChat miniprogram cannot render raw SVG strings via `innerHTML`. Options to investigate:

1. Render SVG in a `<web-view>` component (requires a hosted URL)
2. Convert SVG to Canvas drawing commands at build time
3. Use an image URL if `@cubegin/scramble` adds a data-URI export

This is the primary technical risk for the wx-app iteration. Resolve before writing the implementation plan.

**State machine:**
scramble → timing → result flow is identical. Same component responsibilities, different Taro component primitives.
