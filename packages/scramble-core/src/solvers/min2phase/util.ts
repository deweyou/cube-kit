import type { RandomSource } from '../../random-source.js';

export const INVERSE_SOLUTION = 0x2;

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

export interface RandomMoveSequenceOptions {
  random: RandomSource;
  length: number;
  firstMoveAxisRestriction?: AxisRestriction;
  lastMoveAxisRestriction?: AxisRestriction;
}

interface MoveChoice {
  token: string;
  axis: number;
}

const MOVE_CHOICES: readonly MoveChoice[] = MOVE_TOKENS.map((token) => ({
  token,
  axis: FACE_AXIS[token[0] as AxisRestriction],
}));

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

export const invertAlgorithm = (algorithm: string): string => {
  const tokens = splitAlgorithm(algorithm);

  return tokens.reverse().map(invertMove).join(' ');
};

export const splitAlgorithm = (algorithm: string): string[] =>
  algorithm.trim().length === 0 ? [] : algorithm.trim().split(/\s+/);

export const generateRandomMoveSequence = ({
  random,
  length,
  firstMoveAxisRestriction,
  lastMoveAxisRestriction,
}: RandomMoveSequenceOptions): string => {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new Error(
      '@cubekit/scramble-core: min2phase sequence length must be a non-negative safe integer',
    );
  }

  const moves: string[] = [];
  let previousAxis: number | undefined;

  for (let index = 0; index < length; index += 1) {
    const isFirstMove = index === 0;
    const isLastMove = index === length - 1;
    const disallowedAxes = new Set<number>();

    if (previousAxis !== undefined) disallowedAxes.add(previousAxis);
    if (isFirstMove && firstMoveAxisRestriction !== undefined) {
      disallowedAxes.add(FACE_AXIS[firstMoveAxisRestriction]);
    }
    if (isLastMove && lastMoveAxisRestriction !== undefined) {
      disallowedAxes.add(FACE_AXIS[lastMoveAxisRestriction]);
    }

    const choices = MOVE_CHOICES.filter(({ axis }) => !disallowedAxes.has(axis));
    const choice = choices[drawRandomInt(random, choices.length)];
    if (choice === undefined) {
      throw new Error(
        '@cubekit/scramble-core: min2phase axis restrictions left no legal moves',
      );
    }

    moves.push(choice.token);
    previousAxis = choice.axis;
  }

  return moves.join(' ');
};

const invertMove = (move: string): string => {
  if (move.endsWith('2')) return move;
  if (move.endsWith("'")) return move.slice(0, -1);

  return `${move}'`;
};

const drawRandomInt = (random: RandomSource, maxExclusive: number): number => {
  const value = random.nextInt(maxExclusive);

  if (!Number.isSafeInteger(value) || value < 0 || value >= maxExclusive) {
    throw new RangeError(
      `@cubekit/scramble-core: random source returned ${value} for max ${maxExclusive}`,
    );
  }

  return value;
};
