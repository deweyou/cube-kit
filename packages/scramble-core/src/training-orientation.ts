import { parseCubeAlgorithm, type CubeFace, type CubeMove } from '@cubegin/scramble-puzzle';
import type { RandomSource } from './random-source.js';

const ERROR_PREFIX = '@cubegin/scramble-core';

export const TRAINING_ORIENTATION_COLORS = [
  'white',
  'yellow',
  'red',
  'orange',
  'green',
  'blue',
] as const;

export type TrainingOrientationColor = (typeof TRAINING_ORIENTATION_COLORS)[number];

export interface TrainingOrientationPreference {
  readonly bottomColor: TrainingOrientationColor;
  readonly frontColor?: TrainingOrientationColor;
}

export interface ResolvedTrainingOrientation {
  readonly bottomColor: TrainingOrientationColor;
  readonly frontColor: TrainingOrientationColor;
}

export type TrainingOrientationTarget = 'bottom-layer' | 'complete-face';

type Vector = readonly [x: number, y: number, z: number];

const FACE_BY_COLOR = {
  white: 'U',
  yellow: 'D',
  red: 'R',
  orange: 'L',
  green: 'F',
  blue: 'B',
} as const satisfies Record<TrainingOrientationColor, CubeFace>;

const OPPOSITE_COLOR = {
  white: 'yellow',
  yellow: 'white',
  red: 'orange',
  orange: 'red',
  green: 'blue',
  blue: 'green',
} as const satisfies Record<TrainingOrientationColor, TrainingOrientationColor>;

const FACE_VECTOR = {
  R: [1, 0, 0],
  U: [0, 1, 0],
  F: [0, 0, 1],
  L: [-1, 0, 0],
  D: [0, -1, 0],
  B: [0, 0, -1],
} as const satisfies Record<CubeFace, Vector>;

const FACE_BY_VECTOR = new Map<string, CubeFace>(
  Object.entries(FACE_VECTOR).map(([face, vector]) => [vector.join(','), face as CubeFace]),
);

const isTrainingOrientationColor = (value: unknown): value is TrainingOrientationColor =>
  typeof value === 'string' &&
  TRAINING_ORIENTATION_COLORS.includes(value as TrainingOrientationColor);

const validateColor = (position: 'bottom' | 'front', color: unknown): TrainingOrientationColor => {
  if (!isTrainingOrientationColor(color)) {
    throw new Error(`${ERROR_PREFIX}: unsupported ${position} color '${String(color)}'`);
  }
  return color;
};

export const resolveTrainingOrientation = (
  preference: TrainingOrientationPreference,
  random: RandomSource,
): ResolvedTrainingOrientation => {
  const bottomColor = validateColor('bottom', preference?.bottomColor);
  const adjacentColors = TRAINING_ORIENTATION_COLORS.filter(
    (color) => color !== bottomColor && color !== OPPOSITE_COLOR[bottomColor],
  );
  const frontColor =
    preference.frontColor === undefined
      ? adjacentColors[random.nextInt(adjacentColors.length)]
      : validateColor('front', preference.frontColor);

  if (frontColor === bottomColor) {
    throw new Error(`${ERROR_PREFIX}: bottom and front colors must differ`);
  }
  if (frontColor === OPPOSITE_COLOR[bottomColor]) {
    throw new Error(`${ERROR_PREFIX}: bottom and front colors must be adjacent`);
  }

  return Object.freeze({ bottomColor, frontColor });
};

const negate = ([x, y, z]: Vector): Vector => [-x, -y, -z];

const cross = ([ax, ay, az]: Vector, [bx, by, bz]: Vector): Vector => [
  ay * bz - az * by,
  az * bx - ax * bz,
  ax * by - ay * bx,
];

const faceFromVector = (vector: Vector): CubeFace => {
  const face = FACE_BY_VECTOR.get(vector.join(','));
  if (face === undefined) {
    throw new Error(`${ERROR_PREFIX}: could not resolve cube orientation`);
  }
  return face;
};

