import { randomInt } from './utils/random';

/**
 * WCA Pyraminx scramble generator.
 *
 * Pyraminx has 4 face generators: U, L, R, B (each 120° rotation of a face)
 * Plus 4 trivial tip moves: u, l, r, b
 *
 * Body: random-state via BFS over the ~75M state space (simplified here with
 * random-move avoiding cancellations, 6–11 moves).
 * Tips: each tip randomly omitted (solved), CW (+), or CCW (')
 *
 * WCA optimal scramble is ≤11 moves for body.
 */

const BODY_MOVES = ['U', 'L', 'R', 'B'] as const;
const MODIFIERS = ['', "'"] as const;

export const generatePyram = (): string => {
  const moves: string[] = [];
  let lastFace = '';
  const bodyLen = 6 + randomInt(6); // 6–11 body moves

  while (moves.length < bodyLen) {
    const face = BODY_MOVES[randomInt(BODY_MOVES.length)];
    if (face === lastFace) continue;
    moves.push(face + MODIFIERS[randomInt(MODIFIERS.length)]);
    lastFace = face;
  }

  // Add tip moves (each tip: 0=none, 1=CW, 2=CCW)
  const TIPS = ['u', 'l', 'r', 'b'] as const;
  for (const tip of TIPS) {
    const state = randomInt(3);
    if (state === 1) moves.push(tip);
    else if (state === 2) moves.push(tip + "'");
  }

  return moves.join(' ');
};
