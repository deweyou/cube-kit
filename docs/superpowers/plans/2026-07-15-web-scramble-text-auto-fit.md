# Web Scramble Text Auto-Fit Implementation Plan

**Spec**: `docs/superpowers/specs/2026-07-15-web-scramble-text-auto-fit-design.md`

1. Add pure sizing helpers for buffered available dimensions and safe bounded
   font-size selection; cover them with unit tests first.
2. Add a `ScrambleText` measurement lifecycle using its parent viewport,
   `ResizeObserver`, and font-ready remeasurement, with fallback behavior when
   measurement APIs are unavailable.
3. Expose CSS-owned minimum and maximum pixel bounds for component, desktop,
   mobile, and compact-landscape contexts while retaining density tiers as the
   first-render fallback.
4. Update timer layout tests and repository workflow documentation for the new
   runtime ownership boundary.
5. Run focused tests, scoped formatting/lint, web typecheck, production build,
   and browser verification for short 3×3, dense 7×7, multiline, desktop, and
   mobile cases, including proof that measured text stays inside the safety
   buffer.
