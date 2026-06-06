# Timer Workflow

```mermaid
stateDiagram-v2
    [*] --> Scramble
    Scramble --> Timing: start button or Enter
    Timing --> Result: Enter or touch stop
    Timing --> Scramble: cancel zone
    Result --> Scramble: continue / +2 / DNF saves
    Result --> Scramble: delete discards
    Scramble --> Scramble: event or session change / refresh
```

The web timer keeps solve flow in `TimerPage`: package code supplies timer math
and session rules, while React hooks own browser input, animation, and web
storage integration.

## Key Rules

- `TimerPage` owns the current scramble text, page state, final elapsed result,
  session panel, and solve detail state. See
  [apps/web/src/timer/timer-page.tsx#L24](../apps/web/src/timer/timer-page.tsx#L24).
- `@cubegin/timer` is platform-agnostic state only. It uses `performance.now()`
  and exposes `start`, `stop`, `reset`, and `getState` through
  [packages/timer/src/timer.ts#L13](../packages/timer/src/timer.ts#L13).
- `@cubegin/timer-session` is platform-agnostic solve/session logic. It owns
  solve records, protected default sessions, custom session deletion rules,
  penalty display, reverse list numbering, and event/session transition rules.
- The web app persists sessions and solves in IndexedDB through
  [apps/web/src/timer/storage/timer-session-db.ts#L1](../apps/web/src/timer/storage/timer-session-db.ts#L1).
  If IndexedDB cannot open, the page falls back to in-memory storage and shows a
  storage warning.
- `useTimer` bridges the core timer to React with `requestAnimationFrame`; keep
  RAF cleanup on stop, reset, and unmount. See
  [apps/web/src/timer/hooks/use-timer.ts#L5](../apps/web/src/timer/hooks/use-timer.ts#L5).
- `useTimerGesture` owns browser input. Enter starts/stops when focus is not in
  a form control. Space keeps the existing ready-on-keydown, start-on-keyup
  flow; touch starts after a 300 ms long press and can cancel in the top zone.
  See [apps/web/src/timer/hooks/use-timer-gesture.ts#L29](../apps/web/src/timer/hooks/use-timer-gesture.ts#L29).
- Changing the WCA event switches to that event's protected default session.
  Changing a session switches the current event from the newest solve when
  present, from the default session event when the default session is empty, and
  leaves the event unchanged for an empty custom session.
- Cancel returns to the same scramble for review. Continue, +2, and DNF save a
  solve before generating the next scramble; delete skips persistence and still
  advances to the next scramble.

## Key Files

- [apps/web/src/timer/timer-page.tsx#L10](../apps/web/src/timer/timer-page.tsx#L10) - page states.
- [apps/web/src/timer/views/scramble-view.tsx#L15](../apps/web/src/timer/views/scramble-view.tsx#L15) - scramble UI and SVG rendering entry.
- [apps/web/src/timer/hooks/use-timer-sessions.ts#L1](../apps/web/src/timer/hooks/use-timer-sessions.ts#L1) - React bridge around session storage and rules.
- [apps/web/src/timer/storage/timer-session-db.ts#L1](../apps/web/src/timer/storage/timer-session-db.ts#L1) - IndexedDB adapter for web solve persistence.
- [packages/timer-session/src/session-rules.ts#L1](../packages/timer-session/src/session-rules.ts#L1) - default/custom session and event/session transition rules.
- [apps/web/src/timer/components/scramble-image.tsx#L5](../apps/web/src/timer/components/scramble-image.tsx#L5) - inline SVG boundary.
- [packages/timer/src/format.ts#L1](../packages/timer/src/format.ts#L1) - elapsed time formatting.

## Open Questions

- TODO: Confirm whether the WeChat miniprogram should mirror the web timer
  gesture model or use native mini-program interactions.

---

_Last updated: 2026-06-06 | Reason: add persisted solve sessions and result actions_
