# Web Scramble Text Auto-Fit Design Spec

**Date**: 2026-07-15
**Scope**: `apps/web` timer scramble text sizing
**Out of scope**: scramble generation, timer-zone dimensions, scramble toolbar layout, formula typography

## Goal

Use the fixed scramble text viewport more effectively by selecting the largest
readable font size that fits the current scramble in the available width and
height.

## Why Length Tiers Are Not Enough

The current `regular` / `compact` / `dense` thresholds only count moves. They do
not account for token width (`R` versus `3Rw2`), generated line breaks, the
current viewport, font metrics, or the actual height available above the
scramble toolbar. Two scrambles in the same tier can therefore need noticeably
different sizes.

## Sizing Contract

- Keep the existing fixed scramble text viewport and toolbar allocation.
- Measure the rendered text against the viewport's real content width and
  height, including wrapping and generated line breaks.
- Choose the largest fitting font size with a bounded binary search.
- Fit against a deliberately smaller safe area: reserve the larger of `16px`
  or `4%` of the viewport width, and the larger of `12px` or `6%` of the
  viewport height.
- After the search finds the largest fitting value, subtract a `0.5px` safety
  step and round downward to the nearest `0.25px`. This guards against browser
  sub-pixel rounding and small font-metric changes after measurement.
- Clamp the result between CSS-owned minimum and maximum sizes so short
  scrambles do not become oversized and extreme scrambles remain readable.
- Recalculate when the scramble changes, the text viewport resizes, or fonts
  finish loading.
- Round the applied size to a stable sub-pixel step to prevent resize loops and
  visual jitter.
- Keep `regular` / `compact` / `dense` as a no-JavaScript and first-measurement
  fallback only; the measured size becomes the final rendered size.
- Loading and error copy use the fallback size and do not participate in
  scramble auto-fit measurement.

## Responsive Bounds

- Desktop/tablet maximum: `2rem` (`32px`) so a short scramble remains clearly
  subordinate to the timer instead of filling the entire text viewport.
- Mobile maximum: `1.5rem` (`24px`) to preserve the same hierarchy on compact
  screens.
- Minimum: no smaller than `0.75rem` in normal portrait layouts.
- If text still cannot fit at the minimum, keep the existing scroll fallback;
  never clip or truncate scramble content.

## Runtime Boundary

- `ScrambleText` owns measurement because it owns the text node and its font
  styling.
- The parent timer page continues to own only the fixed viewport dimensions and
  event-specific alignment rules.
- Use `ResizeObserver` with cleanup; do not add global resize listeners per
  scramble.
- Do not persist the computed size or expose it as app preference state.

## Accessibility And Stability

- Preserve the complete scramble as selectable text and screen-reader content.
- Do not truncate, clamp lines, or replace the text with a canvas.
- Avoid size animation; a new scramble should settle directly on its measured
  size.
- Respect browser zoom and user font metrics by measuring after layout rather
  than estimating from character count alone.

## Acceptance Criteria

- A long 7×7 scramble uses more of the available text viewport than the current
  dense-tier size without entering the reserved width or height buffer.
- Short 3×3 and one-cube MBLD scrambles stay within the defined maximum and do
  not dominate the timer.
- Megaminx and other generated multiline scrambles preserve their line breaks.
- Resizing between desktop and mobile recomputes the size without horizontal
  overflow or visible resize loops.
- Unsupported `ResizeObserver` environments retain the existing density-tier
  fallback.
- Unit tests cover bounded fit selection, fallback behavior, scramble changes,
  resize-triggered recalculation, and the post-fit safety step.
- Focused tests, typecheck, build, and browser checks pass at representative
  short, medium, dense, desktop, and mobile cases.
