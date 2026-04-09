import { randomInt } from './utils/random';

// 6x6 move set: outer faces + w (wide = 2 inner layers)
const FACES = ['U', 'D', 'F', 'B', 'L', 'R'] as const;
const WIDE_FACES = ['Uw', 'Dw', 'Fw', 'Bw', 'Lw', 'Rw'] as const;
const ALL_MOVES = [...FACES, ...WIDE_FACES];
const MODIFIERS = ['', "'", '2'] as const;

export const generate666 = (): string => {
  const moves: string[] = [];
  let lastFace = '';

  while (moves.length < 80) {
    const base = ALL_MOVES[randomInt(ALL_MOVES.length)];
    const face = base[0];
    if (face === lastFace) continue;
    moves.push(base + MODIFIERS[randomInt(MODIFIERS.length)]);
    lastFace = face;
  }

  return moves.join(' ');
};
