---
name: cubegin-interface
description: Compact, neutral tooling surfaces for cube practice and diagnostics.
version: 1
tokens:
  color:
    canvas: '#f4f6f7'
    surface: '#ffffff'
    text: '#172026'
    primary: '#257b6e'
  typography:
    control: 'Inter, ui-sans-serif, system-ui, sans-serif'
    content: 'inherit'
  spacing:
    rhythm: '4px'
---

# Cubegin Design

Cubegin interfaces are quiet, compact tools. Content and puzzle state remain
primary; borders, spacing, and restrained emerald emphasis establish hierarchy.

## Design Thesis

Use neutral surfaces and dense, inspectable layouts that keep generation,
diagnostics, and puzzle output visible together. Avoid presentation-heavy
treatment in workbench and timer surfaces.

## Principles

- Prefer one clear workbench hierarchy over nested cards.
- Use borders before shadows and emerald only for selection or primary action.
- Keep developer metadata readable without competing with the scramble or timer.
- Reflow columns into one vertical sequence on narrow screens without horizontal
  page overflow.

## Typography

- Use the existing system sans stack for controls and diagnostics.
- Keep tool headings compact; do not use hero-scale display type inside app
  surfaces.
- Preserve formulas in readable plain text with wrapping where necessary.

## Color

- Canvas is cool neutral gray; panels are white.
- Primary emerald identifies active tabs, selected rows, focus, and the main
  action.
- Dark neutral buttons own secondary utility actions.
- Red is reserved for actionable errors.

## Layout

- Use a 4px spacing rhythm and 6-8px control/panel radii.
- Desktop workbenches may place controls, results, and previews side by side.
- At narrow breakpoints, stack panels in workflow order and keep page tabs
  horizontally scrollable.

## Components

- Prefer native inputs and selects for developer workbench controls.
- Reuse bordered panels, compact diagnostic definition lists, selected rows, and
  segmented controls already present in the apps.
- Keep empty, loading, error, selected, disabled, focus, and hover states
  explicit.

## Interaction

- Preserve deterministic `?seed=<integer>` playground paths.
- Disable long-running primary actions while work is in progress.
- Keep stable machine identifiers visible in developer-facing surfaces.

## Accessibility

- Associate every field with an accessible label.
- Preserve keyboard focus rings and native keyboard behavior.
- Maintain readable contrast and avoid page-level horizontal overflow at 320px
  and above.

## Do

- Reuse existing tokens and control patterns.
- Show routing metadata near the control that owns it.
- Verify significant UI changes in desktop and mobile browser viewports.

## Don't

- Add gradients, glass effects, decorative shadows, or arbitrary new colors.
- Hide errors or replace stable identifiers with display-only labels.
- Move package-owned behavior into an app solely to simplify rendering.

---

_Last updated: 2026-07-27 | Reason: capture the existing Cubegin tool-interface contract during playground training integration_
