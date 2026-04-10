# Feature Specification: WCA Scramble Generation & Visualization

**Feature Branch**: `20260410-cstimer-module-packages`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "Use cstimer_module to implement WCA official scramble generation and scramble-image generation APIs in `packages/scramble`, plus a playground to verify results, with full unit tests."

## Context & Scope Note

The `@cubekit/scramble` package currently contains a generic **text scramble animation utility** (unrelated to cubing). Per the project constitution, CubeKit's primary goal is Rubik's cube tooling — the existing text animation code is early scaffolding that predates any real scrambler implementation. This feature **repurposes** `packages/scramble` to host the WCA cube-scramble + scramble-image API. The existing text-animation code will be removed (callers elsewhere in the repo: none at time of writing — verified by grep during plan step).

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Generate a WCA scramble for any standard event (Priority: P1)

As a speedsolver, I want to request a scramble for any WCA event (3x3, 2x2, 4x4–7x7, 3BLD, FMC, Clock, Megaminx, Pyraminx, Skewb, Square-1, Multi-BLD) and receive a scramble string that matches csTimer / WCA official output for that event.

**Why this priority**: This is the core value of the package. Every downstream app (timer, practice, trainer) depends on it. Without it, nothing else in the project is useful.

**Independent Test**: Import the package, call `getScramble('333')`, receive a non-empty string of moves. For every supported event, verify the returned scramble is syntactically valid (only legal tokens for that event) and has a plausible length.

**Acceptance Scenarios**:

1. **Given** a caller wants a 3x3 scramble, **When** they call the scramble API with event id `'333'`, **Then** they receive a string containing only tokens from the 3x3 WCA move set (e.g. `R U R' U'`, `F2`, `D`, wide moves where applicable).
2. **Given** a caller wants a scramble for every supported WCA event, **When** they iterate over the list of supported events and request one scramble each, **Then** every request returns a non-empty string and no request throws.
3. **Given** a caller provides a fixed random seed, **When** they request the same event twice with the same seed, **Then** both calls return identical scramble strings (reproducibility).
4. **Given** a caller requests an unsupported event id, **When** the API is called, **Then** it throws or returns a structured error with a clear message listing valid event ids.

---

### User Story 2 — Render a visual preview of a scramble (Priority: P1)

As a user of the package, I want to pass a scramble string and an event id into an image API and receive an SVG string I can inline into a page (web), a Taro view, or save to disk. The image must match how csTimer / WCA regulation tools draw that puzzle state.

**Why this priority**: A scramble string alone is not useful to humans without a visual — the image is how users verify they applied the scramble correctly. The upstream `cstimer_module.getImage` already ships this capability; wrapping it is the minimum viable value-add.

**Independent Test**: Call the image API with a known 3x3 scramble and assert the returned value is a non-empty SVG string containing a `<svg>` root element.

**Acceptance Scenarios**:

1. **Given** a valid 3x3 scramble string, **When** the image API is called with event id `'333'`, **Then** an SVG string is returned whose root element is `<svg …>` and whose size can be read back by a DOM parser.
2. **Given** a scramble for each supported event, **When** the image API is called once per event, **Then** each call returns a non-empty SVG (the shape of the puzzle changes per event but the format is the same).
3. **Given** an empty scramble string (solved state), **When** the image API is called, **Then** an SVG depicting the solved puzzle is returned.
4. **Given** an invalid event id, **When** the image API is called, **Then** it throws or returns a structured error.

---

### User Story 3 — Playground to visually verify generation & rendering (Priority: P2)

As a developer working on the package, I want a local playground page where I can pick an event from a dropdown, click "Generate", and see (a) the generated scramble text and (b) the rendered scramble image side by side — so I can visually spot regressions without writing a consuming app.

**Why this priority**: Speeds up iteration during development and gives reviewers a quick sanity check. Not shipped to end users, so lower priority than the API itself.

**Independent Test**: Run the playground dev command from inside the package, open the printed URL in a browser, pick an event, click Generate, and observe both the scramble string and an inline SVG appearing on the page.

**Acceptance Scenarios**:

1. **Given** the playground dev server is running, **When** I open the page in a browser, **Then** I see an event selector defaulted to 3x3 and an initially empty output area.
2. **Given** I pick any supported event and click Generate, **When** the request completes, **Then** the scramble text and SVG image appear together, and re-clicking Generate produces a different scramble.
3. **Given** I pick a different event and click Generate, **When** the response arrives, **Then** both the scramble and image update to match the newly-selected event.

---

### User Story 4 — Complete unit test coverage (Priority: P2)

As the maintainer, I want the package to have full unit test coverage for all exported functions — including happy paths, invalid inputs, seed reproducibility, and every supported event — so that future refactors can be done safely.

**Why this priority**: Enforced by the constitution (§V). Without tests the package cannot be merged.

