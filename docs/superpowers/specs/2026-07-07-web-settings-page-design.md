# Web Settings Page Design

## Context

The web app currently routes `/settings` to a placeholder page. This feature
turns `/settings` into a real preferences surface and wires the selected
preferences into the timer experience.

The first version covers two preference groups:

- General: theme and language.
- Timer: WCA inspection and in-timer display mode.

The implementation must follow the selected **compact grouped page** layout:
one settings page with two visible groups, no secondary tabs, and no separate
summary panel.

## Goals

- Provide a real `/settings` page with the same product shell as the timer page.
- Persist all first-version settings across reloads.
- Put platform-agnostic preference meaning in `packages/shared`.
- Keep browser persistence, React state, theme application, and UI in `apps/web`.
- Apply language selection across all web app text except user-authored list
  names.
- Apply timer preferences to the live timer behavior.

## Non-Goals

- Custom inspection duration.
- Settings cloud sync.
- Settings import or export.
- Translating or migrating user-created list names.
- Implementing a WeChat mini program settings page.
- Moving browser APIs into `packages/shared`.

## Settings

### General

Theme preference:

- `system`: default. Follow `prefers-color-scheme`.
- `light`: force light theme.
- `dark`: force dark theme.

Language preference:

- `browser`: default. Follow the browser language; English maps to English,
  everything else falls back to Simplified Chinese for this version.
- `zh-CN`: force Simplified Chinese.
- `en`: force English.

### Timer

WCA inspection:

- Boolean setting.
- Default: disabled.
- When enabled, a solve starts with a 15 second inspection phase.

Timer display mode:

- `realtime`: default. Show the running timer as it updates.
- `seconds`: during a solve, show elapsed whole seconds only.
- `inspection-only`: during inspection, show the inspection countdown; during
  the solve, show the localized equivalent of "timing"; after stopping, show
  the final time.

Timer display mode only changes the in-progress timer display. It does not
change recorded precision, final result display, statistics, or recent results.

## UX Design

The settings page keeps the existing Cubegin app shell:

- Brand at the top.
- Floating primary navigation with Settings active.
- Same responsive behavior as the timer page.

Page content uses two compact groups:

- `General`
  - Theme segmented control.
  - Language segmented control.
- `Timer`
  - WCA inspection switch with short help text: 15 second inspection, +2 / DNF
    penalties.
  - Timer display segmented control with short help text: only affects the
    display during a solve.

All controls are instant-save. There is no save button.

Mobile layout keeps the same group order and ensures the bottom navigation does
not cover the final setting row.

## Data Boundary

`packages/shared` owns platform-agnostic preference semantics:

- Preference types.
- Default preference values.
- Unknown JSON normalization.
- Invalid enum fallback.
- Timer display formatting behavior that can be tested without React or DOM.

`apps/web` owns platform-specific behavior:

- `localStorage` persistence.
- React provider/hook for app preferences.
- Applying the resolved theme to the document.
- Resolving browser language and providing localized copy.
- Settings page UI.
- Timer page consumption of inspection and display preferences.

This keeps the future mini program path open without putting browser APIs in
shared packages.

## Timer Behavior

When WCA inspection is disabled:

- Keep the current direct-start behavior.
- Space/Enter starts timing immediately.

When WCA inspection is enabled:

- From idle, Space/Enter enters inspection.
- Inspection displays a 15 second countdown.
- During inspection, Space/Enter starts the timed solve.
- During inspection, Escape cancels and returns to idle.
- Inspection elapsed time is calculated from real time, not render ticks.

Inspection penalties:

- If inspection elapsed time is greater than 15 seconds and less than or equal
  to 17 seconds, the resulting solve gets `+2`.
- If inspection elapsed time is greater than 17 seconds, the resulting solve gets
  `DNF`.
- Penalties are written to the solve record and affect recent solves and
  statistics through the existing solve-statistics behavior.

## Language Behavior

All web app visible copy should use the resolved language:

- Primary navigation.
- Timer labels and instructions.
- Settings page labels and help text.
- List create/edit modal labels and buttons.
- Result action labels.
- Empty, loading, and error text.
- Statistics labels when they are product copy.

User-created or user-edited list names are not translated.

Event short labels such as `3x3` and `4x4` remain as current short labels.

## Theme Behavior

The web app should no longer force the timer page to light theme independently.
The resolved app theme should be applied consistently to the settings page and
timer page.

Fallbacks:

- If `matchMedia` is unavailable while following system theme, use light theme.
- If stored settings are missing, malformed, or invalid, recover to defaults.

## Testing Plan

Shared package tests:

- Defaults.
- Normalization from unknown JSON.
- Invalid enum fallback.
- Timer display formatting for `realtime`, `seconds`, and `inspection-only`.

Web tests:

- Settings persist to and restore from `localStorage`.
- Bad stored JSON recovers to defaults.
- Theme selection applies to the document.
- Language selection changes app copy.
- List names remain user-authored and untranslated.
- WCA inspection can start, cancel, apply `+2`, and apply `DNF`.
- Timer display modes affect only the in-progress timer display.

Rendered verification:

- Settings page desktop and mobile layouts.
- Light, dark, and system theme behavior.
- Chinese and English text fit without horizontal overflow.
- Bottom navigation does not cover settings controls on mobile.

## Acceptance Criteria

- `/settings` is no longer a placeholder.
- The selected settings are persisted and restored.
- The timer page consumes WCA inspection and timer display settings.
- WCA inspection penalties are recorded and reflected in statistics.
- Theme and language preferences apply across the web app.
- `packages/shared` contains only platform-agnostic preference semantics.
- Web storage and DOM theme application stay in `apps/web`.
