# WCA Scramble Rules & Implementation

> Reference for all 16 WCA events. Verified against TNoodle source and cstimer.
> Describes current implementation approach + known limitations.

---

## Move Notation Conventions

- `R / R' / R2` — outer face moves
- `Rw / Uw` etc. — wide (2-layer) moves
- `x / y / z` — whole-cube rotations
- `R++ / R--` — Megaminx notation (double-layer click)
- `(x,y)/` — Square-1 notation (twelfths of a rotation)

---

## Standard Events (random-move generators)

### 333 — 3x3x3

**Algorithm**: Random-move, 20–23 moves
**Constraints**: No two consecutive same-face moves; no two consecutive opposite-face moves (e.g. U then D)
**Move set**: `{U D F B L R}` × `{'  ' '}`
**Known limitation**: Should use Kociemba two-phase random-state; current approach is not true random-state

### 444 — 4x4x4

**Algorithm**: Random-move, 45 moves
**Constraints**: No two consecutive moves on the same face (by first character)
**Move set**: `{U D F B L R Uw Dw Fw Bw Lw Rw}` × `{'' ' 2}`
**Known limitation**: Should use 3-phase random-state; current approach is not true random-state

### 555 — 5x5x5

**Algorithm**: Random-move, 60 moves
**Constraints**: No two consecutive same-face moves
**Move set**: `{U D F B L R Uw Dw Fw Bw Lw Rw}` × `{'' ' 2}`

### 666 — 6x6x6

**Algorithm**: Random-move, 80 moves
**Constraints**: No two consecutive same-face moves
**Move set**: `{U D F B L R Uw Dw Fw Bw Lw Rw}` × `{'' ' 2}`
**Note**: WCA also uses 3w moves on 6x6 — future improvement should add `{U3w D3w …}`

### 777 — 7x7x7

**Algorithm**: Random-move, 100 moves
**Constraints**: No two consecutive same-face moves
**Move set**: `{U D F B L R Uw Dw Fw Bw Lw Rw}` × `{'' ' 2}`
**Note**: WCA also uses 3w moves on 7x7 — future improvement should add `{U3w D3w …}`

### skewb — Skewb

**Algorithm**: Random-move, 7–11 moves
**Constraints**: No two consecutive same-generator moves
**Move set**: `{R L U B F}` × `{'' '}`
**Note**: Skewb generators are vertex-based (not face-based); only `'` and no modifier (no `2` since 120° has order 3)

### pyram — Pyraminx

**Algorithm**: Random-move body (6–11 moves) + random tips
**Body move set**: `{U L R B}` × `{'' '}`; no consecutive same face
**Tips**: Each of `{u l r b}` independently: omitted (already solved) / `'` / no modifier (1/3 probability each)
**WCA optimal depth**: ≤11 body moves

### minx — Megaminx

**Algorithm**: Random-move, 70 moves
**Move set**: `{R D U L F B r d u l f b}` × `{++ --}`
**Note**: Lowercase = bottom-half equivalent faces. No consecutive-face constraint currently.

### sq1 — Square-1

**Algorithm**: Random `(x,y)/` tokens, 10–14 tokens
**Valid values**: x, y ∈ `{-5 -4 -3 -2 -1 0 1 2 3 4 5 6}`, not both zero
**Semantics**: x = top layer CW (twelfths), y = bottom layer CW, `/` = middle slice twist
**Known limitation**: Does not validate that the middle slice is physically possible (cube shape); true random-state would check layer parity

### clock — Clock

**Algorithm**: Direct random-state output in WCA notation
**Method**: Generate 9 random dial values (0–11) for front face moves (UR/UL/U/DR/DL/D/L/R/ALL), then `y2`, then 9 more for back face, then 4 random pin positions (UR/UL/DR/DL each `+` or `-`)
**Encoding**: Value n → `n+` if n≤6, `(12-n)-` if n>7, `0+` if n=0
**Known limitation**: Not a full random-state solver; outputs values independently rather than solving for a target state

### 222 — 2x2x2

**Algorithm**: True random-state via IDA*
**State**: Corner permutation (7! = 5040) × corner orientation (3^6 = 729) — DBL corner fixed
**Implementation**: Precomputes move table + pruning table at first use; IDA* finds optimal or near-optimal solution, inverts for scramble
**Precomputation**: Triggered once at startup (`warmupGenerators()`), synchronous CPU spike ~50–200ms

---

## BLD / Special Events

### 333bf — 3x3 Blindfolded

**Base**: Standard 333 scramble
**Suffix**: Pick one from `{'' Rw Rw2 Rw' Fw Fw'}` (equal probability), then one from `{'' Uw Uw2 Uw'}` (equal probability)
**Purpose**: Randomize cube orientation so solvers cannot infer axis alignment from the scramble

### 444bf — 4x4 Blindfolded

**Base**: Standard 444 scramble
**Suffix**: Pick one from `{'' x x2 x' z z'}`, then one from `{'' y y2 y'}`
**Why rotations not wide moves**: On 4x4, a 3-layer wide move = whole-cube rotation; using `x/y/z` is equivalent and clearer

### 555bf — 5x5 Blindfolded

**Base**: Standard 555 scramble
**Suffix**: Same pattern as 444bf — `{'' x x2 x' z z'}` then `{'' y y2 y'}`

### 333fm — Fewest Moves

**Format**: `R' U' F [scramble] R' U' F`
**Constraint on inner scramble**:
- Must NOT start with an F-family move (would cancel with prefix ending in `F`)
- Must NOT end with an R-family move (would cancel with suffix starting in `R'`)
- Regenerate until both constraints are met (rarely more than 1–2 attempts)
**Design rationale**: The `R' U' F` wrap ensures at least one bad edge exists in every orientation of the scramble, preventing EO information from being inferred

### 333oh — 3x3 One-Handed

**Base**: Identical to 333 scramble (no special format)

---

## Known Gaps vs. True WCA

| Event | Current | WCA (TNoodle) |
|-------|---------|---------------|
| 333 | Random-move 20–23 moves | Kociemba two-phase random-state |
| 444 | Random-move 45 moves | 3-phase random-state |
| 555 | Random-move 60 moves | Random-state |
| 666 | Random-move 80 moves | Random-state + 3w moves |
| 777 | Random-move 100 moves | Random-state + 3w moves |
| minx | Random-move 70 moves | True random-state |
| sq1 | Random tokens | Shape-valid random-state |
| clock | Independent random dials | Gaussian elimination random-state |
