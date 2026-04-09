# Feature Specification: WCA Scramble Generator & Visualizer

**Feature Branch**: `20260409-scramble-generator-and-visualizer`
**Created**: 2026-04-09
**Status**: Draft
**Input**: Implement WCA-compliant scramble generation and scramble image generation in `packages/scramble`

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate WCA Scramble by Event (Priority: P1)

A developer imports `@cubekit/scramble` and calls `generateScramble('333')` to receive a WCA-compliant scramble string like `"R U R' F2 D L2 B' ..."`.

**Why this priority**: Core feature. Everything else (timer display, practice apps) depends on having valid scramble strings. Without this, the package provides no value.

**Independent Test**: Call `generateScramble` for each WCA event, verify the result is a non-empty string of valid notation moves.

**Acceptance Scenarios**:

1. **Given** a valid WCA event code (e.g. `'333'`), **When** `generateScramble('333')` is called, **Then** it returns a string of space-separated moves in standard WCA notation (e.g. `R U2 F' L ...`)
2. **Given** event code `'444'`, **When** `generateScramble('444')` is called, **Then** the scramble uses 4x4 notation (Rw, Uw, etc.)
3. **Given** event code `'minx'`, **When** `generateScramble('minx')` is called, **Then** the scramble uses Megaminx notation
4. **Given** an unknown event code, **When** `generateScramble('unknown')` is called, **Then** it throws a descriptive error
5. **Given** event code `'333'`, **When** called multiple times, **Then** each result is different (randomized)

---

### User Story 2 - Scramble Image Generation (Priority: P2)

A developer calls `generateScrambleImage('333', scrambleString)` and gets back an SVG string (or canvas instructions) depicting the cube state after applying the scramble.

**Why this priority**: Visual feedback is essential for practice apps — speedsolvers verify scrambles visually before starting. However the timer/scramble text works without images, so this is P2.

**Independent Test**: Call `generateScrambleImage` with a known scramble and verify the output is valid SVG with colored stickers.

**Acceptance Scenarios**:

1. **Given** event `'333'` and a valid scramble string, **When** `generateScrambleImage` is called, **Then** it returns an SVG string showing the cube net with correct face colors
2. **Given** event `'222'` and a valid scramble string, **When** called, **Then** it returns an SVG showing the 2x2 cube net
3. **Given** an empty scramble `''`, **When** called with event `'333'`, **Then** the SVG shows the solved state (all faces one color)
4. **Given** event `'pyram'` and a valid scramble, **When** called, **Then** returns a Pyraminx net SVG

---

### User Story 3 - All WCA Events Supported (Priority: P2)

All official WCA competitive events have a working `generateScramble` implementation.

**Why this priority**: The user explicitly requires WCA completeness. However P1 and one working event is an MVP; full coverage can be incremental.

**Independent Test**: An integration test iterates all event codes and calls `generateScramble` — all must succeed without throwing.

**WCA Events to support**:

- `333` — 3x3x3 (random-state, min2phase)
- `222` — 2x2x2 (random-state)
- `444` — 4x4x4 (random-state)
- `555` — 5x5x5 (random-state)
- `666` — 6x6x6 (random-move, 11 moves)
- `777` — 7x7x7 (random-move, 13 moves)
- `333bf` — 3x3x3 Blindfolded (same as 333)
- `333fm` — 3x3x3 Fewest Moves (same as 333)
- `333oh` — 3x3x3 One-Handed (same as 333)
- `minx` — Megaminx (random-state)
- `pyram` — Pyraminx (random-state)
- `sq1` — Square-1 (random-state)
- `skewb` — Skewb (random-state)
- `clock` — Clock (random-state)
- `444bf` — 4x4x4 Blindfolded
- `555bf` — 5x5x5 Blindfolded

**Acceptance Scenarios**:

1. **Given** each of the 16 WCA event codes above, **When** `generateScramble(eventCode)` is called, **Then** it returns a non-empty string with no errors
2. **Given** `generateScramble('333')` result, **When** validated against WCA notation rules, **Then** it passes (correct move count ~20, valid face/modifier tokens)

---

### User Story 4 - Playground for Visual Verification (Priority: P2)

A developer opens `pnpm dev:web` and navigates to the scramble playground page in `apps/web`. They can select any WCA event, click "Generate", and see the scramble string and the resulting SVG scramble image rendered immediately — allowing them to visually verify that both the scramble generator and visualizer are working correctly.

**Why this priority**: Without a visual playground, the only way to verify correctness is reading raw SVG strings in test output. A live playground is essential for quickly catching layout bugs, wrong colors, and incorrect move application.

**Independent Test**: Open the page, select "3x3x3", click Generate — a scramble string and a cube net image appear within 1 second.

**Acceptance Scenarios**:

1. **Given** the user runs `pnpm dev` inside `packages/scramble`, **When** they open `http://localhost:5173` in the browser, **Then** they see an event selector, a Generate button, and empty scramble/image output areas
2. **Given** the user selects any WCA event and clicks Generate, **When** the generator resolves, **Then** the scramble string appears as text and the SVG cube net renders below it
3. **Given** the user clicks Generate multiple times, **Then** each scramble string is different
4. **Given** the user selects a different event, **When** they click Generate, **Then** the image layout changes to match the new puzzle type

