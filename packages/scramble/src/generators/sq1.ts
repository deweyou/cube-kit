import { randomInt } from './utils/random';

// Square-1 notation: (x,y)/ where x,y are integers in -5..6 (not both zero)
// Each token represents: x = top layer CW rotation (twelfths), y = bottom layer CW rotation,
// followed by / for a twist (middle slice).

const VALID_VALUES = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;

export const generateSq1 = (): string => {
  const length = 10 + randomInt(5); // 10-14 tokens
  const tokens: string[] = [];

  while (tokens.length < length) {
    const x = VALID_VALUES[randomInt(VALID_VALUES.length)];
    const y = VALID_VALUES[randomInt(VALID_VALUES.length)];
    // Avoid (0,0) — no-op
    if (x === 0 && y === 0) continue;
    tokens.push(`(${x},${y})/`);
  }

  return tokens.join(' ');
};
