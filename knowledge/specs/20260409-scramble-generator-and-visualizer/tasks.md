# Tasks: WCA Scramble Generator & Visualizer

**Branch**: `20260409-scramble-generator-and-visualizer`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Progress: `[ ]` = pending, `[x]` = done, `[P]` = can run in parallel with sibling `[P]` tasks

---

## Phase 1 — Setup & Teardown Old Code

- [ ] **1.1** Delete `packages/scramble/src/index.ts` and `packages/scramble/tests/index.test.ts` (remove all text-animation code)
- [ ] **1.2** Update `packages/scramble/package.json`: change description to `"WCA-compliant Rubik's cube scramble generator and visualizer"`, remove any unneeded deps
- [ ] **1.3** Create `packages/scramble/src/types.ts` — define `WcaEvent` union, `ImageOptions`, `CubeState`, `ColorScheme` types
- [ ] **1.4** Create `packages/scramble/src/index.ts` — stub exports: `generateScramble`, `generateScrambleImage`, `warmup`, re-export types; all functions throw `NotImplementedError` for now

---

## Phase 2 — Generator Utilities (shared layer)

- [ ] **2.1** Write tests for `src/generators/utils/coords.ts`:
  - `rankPerm([0,1,2,3])` → 0; `rankPerm([3,2,1,0])` → 23 (last Lehmer)
  - `unrankPerm(0, 4)` → `[0,1,2,3]`; round-trip `unrankPerm(rankPerm(p), n) === p`
  - `rankOrientation([0,0,0], 3)` → 0; `rankOrientation([2,1,0], 3)` → correct index
  - `unrankOrientation` round-trip
  - `Cnk(12, 4)` → 495; `Cnk(0, 0)` → 1; `Cnk(n, 0)` → 1
- [ ] **2.2** [P] Implement `src/generators/utils/coords.ts` — pass tests from 2.1
- [ ] **2.3** Write tests for `src/generators/utils/ida-star.ts`:
  - Toy puzzle: state = number, goal = 0, moves = [-1, +1, +3], heuristic = `Math.abs(state)`; assert finds path of correct length
  - Unreachable state returns `null` (or throws) when `maxDepth` exceeded
  - Path returned is valid (applying moves from root reaches goal)
- [ ] **2.4** [P] Implement `src/generators/utils/ida-star.ts` — `idaStar(root, isGoal, expand, heuristic, maxDepth): Move[] | null` — pass tests from 2.3
- [ ] **2.5** Write tests for `src/generators/utils/random.ts`:
  - `randomInt(n)` always returns integer in `[0, n)`
  - `shuffleArray` produces all elements, same length, different order (statistical smoke test over 100 calls)
- [ ] **2.6** Implement `src/generators/utils/random.ts` — `randomInt(n)`, `shuffleArray(arr)`, `randomChoice(arr)` — pass tests from 2.5
- [ ] **2.7** Write tests for `src/generators/utils/move-table.ts`:
  - Toy 3-state cyclic puzzle: `buildMoveTable(3, (s, m) => (s + m) % 3, [1, 2])` → correct table
  - Table dimensions: `[numStates][numMoves]`
- [ ] **2.8** Implement `src/generators/utils/move-table.ts` — `buildMoveTable(size, applyMove, moves)` returns `number[][]` — pass tests from 2.7

---

## Phase 3 — Simple Generators (random-move)

- [ ] **3.1** Write tests for `src/generators/555.ts`:
  - Result has exactly 60 space-separated tokens
  - Each token matches `/^[UDFBLR][w]?[2']?$/`
  - No two consecutive tokens share the same face letter
  - 100 independent calls produce ≥50 distinct results (randomness smoke test)
- [ ] **3.2** Write tests for `src/generators/666.ts`: exactly 80 tokens, valid 6x6 notation (`3w` layer prefix allowed), no same-face consecutive
- [ ] **3.3** Write tests for `src/generators/777.ts`: exactly 100 tokens, valid 7x7 notation, no same-face consecutive
- [ ] **3.4** Write tests for `src/generators/minx.ts`:
  - Result matches Megaminx R++/D-- format: tokens like `R++ D-- U++ ...`
  - Exactly 70 tokens; each is one of `{R, D, U, L, F, B, r, d, u, l, f, b}` followed by `++` or `--`
- [ ] **3.5** [P] Implement `src/generators/555.ts` — 60 random moves from `{U,D,F,B,L,R,Uw,Dw,Fw,Bw,Lw,Rw}` with `{, ', 2}` modifiers; no two consecutive same-face moves
- [ ] **3.6** [P] Implement `src/generators/666.ts` — 80 random moves from 6x6 move set (outer + 3w layers)
- [ ] **3.7** [P] Implement `src/generators/777.ts` — 100 random moves from 7x7 move set (outer + 3w + 4w layers)
- [ ] **3.8** [P] Implement `src/generators/minx.ts` — 70 moves in Megaminx R++/D-- notation; ref: `cs0x7f/cstimer` → `megaminx.js`
- [ ] **3.9** Run `vp check` — fix any lint/type errors before proceeding

