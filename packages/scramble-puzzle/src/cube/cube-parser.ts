import { splitAlgorithm } from '../algorithm.js';
import { InvalidMoveError } from '../errors.js';
import type { CubeFace, CubeMove, CubeSlice } from './cube-move.js';

const CUBE_MOVE_PATTERN = /^(?:(\d+)?([RUFLDB])w|([RUFLDB])|([xyz])|([MES]))(2|')?$/;

const parseAmount = (suffix: string | undefined): 1 | 2 | 3 => {
  if (suffix === '2') return 2;
  if (suffix === "'") return 3;
  return 1;
};

const parseCubeFace = (face: string | undefined): CubeFace | undefined => {
  switch (face) {
    case 'R':
    case 'U':
    case 'F':
    case 'L':
    case 'D':
    case 'B':
      return face;
    default:
      return undefined;
  }
};

const parseRotationFace = (rotation: string): CubeFace | undefined => {
  switch (rotation) {
    case 'x':
      return 'R';
    case 'y':
      return 'U';
    case 'z':
      return 'F';
    default:
      return undefined;
  }
};

const sliceFace = (slice: CubeSlice): 'L' | 'D' | 'F' => {
  if (slice === 'M') return 'L';
  if (slice === 'E') return 'D';
  return 'F';
};

const parseWideMoveWidth = (token: string, prefixWidth: string | undefined): number => {
  if (prefixWidth === undefined) return 2;

  const width = Number(prefixWidth);

  if (prefixWidth.startsWith('0') || !Number.isSafeInteger(width) || width < 3) {
    throw new InvalidMoveError(token, 'cube');
  }

  return width;
};

export const parseCubeMove = (token: string): CubeMove => {
  const match = token.match(CUBE_MOVE_PATTERN);
  if (!match) throw new InvalidMoveError(token, 'cube');

  const [, prefixWidth, wideFace, face, rotation, slice, suffix] = match;
  const isRotation = rotation !== undefined;

  if (isRotation) {
    const rotationFace = parseRotationFace(rotation);
    if (rotationFace === undefined) throw new InvalidMoveError(token, 'cube');

    return {
      face: rotationFace,
      amount: parseAmount(suffix),
      width: Number.POSITIVE_INFINITY,
      isRotation: true,
    };
  }

  if (slice !== undefined) {
    const sliceName = slice as CubeSlice;
    return {
      face: sliceFace(sliceName),
      amount: parseAmount(suffix),
      width: 1,
      isRotation: false,
      slice: sliceName,
    };
  }

  const layerFace = parseCubeFace(wideFace ?? face);
  if (layerFace === undefined) throw new InvalidMoveError(token, 'cube');

  return {
    face: layerFace,
    amount: parseAmount(suffix),
    width: wideFace ? parseWideMoveWidth(token, prefixWidth) : 1,
    isRotation: false,
  };
};

export const parseCubeAlgorithm = (algorithm: string): readonly CubeMove[] =>
  splitAlgorithm(algorithm).map(parseCubeMove);