---

### User Story 5 - TypeScript-First API (Priority: P3)

All public API functions are fully typed with exported TypeScript types for event codes, scramble results, and image options.

**Why this priority**: Improves DX across the monorepo but doesn't block any other functionality.

**Independent Test**: TypeScript compilation with strict mode passes; event codes are a union literal type (not just `string`).

**Acceptance Scenarios**:

1. **Given** an IDE with TypeScript, **When** typing `generateScramble(`, **Then** autocomplete shows the `WcaEvent` union type for the first argument
2. **Given** a wrong event string like `generateScramble('999')`, **When** compiled, **Then** TypeScript reports a type error

---

### Edge Cases

- What happens when the scramble engine WASM/worker fails to initialize? → Should throw a clear error, not hang indefinitely
- Repeated calls to `generateScramble('333')` — should each be independent (no shared mutable state)
- `generateScrambleImage` with an invalid/unparseable scramble string → should return a default/solved-state image or throw with a clear message
- Server-side (Node.js) usage — SVG output must not depend on DOM APIs

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Package MUST export `generateScramble(event: WcaEvent): string` returning a WCA-compliant scramble string
- **FR-002**: Package MUST export `generateScrambleImage(event: WcaEvent, scramble: string, options?: ImageOptions): string` returning an SVG string
- **FR-003**: `generateScramble` MUST support all 16 WCA events listed in User Story 3
- **FR-004**: 3x3x3 scrambles MUST be random-state (not random-move) to comply with WCA regulations
- **FR-005**: 4x4x4 scrambles MUST be random-state per WCA regulations
- **FR-006**: 5x5x5 scrambles use random-move (60 moves); 6x6x6 uses 80 random moves; 7x7x7 uses 100 random moves — all per WCA regulations
- **FR-006b**: Megaminx scrambles use random-move R++/D-- notation (70 moves) — WCA standard for Megaminx
- **FR-007**: Package MUST export a `WcaEvent` TypeScript union type listing all valid event codes
- **FR-008**: All exports MUST be compatible with both browser (ESM) and Node.js environments
- **FR-009**: SVG image output MUST NOT depend on DOM APIs (use string-based SVG generation)
- **FR-010**: All scramble algorithms MUST be implemented from scratch in TypeScript with zero runtime dependencies, referencing cstimer (`cs0x7f/cstimer`) and DCTimer as algorithm references only
- **FR-011**: Both `generateScramble` and `generateScrambleImage` MUST be async (`Promise<string>`) to accommodate precomputation table initialization
- **FR-014**: `packages/scramble` MUST include a self-contained playground at `playground/index.html` (plain HTML + TypeScript, run via `vp dev` in the package) with an event selector, Generate button, scramble string output, and SVG image output — no React or app framework required
- **FR-012**: The visualizer API MUST be designed to support a future 3D isometric view via an `options.mode` flag (`'2d' | '3d'`); v1 only implements `'2d'` (cube net)
- **FR-013**: The old text-animation exports (`scrambleText`, `scramble`, `createScrambler`) are REMOVED — the package is fully repurposed as a cube scramble package

### Key Entities

- **WcaEvent**: String union type of all valid WCA event codes (`'333' | '222' | '444' | ...`)
- **ScrambleResult**: The generated scramble string (plain `string`)
- **ImageOptions**: Optional config for `generateScrambleImage` — includes `size`, `colorScheme`, and `mode: '2d' | '3d'` (v1 only `'2d'`)
- **CubeState**: Internal representation of a puzzle's sticker state (used by visualizer)

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `generateScramble` succeeds for all 16 WCA event codes without throwing
- **SC-002**: 3x3x3 scrambles are at least 20 moves long (WCA requires at least 20 moves)
- **SC-003**: `generateScrambleImage('333', scramble)` resolves to a string starting with `<svg` for any valid scramble
- **SC-004**: All exported functions pass TypeScript strict-mode compilation (`vp check` passes)
- **SC-005**: Unit tests achieve full coverage on all scramble generation and image rendering logic — every generator, every coordinate function, every move-table builder, every SVG renderer
- **SC-007**: Playground page renders in `apps/web` at `/playground` and successfully shows scramble + SVG for all 16 events
- **SC-006**: Existing `scrambleText` tests continue to pass (no regression)

---

## Assumptions

- The package will be used in both browser and Node.js contexts; pure JS/TS SVG output (no canvas, no DOM) is the correct approach for the visualizer
- WCA "random-state" for 3x3 requires a phase-2 solver (min2phase); if implementing from scratch proves infeasible within this feature, `cstimer_module` wrapping is acceptable
- The package `@cubekit/scramble` is fully repurposed from "text scramble animation" to "cube scramble"; the old text-animation exports are removed entirely
- Color scheme defaults: White top, Green front (standard WCA color scheme)
- v1 visualizer uses a 2D "cube net" (unfolded) layout; 3D isometric view is out of scope for v1 but the API is designed to accommodate it via `options.mode`
