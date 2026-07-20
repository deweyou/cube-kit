# Web Multi-Blind Results Design Spec

**Date**: 2026-07-16
**Scope**: WCA-style `333mbld` result entry, persistence, formatting, ranking, and web statistics
**Sources**: WCA Regulations 9f2, 9f12c, H1b, and H1d

## Goal

Record a Multi-Blind attempt as solved count, attempted count, cumulative time
penalties, and time instead of treating it as an ordinary timed solve.

```mermaid
flowchart LR
    Stop["Stop MBLD timer"] --> Entry["Enter solved count"]
    Entry --> Penalties["Enter cumulative +2 count"]
    Penalties --> Validate["Validate counts"]
    Validate --> Save["Save structured result"]
    Save --> Rank["Rank by WCA comparator"]
    Rank --> Results["Show MBLD-specific statistics"]
```

## WCA Result Contract

- An attempt records attempted puzzles, solved puzzles, and final time.
- `missedCount = attemptedCount - solvedCount`.
- `score = solvedCount - missedCount`, equivalent to
  `2 * solvedCount - attemptedCount`.
- A higher score is better.
- If scores are equal, a shorter final time is better.
- If score and final time are equal, fewer missed puzzles is better.
- The attempt is DNF when the score is below zero, only one puzzle is solved,
  or the whole attempt is disqualified.
- Multi-Blind time is truncated to whole seconds.
- Individual `+2` penalties are cumulative and are applied before the displayed
  final time is truncated to whole seconds.
- The attempt time limit is 10 minutes per attempted puzzle when fewer than 6
  puzzles are attempted, and 60 minutes when 6 or more are attempted.
- Reaching the time limit does not stop the app timer. The user stops it
  manually; a raw stopped time above the limit makes the result DNF. Cumulative
  `+2` penalties do not participate in this timeout check and may make an
  otherwise valid final displayed time exceed the limit.

## Data Model

Extend the existing `MultiBlindSolveResult` rather than encoding the result into
`elapsedMs` or `penalty`:

```ts
interface MultiBlindSolveResult {
  attemptedCount: number;
  solvedCount: number;
  timePenaltyCount: number;
}
```

- `elapsedMs` remains the raw stopped timer value.
- `multiBlind` is required for newly saved `333mbld` solves.
- `penalty: 'dnf'` represents disqualification of the whole attempt.
- The ordinary single `+2` penalty control is not used for MBLD because it cannot
  represent cumulative penalties.
- Existing stored `333mbld` records without `multiBlind` remain readable as
  legacy timed records but are excluded from WCA-style MBLD ranking until edited.

Shared timer-session code owns normalization, validity, score calculation,
display formatting, and comparison. React and IndexedDB only collect and persist
the structured fields.

## Stop And Entry Flow

Stopping an MBLD timer does not immediately create a solve record.

The timer displays the remaining MBLD attempt time. It continues running after
zero and displays overtime as `+m:ss` until the user stops it manually.

1. Freeze the raw elapsed time and enter the stopped state.
2. Open a compact `多盲成绩` / `Multi-Blind result` dialog.
3. Keep attempted count implicit because it is already fixed by the generated
   scramble group; do not add a read-only cube-count row.
4. Keep each visible label and numeric input on one compact row.
5. Default solved count to attempted count so the common all-success result can
   be saved immediately, while allowing correction from `0` through attempted
   count.
6. Default cumulative `+2` count to `0` and require it to be no greater than
   solved count.
7. Offer an explicit whole-attempt DNF toggle.
   The toggle uses the shared deweyou-ui `Checkbox`; while selected, solved
   count and cumulative `+2` stay visible but disabled. Toggling it off restores
   the preserved values for correction. Whole-attempt DNF bypasses count-field
   validation so save remains available: valid entered values are retained,
   while empty or invalid counts are normalized to `0 / 0` when persisted.
8. Do not show a live result preview; keep the dialog focused on data entry.
9. Save ordinary MBLD results only after inputs are valid. An explicit
   `本次不记录` / `Don't record` action opens a separate confirmation dialog and
   does not add the attempt to statistics until the destructive confirmation is
   accepted. Canceling the confirmation returns to the result form with inputs
   preserved. Closing or pressing Escape must not silently discard the attempt.
   Keep this secondary action visually distinct from disabled state.

