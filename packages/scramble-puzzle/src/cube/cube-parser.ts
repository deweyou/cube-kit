import { splitAlgorithm } from '../algorithm.js';
import { InvalidMoveError } from '../errors.js';
import type { CubeFace, CubeMove } from './cube-move.js';

const ROTATION_FACE_BY_TOKEN = {
  x: 'R',
  y: 'U',
  z: 'F',
} as const satisfies Record<string, CubeFace>;

const CUBE_MOVE_PATTERN = /^(?:(\d+)?([RUFLDB])w|([RUFLDB])|([xyz]))(2|')?$/;

const parseAmount = (suffix: string | undefined): 1 | 2 | 3 => {
  if (suffix === '2') return 2;
  if (suffix === "'") return 3;
  return 1;
};

export const parseCubeMove = (token: string): CubeMove => {
  const match = token.match(CUBE_MOVE_PATTERN);
  if (!match) throw new InvalidMoveError(token, 'cube');

  const [, prefixWidth, wideFace, face, rotation, suffix] = match;
  const isRotation = rotation !== undefined;

  if (isRotation) {
    const rotationToken = rotation as keyof typeof ROTATION_FACE_BY_TOKEN;

    return {
      face: ROTATION_FACE_BY_TOKEN[rotationToken],
      amount: parseAmount(suffix),
      width: Number.POSITIVE_INFINITY,
      isRotation: true,
    };
  }

  return {
    face: (wideFace ?? face) as CubeFace,
    amount: parseAmount(suffix),
    width: wideFace ? Number(prefixWidth ?? 2) : 1,
    isRotation: false,
  };
};

export const parseCubeAlgorithm = (algorithm: string): readonly CubeMove[] =>
  splitAlgorithm(algorithm).map(parseCubeMove);
