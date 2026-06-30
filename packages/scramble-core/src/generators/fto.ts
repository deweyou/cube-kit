import type { RandomSource } from '../random-source.js';

export interface FtoScrambleOptions {
  random: RandomSource;
  length?: number;
}

export const FTO_SCRAMBLE_FACES = ['U', 'D', 'F', 'B', 'L', 'R', 'BL', 'BR'] as const;

const DEFAULT_FTO_SCRAMBLE_LENGTH = 30;

const chooseFaceIndex = (random: RandomSource, previousFaceIndex: number | undefined): number => {
  if (previousFaceIndex === undefined) return random.nextInt(FTO_SCRAMBLE_FACES.length);

  return (
    (previousFaceIndex + 1 + random.nextInt(FTO_SCRAMBLE_FACES.length - 1)) %
    FTO_SCRAMBLE_FACES.length
  );
};

export const generateFtoScramble = ({
  random,
  length = DEFAULT_FTO_SCRAMBLE_LENGTH,
}: FtoScrambleOptions): string => {
  const moves: string[] = [];
  let previousFaceIndex: number | undefined;

  for (let index = 0; index < length; index += 1) {
    const faceIndex = chooseFaceIndex(random, previousFaceIndex);
    const suffix = random.nextInt(2) === 0 ? '' : "'";
    moves.push(`${FTO_SCRAMBLE_FACES[faceIndex]}${suffix}`);
    previousFaceIndex = faceIndex;
  }

  return moves.join(' ');
};