After saving, the stopped feedback row exposes `编辑成绩` and delete actions for
MBLD instead of the ordinary `+2` and DNF buttons. Editing uses the same dialog.

## Formatting And Statistics

- WCA Multi-Blind uses Best of 1, Best of 2, or Best of 3 formats. It has no
  official average result, so the app must not label any MBLD aggregate as an
  average.
- Valid list rows use `<solved>/<attempted> <time>`, for example `3/5 40:30`.
- Detail surfaces additionally show score and missed count.
- Derived DNF rows show `DNF` and retain the underlying counts/time in detail.
- MBLD sessions use the WCA comparator for best and worst results.
- Timer and results summaries must not calculate ordinary elapsed-time averages,
  standard deviation, mo3, ao5, or distribution buckets for MBLD.
- MBLD summaries show total attempts, valid attempts, best result, and best score.
- The first implementation hides average score types, time distribution, and
  ordinary time-trend views for MBLD. A future score trend may plot score and use
  time only as the score tiebreaker.

## Persistence

- `AddSolveInput` accepts the structured MBLD result.
- The session repository supports updating the structured MBLD result so an
  entry mistake can be corrected from the stopped timer and result detail.
- IndexedDB needs no schema migration because solve objects are schemaless, but
  cloning and memory adapters must preserve the nested object.
- Changing the configured cube count after an attempt does not mutate existing
  records.

## Accessibility And Mobile

- The dialog uses visible labels plus the shared deweyou-ui `NumberInput` and
  `Checkbox` controls.
- Solved count exposes the attempted count as its component maximum; cumulative
  `+2` exposes the current solved count as its component maximum.
- A newly stopped attempt initializes solved count to attempted count and
  cumulative `+2` to `0`.
- Invalid values have field-specific inline errors, `aria-invalid`, and disable
  save unless whole-attempt DNF is selected. Disabled DNF fields do not expose
  stale errors or required semantics. The submit handler repeats the same
  constraints and DNF normalization as a persistence guard.
- Mobile controls remain at least 44px and respect safe-area insets.
- Focus starts on solved count and returns to the stopped timer surface after
  save or explicit discard.
- Keyboard timer shortcuts are suspended while the dialog is open.

## Acceptance Criteria

- A stopped 5-cube attempt can save `3/5 40:30`, with score `1`.
- A newly stopped 5-cube attempt opens with `5 / 0` and save already available.
- `4/7 30:00` ranks above `3/5 40:30`: both have score `1`, so the shorter time
  wins. Tests must cover this ordering explicitly to prevent intuitive but
  incorrect solved-count sorting.
- Equal score and time use fewer missed puzzles as the final tiebreak.
- A negative score or exactly one solved puzzle is DNF.
- Multiple `+2` penalties accumulate into final time.
- A 5-cube attempt starts from `50:00`; a 6-cube attempt starts from `60:00`.
- Reaching zero continues as `+m:ss`; stopping with a raw elapsed time above the
  limit derives DNF after the structured result is saved.
- Cumulative `+2` penalties can produce a valid final time above the attempt
  limit.
- Whole-attempt DNF can be saved with empty counts and persists `0 / 0`; valid
  counts entered before selecting DNF remain unchanged.
- Solved count cannot exceed attempted count, and cumulative `+2` cannot exceed
  solved count through either direct submit or button interaction.
- MBLD display is truncated to seconds.
- Ordinary events keep their existing penalty, formatting, and average behavior.
- Existing legacy MBLD records load without crashing.
- Timer page, results page, store, shared unit tests, typecheck, and mobile/desktop
  browser checks pass.

## What Can Wait

- WCA database integer encoding and competition export.
- Official round grouping and Best-of-X competition management.
- Cloud sync and cross-device conflict resolution.

---

_Last updated: 2026-07-20 | Reason: keep MBLD timing manual and derive DNF from raw overtime_
