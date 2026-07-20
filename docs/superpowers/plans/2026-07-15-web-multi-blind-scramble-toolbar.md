# Web Multi-Blind Scramble Toolbar Implementation Plan

**Spec**: `docs/superpowers/specs/2026-07-15-web-multi-blind-scramble-toolbar-design.md`

1. Expose the web MBLD default/min/max cube-count contract and let timer
   generation options accept the selected count.
2. Add localized MBLD navigation and settings copy plus project-owned previous
   and next icons.
3. Add timer-page regression tests for one-cube display, boundary navigation,
   selected-cube image rendering, full-group refresh, and settings apply/cancel.
4. Split MBLD generator output for display while retaining the full group for
   solve persistence.
5. Render the MBLD-only toolbar and low-frequency cube-count dialog; keep other
   events on the single refresh control.
6. Run focused tests, typecheck, build, scoped checks, and mobile/desktop browser
   verification.
