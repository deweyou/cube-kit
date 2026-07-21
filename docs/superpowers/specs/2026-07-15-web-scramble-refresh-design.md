# Web Scramble Refresh Button Design Spec

**Date**: 2026-07-15
**Scope**: `apps/web` timer scramble toolbar
**Out of scope**: previous-scramble history, copy action, bottom navigation, scramble generation rules

## Goal

Replace the decorative placeholder below the current scramble with one usable
refresh icon button.

## Behavior

- The button stays centered in the existing scramble toolbar slot.
- Its accessible name is localized as `刷新打乱` / `Refresh scramble`.
- Activating it generates a new scramble for the active timer list through the
  existing scramble generator.
- The button is disabled while generation is in progress, preventing duplicate
  requests, and its icon rotates as loading feedback.
- Existing loading and error text remain the source of generation status.
- Existing timer focus mode continues to hide the whole scramble strip.

## Visual Contract

- Icon-only, circular, quiet by default, and at least 36px on desktop and 44px
  on touch layouts.
- Reuse theme tokens and the timer page's current focus-ring treatment.
- Provide hover, active, focus-visible, disabled, and reduced-motion behavior.

## Acceptance Criteria

- The decorative three-bar placeholder is removed.
- One refresh icon button is exposed with the localized accessible name.
- One click produces exactly one new generator request for the active event.
- The control is disabled and visibly loading until the request settles.
- Timer tests, typecheck, and browser checks pass at mobile and desktop sizes.
