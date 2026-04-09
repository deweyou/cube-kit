import { randomInt } from './utils/random';

/**
 * WCA 4x4x4 scramble generator.
 *
 * Uses a random-move approach with 45 moves: outer face moves + wide moves,
 * no two consecutive moves on the same face.
 *
 * Move set: {U,D,F,B,L,R} + {Uw,Dw,Fw,Bw,Lw,Rw}, each with {'', "'", '2'}.
 * This is the practical approach used by many timers for 4x4 practice.
 *
 * TODO: Replace with true 3-phase random-state generator.
 */

const FACES = ['U', 'D', 'F', 'B', 'L', 'R'] as const;
const WIDE_FACES = ['Uw', 'Dw', 'Fw', 'Bw', 'Lw', 'Rw'] as const;
const ALL_BASES = [...FACES, ...WIDE_FACES] as const;
const MODIFIERS = ['', "'", '2'] as const;

export const generate444 = (): string => {
  const length = 45;
  const moves: string[] = [];
  let lastFace = '';

  while (moves.length < length) {
    const base = ALL_BASES[randomInt(ALL_BASES.length)];
    // face is the first character (U, D, F, B, L, or R)
    const face = base[0];
    if (face === lastFace) continue;
    const modifier = MODIFIERS[randomInt(MODIFIERS.length)];
    moves.push(base + modifier);
    lastFace = face;
  }

  return moves.join(' ');
};