const createCubeFaceMap = (
  orientation: ResolvedTrainingOrientation,
): Readonly<Record<CubeFace, CubeFace>> => {
  const bottom = FACE_VECTOR[FACE_BY_COLOR[orientation.bottomColor]];
  const front = FACE_VECTOR[FACE_BY_COLOR[orientation.frontColor]];
  const right = cross(front, bottom);

  return Object.freeze({
    R: faceFromVector(right),
    U: faceFromVector(negate(bottom)),
    F: faceFromVector(front),
    L: faceFromVector(negate(right)),
    D: faceFromVector(bottom),
    B: faceFromVector(negate(front)),
  });
};

const invertCubeFaceMap = (
  faceMap: Readonly<Record<CubeFace, CubeFace>>,
): Readonly<Record<CubeFace, CubeFace>> =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(faceMap).map(([source, target]) => [target, source]),
    ) as Record<CubeFace, CubeFace>,
  );

const moveSuffix = (amount: CubeMove['amount']): string => {
  if (amount === 2) return '2';
  if (amount === 3) return "'";
  return '';
};

const inverseAmount = (amount: CubeMove['amount']): CubeMove['amount'] =>
  amount === 2 ? 2 : amount === 1 ? 3 : 1;

const formatLayerMove = (
  move: Extract<CubeMove, { isRotation: false; slice?: undefined }>,
  faceMap: Readonly<Record<CubeFace, CubeFace>>,
): string => {
  const face = faceMap[move.face];
  if (move.width === 1) return `${face}${moveSuffix(move.amount)}`;
  if (move.width === 2) return `${face}w${moveSuffix(move.amount)}`;
  return `${move.width}${face}w${moveSuffix(move.amount)}`;
};

const formatRotationMove = (
  move: Extract<CubeMove, { isRotation: true }>,
  faceMap: Readonly<Record<CubeFace, CubeFace>>,
): string => {
  const mappedFace = faceMap[move.face];
  const isNegativeAxis = mappedFace === 'L' || mappedFace === 'D' || mappedFace === 'B';
  const positiveFace =
    mappedFace === 'L' ? 'R' : mappedFace === 'D' ? 'U' : mappedFace === 'B' ? 'F' : mappedFace;
  const axis = positiveFace === 'R' ? 'x' : positiveFace === 'U' ? 'y' : 'z';
  const amount = isNegativeAxis ? inverseAmount(move.amount) : move.amount;
  return `${axis}${moveSuffix(amount)}`;
};

const formatSliceMove = (
  move: Extract<CubeMove, { slice: string }>,
  faceMap: Readonly<Record<CubeFace, CubeFace>>,
): string => {
  const mappedFace = faceMap[move.face];
  const isNegativeAxis = mappedFace === 'R' || mappedFace === 'U' || mappedFace === 'B';
  const slice =
    mappedFace === 'L' || mappedFace === 'R'
      ? 'M'
      : mappedFace === 'D' || mappedFace === 'U'
        ? 'E'
        : 'S';
  const amount = isNegativeAxis ? inverseAmount(move.amount) : move.amount;
  return `${slice}${moveSuffix(amount)}`;
};

const transformCubeScramble = (
  scramble: string,
  faceMap: Readonly<Record<CubeFace, CubeFace>>,
): string => {
  return parseCubeAlgorithm(scramble)
    .map((move) => {
      if (move.isRotation) return formatRotationMove(move, faceMap);
      if (move.slice !== undefined) return formatSliceMove(move, faceMap);
      return formatLayerMove(move, faceMap);
    })
    .join(' ');
};

export const transformCubeScrambleForOrientation = (
  scramble: string,
  orientation: ResolvedTrainingOrientation,
): string => transformCubeScramble(scramble, createCubeFaceMap(orientation));

export const restoreCubeScrambleFromOrientation = (
  scramble: string,
  orientation: ResolvedTrainingOrientation,
): string => transformCubeScramble(scramble, invertCubeFaceMap(createCubeFaceMap(orientation)));