**Independent Test**: Run `vp run test -r` from repo root. All tests must pass. Coverage for `packages/scramble/src` should include every exported symbol and every supported event id.

**Acceptance Scenarios**:

1. **Given** the test suite, **When** `pnpm test` is run, **Then** every exported function has at least one passing test.
2. **Given** the test suite, **When** it runs, **Then** there is at least one generation test per supported WCA event.
3. **Given** the test suite, **When** invalid inputs are passed, **Then** the tests assert the documented error behavior (throw or structured error).

---

### Edge Cases

- Unsupported event id → error is thrown / structured error returned with a list of valid ids.
- Empty scramble passed to the image API → returns SVG of solved state, does not throw.
- `setSeed` called with an empty string or a non-string → documented behavior (delegate to upstream; test whatever upstream does, don't silently swallow).
- Very long scramble strings (FMC, Multi-BLD) → image API must not truncate or throw.
- Playground run in a browser that does not support `<svg>` inlining → out of scope (modern evergreen browsers only).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The package MUST expose a function that returns a scramble string for a given WCA event id. The set of accepted event ids is whatever csTimer's `cstimer_module.getScramble` supports, restricted to WCA events.
- **FR-002**: The package MUST expose a function that lists the supported WCA event ids (either as a constant array or a `getSupportedEvents()` function). This is the authoritative list used for validation and for the playground dropdown.
- **FR-003**: The package MUST expose a function that takes a scramble string plus an event id and returns an SVG string depicting the resulting puzzle state.
- **FR-004**: The package MUST expose a function to set / reset the random seed so that scramble generation is deterministic when a seed is provided.
- **FR-005**: All exported functions MUST validate their inputs against the supported event list and fail fast with a descriptive error for invalid event ids.
- **FR-006**: The package MUST be platform-agnostic (pure JS/TS, no direct DOM access) so it can run in the web app, H5, WeChat miniprogram, Node, and vitest.
- **FR-007**: The existing text-scramble animation code in `packages/scramble` MUST be removed as part of this change (and any consumers migrated — at time of writing there are none). The package's `description` in `package.json` MUST be updated to reflect the new purpose.
- **FR-008**: The package MUST provide a playground that can be started via a package-local script (e.g., `pnpm --filter @cubekit/scramble playground`). The playground MUST let the user pick an event, generate a scramble, and see both the text and the SVG.
- **FR-009**: The package MUST include unit tests that cover: every exported function, every supported WCA event (at least one happy-path generation + image test per event), seed reproducibility, and error paths for invalid event ids.
- **FR-010**: The test suite MUST run under vite-plus test (`vp run test -r`) with no additional global setup required.

### Key Entities _(include if feature involves data)_

- **WCA Event**: An identifier + human label for a competition event (e.g., `333` → "3x3x3 Cube"). Attributes: id (string), label (string), category (normal / bld / fmc / other).
- **Scramble**: A string of whitespace-separated move tokens, specific to one event.
- **ScrambleImage**: An SVG document (string form) depicting the puzzle state after applying a scramble to the solved state.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For every supported WCA event, a user can generate a scramble and its image in a single call sequence without errors.
- **SC-002**: A generated 3x3 scramble applied by a solver visually matches the generated SVG image (spot-checked in the playground).
- **SC-003**: 100% of exported functions in `packages/scramble/src` have at least one passing unit test; test run is green on CI with `vp run test -r`.
- **SC-004**: The playground loads in under 2 seconds on a local dev machine and re-generates a scramble+image in under 300 ms on any supported event.
- **SC-005**: The package has zero runtime dependencies other than `cstimer_module` itself (plus dev-only deps for the playground and tests).

## Assumptions

- `cstimer_module`'s `getScramble` / `getImage` outputs are the authoritative definition of "WCA official" scrambles for this project. If the upstream library diverges from the WCA regulations, the package follows the upstream — we do not re-validate against the WCA spec directly.
- The upstream `cstimer_module` API surface is: `getScrambleTypes()`, `getScramble(type, length?)`, `getImage(scramble, type)`, `setSeed(seed)`. Exact naming will be verified during the plan step by reading the installed package.
- The playground lives inside `packages/scramble/playground/` as a tiny Vite app; it is dev-only and is NOT bundled into the published package (`files` in `package.json` stays limited to `dist`).
- WCA event coverage means the events listed in the WCA regulations as of 2026; if `cstimer_module` ships scramble types beyond WCA (e.g., relays), those are exposed but not tested exhaustively — only the WCA events are tested per event.
- The package stays platform-agnostic: the playground is a separate artifact; the core API does not touch `window` / `document`.
- Existing consumers of the text-scramble animation code: none (verified in the plan step; if any are found, they block the rewrite and we surface it).
- Taro / WeChat miniprogram support for the image API is out of scope for this feature — we verify it runs in Node and in the browser playground, and leave Taro integration for a follow-up feature if upstream SVG strings are not directly usable there.