---

## Phase 4 — Medium Generators (random-state, tractable)

### 4A — Clock

- [ ] **4.1** Write tests for `src/generators/clock.ts`:
  - Output string contains exactly 18 move tokens in WCA Clock notation (e.g. `UR3+ UL1- ...`)
  - All pin position values are in range 0–11
  - Applying the output moves to a solved clock reaches the expected state (round-trip test)
  - 100 calls produce ≥50 distinct results
- [ ] **4.2** Implement `src/generators/clock.ts` — Gaussian elimination mod-12 using 18×14 move matrix; generate random 14-element state vector, solve via matrix back-substitution to find move sequence; ref: `cs0x7f/cstimer` → `clock.js`

### 4B — Skewb

- [ ] **4.3** Write tests for `src/generators/skewb.ts`:
  - All tokens are in `{R, L, U, B, F}` with optional `'`
  - Length is 7–11 moves (WCA: minimum 7)
  - Applying moves to solved Skewb state reaches non-solved state
  - 100 calls produce ≥50 distinct results
- [ ] **4.4** Implement `src/generators/skewb.ts` — IDA\* with 5-generator move table; encode state as center perm coord + corner perm coord + corner twist coords; lazy-init move tables on first call

### 4C — Pyraminx

- [ ] **4.5** Write tests for `src/generators/pyram.ts`:
  - Body moves use `{U, L, R, B}` with optional `'`; tip moves use lowercase `{u, l, r, b}` with optional `'`
  - Body has ≥ 6 moves; tips appear at end (0–4 tip tokens)
  - Applying body moves to solved Pyraminx reaches non-solved state
  - 100 calls produce ≥50 distinct results
- [ ] **4.6** Implement `src/generators/pyram.ts` — two-phase random-state: phase1 on edge permutation (360 states), phase2 on edge orientation (32 states); append 4 randomized tip moves

### 4D — 2x2x2

- [ ] **4.7** Write tests for `src/generators/222.ts`:
  - Tokens use `{U, D, F, B, L, R}` with `{, ', 2}`; length 9–11 moves
  - Applying moves to solved 2x2 state reaches non-solved state
  - Applying inverse of scramble to scrambled state returns to solved state
  - 100 calls produce ≥50 distinct results
- [ ] **4.8** Implement `src/generators/222.ts` — coordinate IDA\*: 7-CP coord (0–5039) × 7-CO coord (0–728); precompute move tables; BFS pruning table; generate random valid state, invert solution to get scramble
- [ ] **4.9** Run `vp check` — fix errors

---

## Phase 5 — Hard Generators (random-state, complex)

### 5A — Square-1

- [ ] **5.1** Write tests for `src/generators/sq1.ts`:
  - Output matches Square-1 notation: tokens are `(x,y)/` where x,y are integers in range -5..6
  - Applying moves to solved Square-1 state reaches non-solved state
  - Shape after all moves is cube-shape (top and bottom layers each have 4 corners + 4 edges)
  - 100 calls produce ≥50 distinct results
- [ ] **5.2** Implement `src/generators/sq1.ts` — two-phase IDA\*:
  - Phase 1: solve shape (7,356 states) using `Square_TopMove` / `Square_BottomMove` / `Square_TwistMove` tables; precompute `ShapePrun`
  - Phase 2: solve permutation (CP/EP) within cube-shape; precompute `SquarePrun`
  - Lazy-init all tables on first call
  - Reference: `cs0x7f/cstimer` → `scramble_sq1_new.js`

### 5B — 3x3x3 (Kociemba two-phase)

- [ ] **5.3** Write tests for `src/generators/333.ts`:
  - Token count is 18–26; each token matches `/^[UDFBLR][2']?$/`
  - No two consecutive moves on the same face or opposite faces in sequence (WCA quality)
  - Apply scramble to solved CubieCube → result is not solved
  - Apply scramble then inverse scramble → back to solved (round-trip)
  - 100 calls produce ≥50 distinct results
