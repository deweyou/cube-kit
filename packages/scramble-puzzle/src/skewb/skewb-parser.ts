import { splitAlgorithm } from '../algorithm.js';
import { InvalidMoveError } from '../errors.js';

export const SKEWB_FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export const SKEWB_AXES = ['R', 'U', 'L', 'B'] as const;

export type SkewbFace = (typeof SKEWB_FACES)[number];
export type SkewbAxis = (typeof SKEWB_AXES)[number];
export type SkewbMoveAmount = 1 | 2;

export interface SkewbMove {
  readonly face: SkewbAxis;
  readonly amount: SkewbMoveAmount;
}

const SKEWB_MOVE_PATTERN = /^([RULB])('?)$/;
const SKEWB_AXIS_SET = new Set<string>(SKEWB_AXES);

const isSkewbAxis = (face: string): face is SkewbAxis =>
  SKEWB_AXIS_SET.has(face);

export const parseSkewbMove = (token: string): SkewbMove => {
  const match = token.match(SKEWB_MOVE_PATTERN);
  if (!match) throw new InvalidMoveError(token, 'skewb');

  const [, face, suffix] = match;
  if (face === undefined || !isSkewbAxis(face)) {
    throw new InvalidMoveError(token, 'skewb');
  }

  return {
    face,
    amount: suffix === "'" ? 2 : 1,
  };
};

export const parseSkewbAlgorithm = (
  algorithm: string,
): readonly SkewbMove[] => splitAlgorithm(algorithm).map(parseSkewbMove);
