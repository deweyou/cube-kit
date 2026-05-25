import type { RandomSource } from '../random-source.js';

const FACES = ['R', 'U', 'F', 'L', 'D', 'B'] as const;
const SUFFIXES = ['', '2', "'"] as const;

export interface CubeRandomTurnOptions {
  size: number;
  length: number;
  random: RandomSource;
}

const chooseWideFace = (face: string, size: number, random: RandomSource): string => {
  const maxWidth = Math.floor(size / 2);
  const width = random.nextInt(maxWidth) + 1;
  if (width === 1) return face;
  if (width === 2) return `${face}w`;
  return `${width}${face}w`;
};

export const generateCubeRandomTurnScramble = ({ size, length, random }: CubeRandomTurnOptions): string => {
  const moves: string[] = [];
  let previousAxis = -1;

  while (moves.length < length) {
    const faceIndex = random.nextInt(FACES.length);
    const axis = faceIndex % 3;
    if (axis === previousAxis) continue;
    previousAxis = axis;

    const face = FACES[faceIndex];
    const wideFace = chooseWideFace(face, size, random);
    const suffix = SUFFIXES[random.nextInt(SUFFIXES.length)];
    moves.push(`${wideFace}${suffix}`);
  }

  return moves.join(' ');
};
