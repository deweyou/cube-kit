import { splitAlgorithm } from '../algorithm.js';
import { InvalidMoveError } from '../errors.js';

export const PYRAMINX_FACES = ['F', 'D', 'L', 'R'] as const;
export const PYRAMINX_AXES = ['U', 'L', 'R', 'B'] as const;

export type PyraminxFace = (typeof PYRAMINX_FACES)[number];
export type PyraminxAxis = (typeof PYRAMINX_AXES)[number];
export type PyraminxMoveAmount = 1 | 2;

export interface PyraminxTurnMove {
  readonly type: 'turn';
  readonly face: PyraminxAxis;
  readonly amount: PyraminxMoveAmount;
}

export interface PyraminxTipMove {
  readonly type: 'tip';
  readonly face: PyraminxAxis;
  readonly amount: PyraminxMoveAmount;
}

export type PyraminxMove = PyraminxTurnMove | PyraminxTipMove;

const PYRAMINX_MOVE_PATTERN = /^([ULRBulrb])('?)$/;
const PYRAMINX_AXIS_SET = new Set<string>(PYRAMINX_AXES);

const isPyraminxAxis = (face: string): face is PyraminxAxis =>
  PYRAMINX_AXIS_SET.has(face);

export const parsePyraminxMove = (token: string): PyraminxMove => {
  const match = token.match(PYRAMINX_MOVE_PATTERN);
  if (!match) throw new InvalidMoveError(token, 'pyraminx');

  const [, rawFace, suffix] = match;
  if (rawFace === undefined) throw new InvalidMoveError(token, 'pyraminx');

  const face = rawFace.toUpperCase();
  if (!isPyraminxAxis(face)) throw new InvalidMoveError(token, 'pyraminx');

  return {
    type: rawFace === face ? 'turn' : 'tip',
    face,
    amount: suffix === "'" ? 2 : 1,
  };
};

export const parsePyraminxAlgorithm = (
  algorithm: string,
): readonly PyraminxMove[] =>
  splitAlgorithm(algorithm).map(parsePyraminxMove);
