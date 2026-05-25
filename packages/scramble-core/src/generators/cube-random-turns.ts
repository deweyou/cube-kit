import type { RandomSource } from '../random-source.js';

const FACES = ['R', 'U', 'F', 'L', 'D', 'B'] as const;
const SUFFIXES = ['', '2', "'"] as const;
const SUPPORTED_SIZES = new Set([5, 6, 7]);
const FACE_CHOICES = FACES.map((face, index) => ({
  face,
  axis: index % 3,
}));

export interface CubeRandomTurnOptions {
  size: number;
  length: number;
  random: RandomSource;
}

const validateOptions = ({ size, length }: CubeRandomTurnOptions): void => {
  if (!Number.isSafeInteger(size) || !SUPPORTED_SIZES.has(size)) {
    throw new Error('@cubekit/scramble-core: cube random-turn size must be 5, 6, or 7');
  }

  if (!Number.isSafeInteger(length) || length < 0) {
    throw new Error(
      '@cubekit/scramble-core: cube random-turn length must be a non-negative safe integer',
    );
  }
};

const chooseFace = (
  previousAxis: number | undefined,
  random: RandomSource,
): (typeof FACE_CHOICES)[number] => {
  const allowedFaces =
    previousAxis === undefined
      ? FACE_CHOICES
      : FACE_CHOICES.filter(({ axis }) => axis !== previousAxis);

  const faceIndex = random.nextInt(allowedFaces.length);
  return allowedFaces[faceIndex] as (typeof FACE_CHOICES)[number];
};

const chooseWideFace = (face: string, size: number, random: RandomSource): string => {
  const maxWidth = Math.floor(size / 2);
  const width = random.nextInt(maxWidth) + 1;
  if (width === 1) return face;
  if (width === 2) return `${face}w`;
  return `${width}${face}w`;
};

export const generateCubeRandomTurnScramble = (options: CubeRandomTurnOptions): string => {
  validateOptions(options);

  const { size, length, random } = options;
  const moves: string[] = [];
  let previousAxis: number | undefined;

  while (moves.length < length) {
    const { axis, face } = chooseFace(previousAxis, random);
    previousAxis = axis;

    const wideFace = chooseWideFace(face, size, random);
    const suffix = SUFFIXES[random.nextInt(SUFFIXES.length)];
    moves.push(`${wideFace}${suffix}`);
  }

  return moves.join(' ');
};