- [ ] **5.4** Implement `src/generators/333.ts` — Kociemba two-phase (min2phase):
  - **Coordinates**: CO (0–2186), EO (0–2047), UDSlice (0–494); CP (0–40319), EP_UD (0–40319), UDSlice2 (0–23)
  - **Move tables**: `coMove[2187][18]`, `eoMove[2048][18]`, `sliceMove[495][18]`, `cpMove[40320][18]`, `epMove[40320][18]`, `sliceMove2[24][10]`
  - **Symmetry reduction**: 48-symmetry conjugation for phase 1 coord compression
  - **Pruning tables**: `phase1Prun` (~1M, CO×EO×Slice sym-reduced), `phase2Prun` (~150k, CP×Slice2)
  - **IDA\***: phase1 → G1 subgroup; phase2 → identity within G1
  - **Output**: invert solution → scramble string
  - Reference: `cs0x7f/min2phase`, `torjusti/cube-solver`

### 5C — 4x4x4 (3-phase IDA\*)

- [ ] **5.5** Write tests for `src/generators/444.ts`:
  - Tokens include wide moves: each matches `/^[UDFBLR]w?[2']?$/`
  - Length ~40–55 moves
  - Apply to solved 4x4 state → not solved
  - 100 calls produce ≥50 distinct results
- [ ] **5.6** Implement `src/generators/444.ts` — 3-phase IDA\* (reference: `cs0x7f/cstimer` → `scramble_444.js`):
  - Phase 1: solve center1 orbits (48-symmetry reduced `Center1SymCoord`); precompute `Center1SymPrun`
  - Phase 2: solve center2 orbits + place UD-slice edges; precompute `ctprun`
  - Phase 3: solve 3x3-reduced state (edge3 + corner); precompute `Edge3Prun`
  - Move tables: `rlmv`, `ctmv`, `SymMove`; lazy-init all on first call
- [ ] **5.7** Run `vp check` — fix errors

---

## Phase 6 — Alias Generators (bf/fm/oh variants)

- [ ] **6.1** Implement `src/generators/index.ts` — registry mapping all 16 `WcaEvent` codes to generator functions:
  - `333bf`, `333fm`, `333oh` → same as `333`
  - `444bf` → same as `444`
  - `555bf` → same as `555`
  - All others → direct import
- [ ] **6.2** Wire `generateScramble` in `src/index.ts` to the registry; add `warmup()` that pre-initializes 333/444 tables
- [ ] **6.3** Write integration test `tests/generators/all-events.test.ts` — calls `generateScramble` for all 16 event codes, asserts non-empty string result
- [ ] **6.4** Run `vp check` — fix errors

---

## Phase 7 — Visualizer Utilities

- [ ] **7.1** Write tests for `src/visualizer/apply-moves.ts`:
  - `parseMoves("R U R' U'")` → array of 4 move objects with correct face/dir
  - `parseMoves("")` → empty array
  - `parseMoves("Rw2 Uw'")` → handles wide moves and modifiers
  - Apply `R U R' U'` ×6 to solved 3x3 → identity (superflip test)
  - Apply `R` then `R'` → back to solved state
  - Apply full 3x3 scramble → all 6 face colors appear in the state
- [ ] **7.2** Implement `src/visualizer/apply-moves.ts`:
  - `parseMoves(scramble: string): Move[]`
  - Solved-state factories: `solvedState333()`, `solvedState222()`, etc.
  - `applyMove(state: CubeState, move: Move, puzzleType: WcaEvent): CubeState`
- [ ] **7.3** Write tests for `src/visualizer/svg.ts`: `svgRect` returns valid SVG element string; `svgWrap` output starts with `<svg` and ends with `</svg>`
- [ ] **7.4** Implement `src/visualizer/svg.ts` — `svgRect(x, y, w, h, fill)`, `svgGroup(children, transform?)`, `svgWrap(content, viewBox, width?, height?)`

---

## Phase 8 — Visualizer Net Renderers [P across all sub-tasks]

Each renderer: `renderNet(state: CubeState): string` (SVG fragment, no outer `<svg>`).

Tests for each net renderer follow the same pattern:

- Solved state → all cells on each face have the same color (white top, green front, etc.)
- Known scramble → specific sticker at a known position has the expected color
- Output is valid XML (no unclosed tags, no unescaped chars)
- Output contains exactly the right number of `<rect>` elements (e.g., 3x3 net = 6×9 = 54 rects)

