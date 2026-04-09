---
name: Cube Move Engine Validation
description: How to validate move-engine correctness for puzzle simulators using group theory
type: reference
---

# Cube Move Engine Validation

## The Problem

Puzzle move engines (e.g., Rubik's cube simulators) are notoriously easy to get subtly wrong. Individual move tests may pass while the cycled sticker order, reversal pattern, or face rotation direction is incorrect. Common failure modes:

- A CW move is actually doing CCW (`R` doing `R'`)
- Opposite-face moves have wrong reversal pattern (`U` reversing some strips when it shouldn't)
- Wide moves (`Rw`) cycle an extra layer in the wrong direction

## The Validation Method

Use the **commutator order test**. In the Rubik's cube group:

- For any two **adjacent** face moves `X` and `Y`: `(X Y X' Y')^6 = identity`
- For any two **opposite** face moves `X` and `Y`: `X Y X' Y' = identity` (order 1)

This gives you 12 adjacent pair tests + 3 opposite pair tests = 15 total checks that comprehensively validate all move directions.

```typescript
const OPPOSITE_PAIRS = [
  ['U', 'D'],
  ['R', 'L'],
  ['F', 'B'],
];
const ADJACENT_PAIRS = [
  ['U', 'R'],
  ['U', 'F'],
  ['U', 'L'],
  ['U', 'B'],
  ['D', 'R'],
  ['D', 'F'],
  ['D', 'L'],
  ['D', 'B'],
  ['R', 'F'],
  ['R', 'B'],
  ['L', 'F'],
  ['L', 'B'],
];

// Adjacent pairs should have commutator order 6
for (const [a, b] of ADJACENT_PAIRS) {
  let state = solvedState('333');
  const commutator = `${a} ${b} ${a}' ${b}'`;
  for (let i = 0; i < 6; i++) state = applyScramble(commutator, '333');
  expect(state).toEqual(solvedState('333'));
}

// Opposite pairs should commute (order 1)
for (const [a, b] of OPPOSITE_PAIRS) {
  const state = applyScramble(`${a} ${b} ${a}' ${b}'`, '333');
  expect(state).toEqual(solvedState('333'));
}
```

## Correct NxN Face Cycle Directions

For the standard face storage convention (0=U, 1=D, 2=F, 3=B, 4=L, 5=R, each face in reading order row-major, with U row0=back):

| Move | Cycle direction                | Reversals            |
| ---- | ------------------------------ | -------------------- |
| U CW | L→F→R→B                        | None                 |
| D CW | F→L→B→R                        | None                 |
| R CW | F→U, U→B (rev), B→D (rev), D→F | U→B and B→D reversed |
| L CW | U→F, F→D, D→B (rev), B→U (rev) | D→B and B→U reversed |
| F CW | U→R, R→D (rev), D→L, L→U (rev) | R→D and L→U reversed |
| B CW | U→L (rev), L→D, D→R (rev), R→U | U→L and D→R reversed |

## When to Use This

Always when implementing or modifying a puzzle move engine. Run this test suite after any change to cycle definitions, rotation formulas, or face storage conventions.
