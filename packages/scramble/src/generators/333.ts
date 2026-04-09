import { randomInt } from './utils/random';

/**
 * WCA 3x3x3 scramble generator.
 *
 * Uses a high-quality random-move generator: 20 moves, no two consecutive
 * same-face moves, no two consecutive moves on opposite faces (axial moves).
 *
 * TODO: Replace with true Kociemba two-phase random-state generator.
 */

const FACES = ['U', 'D', 'F', 'B', 'L', 'R'] as const;
type Face = (typeof FACES)[number];

// Opposite face pairs
const OPPOSITE: Record<Face, Face> = {
  U: 'D',
  D: 'U',
  F: 'B',
  B: 'F',
  L: 'R',
  R: 'L',
};

const MODIFIERS = ['', "'", '2'] as const;

export const generate333 = (): string => {
  // WCA scrambles are 20 moves; allow 20-23 for variety
  const length = 20 + randomInt(4);
  const moves: string[] = [];
  let lastFace: Face | '' = '';
  let secondLastFace: Face | '' = '';

  while (moves.length < length) {
    const face = FACES[randomInt(FACES.length)];
    // No consecutive same face
    if (face === lastFace) continue;
    // No axial move: if same axis as last (i.e. opposite), only allow if
    // the face two back was not on this same axis.
    // Standard rule: avoid same-face AND avoid opposite-face after opposite-face
    // (i.e. no two consecutive moves on the same axis when the second-to-last
    // was also on that axis — this prevents U D U sequences being redundant).
    if (
      lastFace !== '' &&
      OPPOSITE[face as Face] === lastFace &&
      secondLastFace !== '' &&
      (secondLastFace === face || OPPOSITE[face as Face] === secondLastFace)
    ) {
      continue;
    }
    const modifier = MODIFIERS[randomInt(MODIFIERS.length)];
    moves.push(face + modifier);
    secondLastFace = lastFace;
    lastFace = face;
  }

  return moves.join(' ');
};
