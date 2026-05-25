import type { RandomSource } from '../../random-source.js';

export const USE_SEPARATOR = 0x1;
export const INVERSE_SOLUTION = 0x2;
export const APPEND_LENGTH = 0x4;
export const OPTIMAL_SOLUTION = 0x8;

export const SOLVED_FACE_CUBE =
  'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

export const MOVE_TOKENS = [
  'U',
  'U2',
  "U'",
  'R',
  'R2',
  "R'",
  'F',
  'F2',
  "F'",
  'D',
  'D2',
  "D'",
  'L',
  'L2',
  "L'",
  'B',
  'B2',
  "B'",
] as const;

const FACE_AXIS = {
  U: 0,
  D: 0,
  R: 1,
  L: 1,
  F: 2,
  B: 2,
} as const;

export type AxisRestriction = keyof typeof FACE_AXIS;

export const axisForRestriction = (
  restriction: string | undefined,
): number | undefined => {
  if (restriction === undefined) return undefined;

  return FACE_AXIS[restriction as AxisRestriction];
};

export const isAxisRestriction = (
  restriction: string | undefined,
): restriction is AxisRestriction =>
  restriction !== undefined && axisForRestriction(restriction) !== undefined;

export const splitAlgorithm = (algorithm: string): string[] =>
  algorithm.trim().length === 0 ? [] : algorithm.trim().split(/\s+/);

export const invertAlgorithm = (algorithm: string): string =>
  splitAlgorithm(algorithm).reverse().map(invertMove).join(' ');

export const drawRandomInt = (
  random: RandomSource,
  maxExclusive: number,
): number => {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(
      '@cubekit/scramble-core: random maxExclusive must be a positive safe integer',
    );
  }

  const value = random.nextInt(maxExclusive);

  if (!Number.isSafeInteger(value) || value < 0 || value >= maxExclusive) {
    throw new RangeError(
      `@cubekit/scramble-core: random source returned ${value} for max ${maxExclusive}`,
    );
  }

  return value;
};

const invertMove = (move: string): string => {
  if (move.endsWith('2')) return move;
  if (move.endsWith("'")) return move.slice(0, -1);

  return `${move}'`;
};
