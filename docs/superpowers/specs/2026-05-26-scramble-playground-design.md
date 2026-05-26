# Scramble Playground Design

## Status

Approved for planning on 2026-05-26.

## Context

CubeKit now has standalone TNoodle-compatible scramble packages:

- `@cubekit/scramble-puzzle` owns puzzle definitions, parsing, and state transitions.
- `@cubekit/scramble-core` owns scramble generation.
- `@cubekit/scramble-image` owns SVG rendering.

The playground should make these packages easy to test manually and later through
browser automation. It should be inspired by TNoodle's form-based utility page,
but it must not copy TNoodle UI code or reconnect the new packages through the
legacy `@cubekit/scramble` package.

## Goals

- Add an independent `apps/playground` app.
- Provide a tool-page experience for generating WCA scrambles and previewing SVG
  scramble images.
- Keep `scramble-core` and `scramble-image` visible as separate capability
  surfaces in the UI.
- Include lightweight diagnostics that help debug package integration.
- Make the app test-friendly so later Playwright E2E can validate the full UI to
  package wiring path deterministically.

## Non-Goals

- Do not integrate the playground into `apps/web`.
- Do not replace package-level unit and golden tests with E2E tests.
- Do not add competition-management features such as rounds, groups, password
  encryption, PDF generation, WCA login, or scramble secrecy workflows.
- Do not change the public APIs of `scramble-core` or `scramble-image` unless
  implementation discovers a missing boundary that is needed for the playground.

## Architecture

Create `apps/playground` as a private Vite + React app in the existing pnpm
workspace. The app depends directly on:

- `@cubekit/scramble-core`
- `@cubekit/scramble-image`
- `@cubekit/scramble-puzzle`

The app owns its UI state and adapter layer. Package calls stay behind local
playground functions so tests can inject deterministic behavior without leaking
test-only concerns into the packages.

Root scripts may add:

- `dev:playground`
- `build:playground`

The existing `apps/web` and `apps/wx-app` remain unchanged.

## UI

Use a Split Workbench layout:

- Left controls panel:
  - WCA event selector
  - scramble count
  - MultiBLD cube count, shown only when useful
  - Generate button
  - Copy scrambles button
  - Download selected SVG button
- Middle `scramble-core` panel:
  - generated scramble list
  - selected scramble state
  - generation diagnostics
- Right `scramble-image` panel:
  - selected scramble SVG preview
  - render diagnostics
- Bottom manual render panel:
  - editable scramble text area
  - render button or live render behavior
  - parser/render errors

The first screen should be the usable tool, not a landing page. Styling should be
quiet and work-focused: dense but readable controls, restrained color, stable
panel sizes, and no decorative hero treatment.

## Data Flow

1. User chooses an event and count.
2. User clicks Generate.
3. The playground calls `createDefaultScrambleGenerator`.
4. The generator returns one or more `ScrambleResult` values.
5. The UI selects the first generated scramble by default.
6. The selected scramble is passed to `renderScrambleImage`.
7. The SVG string is injected into the preview container.
8. Diagnostics capture generation time, render time, scramble length, SVG byte
   size, selected event, and selected row.

Manual render skips generation and only calls `renderScrambleImage` for the
current event and text input.

## Error Handling

- Generation errors render in the `scramble-core` panel and do not clear the last
  successful SVG unless the selected scramble changes to an invalid state.
- Rendering errors render in the `scramble-image` or manual render panel.
- The UI should prevent obvious invalid inputs such as count below 1.
- `333mbld` should provide a cube-count input and still surface package errors if
  package validation fails.
- Error text should include the package error message, because this app is a
  developer-facing testing tool.

## Test Strategy

Package-level tests remain the source of truth for algorithm correctness and
TNoodle parity:

- parser and state transition tests
- generator tests
- image renderer tests
- integration and golden fixture tests

Playground tests cover app behavior and integration wiring:

- event switching updates visible controls
- Generate calls the core adapter and renders a list
- selecting a row updates the SVG preview
- manual render calls the image adapter without regenerating a scramble
- generation and render errors are shown in the correct panels
- diagnostics are updated after generation and rendering

Future E2E should use Playwright against `apps/playground`, but only as an
end-to-end smoke/integration layer. E2E should not try to exhaustively prove
scramble correctness. To keep E2E stable, the playground should expose a
deterministic test path through an injected random source, seeded random source,
or test adapter that can be selected only in test/dev context.

## Verification

Implementation should verify:

- `pnpm --filter playground test`
- `pnpm --filter playground typecheck`
- `pnpm --filter playground build`
- `pnpm --filter @cubekit/scramble-core test`
- `pnpm --filter @cubekit/scramble-image test`
- `pnpm --filter @cubekit/scramble-puzzle test`
- targeted `vp check` on the new playground files

Full `pnpm check` may continue to fail on known pre-existing app and legacy
package issues. Those failures should be reported separately from playground
verification.