- [ ] **8.1** [P] Write + implement `src/visualizer/222-net.ts` + test (6×4 = 24 rects, cross layout)
- [ ] **8.2** [P] Write + implement `src/visualizer/333-net.ts` + test (6×9 = 54 rects, cross layout: U top, L/F/R/B middle, D bottom)
- [ ] **8.3** [P] Write + implement `src/visualizer/444-net.ts` + test (6×16 = 96 rects)
- [ ] **8.4** [P] Write + implement `src/visualizer/555-net.ts` + test (6×25 = 150 rects)
- [ ] **8.5** [P] Write + implement `src/visualizer/666-net.ts` + test (6×36 = 216 rects)
- [ ] **8.6** [P] Write + implement `src/visualizer/777-net.ts` + test (6×49 = 294 rects)
- [ ] **8.7** [P] Write + implement `src/visualizer/minx-net.ts` + test (Megaminx pentagonal net: 12 faces × 5 stickers = 60 rects + 12 pentagon centers)
- [ ] **8.8** [P] Write + implement `src/visualizer/pyram-net.ts` + test (4 triangular faces, triangular `<polygon>` elements)
- [ ] **8.9** [P] Write + implement `src/visualizer/sq1-net.ts` + test (top/bottom layer wedge layout)
- [ ] **8.10** [P] Write + implement `src/visualizer/skewb-net.ts` + test (6 faces, each divided into 5 diamond-shaped stickers)
- [ ] **8.11** [P] Write + implement `src/visualizer/clock-net.ts` + test (front + back panel, 9 clock faces per panel, pin indicators)

---

## Phase 9 — Wire Visualizer & Public API

- [ ] **9.1** Implement `src/visualizer/index.ts` — `generateScrambleImageInternal(event, scramble, options)`:
  - Call event's `applyMoves` to get post-scramble `CubeState`
  - Call corresponding `*-net.ts` renderer
  - Wrap in `<svg>` with correct `viewBox`, `width`, `height` from `options`
  - If `options.mode === '3d'`: throw `new Error('3D mode is not yet implemented')`
- [ ] **9.2** Wire `generateScrambleImage` in `src/index.ts` to `visualizer/index.ts`
- [ ] **9.3** Write integration test: `generateScrambleImage('333', scramble)` for a known scramble resolves to a string starting with `<svg`
- [ ] **9.4** Run `vp check` — fix all remaining errors

---

## Phase 10 — Playground

- [ ] **10.1** Create `packages/scramble/playground/index.html` — minimal HTML shell with:
  - `<select id="event">` populated with all 16 WCA event codes and friendly labels
  - `<button id="generate">Generate</button>`
  - `<pre id="scramble-output">` for the scramble string
  - `<div id="image-output">` for the inline SVG
  - `<span id="timing">` showing generation time in ms
- [ ] **10.2** Create `packages/scramble/playground/main.ts` — wires up the UI:
  - Calls `warmup()` on load (precomputes 333/444 tables while user selects event)
  - On button click: records `Date.now()`, calls `generateScramble(event)` then `generateScrambleImage(event, scramble)`, writes results to DOM, shows elapsed ms
  - Handles errors: displays error message in output area instead of crashing
- [ ] **10.3** Update `packages/scramble/vite.config.ts` to set `root: '.'` and `build.rollupOptions.input` so both `src/` (library) and `playground/index.html` (dev page) work; update `package.json` `dev` script to `vp dev`
- [ ] **10.4** Manually verify playground works: `pnpm dev` → select each event → Generate → scramble string appears + SVG renders correctly

## Phase 11 — Polish & Final Check

- [ ] **11.1** Verify `vp run test -r` passes — all tests green
- [ ] **11.2** Verify TypeScript: `WcaEvent` is a union type; passing `'999'` to `generateScramble` causes a type error at compile time
- [ ] **11.3** Verify package `exports` in `package.json` correctly points to built output (`dist/index.mjs`)
- [ ] **11.4** Run `vp check` one final time — zero errors, zero warnings

---

## Consistency Check

| Spec FR                                | Covered by task(s)                              |
| -------------------------------------- | ----------------------------------------------- |
| FR-001 `generateScramble` async        | 1.4, 6.2                                        |
| FR-002 `generateScrambleImage` async   | 9.1, 9.2                                        |
| FR-003 all 16 WCA events               | 3.5–3.8, 4.2, 4.4, 4.6, 4.8, 5.2, 5.4, 5.6, 6.1 |
| FR-004 333 random-state                | 5.3–5.4                                         |
| FR-005 444 random-state                | 5.5–5.6                                         |
| FR-006 555/666/777 random-move         | 3.1–3.7                                         |
| FR-006b minx random-move               | 3.4, 3.8                                        |
| FR-007 `WcaEvent` type                 | 1.3                                             |
| FR-008 browser + Node compat           | 1.3, 9.1 (no DOM)                               |
| FR-009 no DOM in SVG                   | 7.3–7.4, 8.1–8.11                               |
| FR-010 zero runtime deps               | 1.2, all generator phases                       |
| FR-011 async API                       | 1.4, 6.2, 9.2                                   |
| FR-012 `mode: '2d'\|'3d'` in options   | 1.3, 9.1                                        |
| FR-013 old text-animation removed      | 1.1                                             |
| FR-014 playground in packages/scramble | 10.1–10.4                                       |
