import { splitAlgorithm } from '../algorithm.js';
import { InvalidMoveError } from '../errors.js';

export type SquareOneTurn =
  | -5
  | -4
  | -3
  | -2
  | -1
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;

export interface SquareOneTupleMove {
  readonly type: 'tuple';
  readonly top: SquareOneTurn;
  readonly bottom: SquareOneTurn;
}

export interface SquareOneSlashMove {
  readonly type: 'slash';
}

export type SquareOneMove = SquareOneTupleMove | SquareOneSlashMove;

const SQUARE_ONE_MOVE_PATTERN = /^\((-?\d+),(-?\d+)\)$/;
const MIN_TURN = -5;
const MAX_TURN = 6;

const isSquareOneTurn = (turn: number): turn is SquareOneTurn =>
  Number.isSafeInteger(turn) && turn >= MIN_TURN && turn <= MAX_TURN;

export const isSquareOneTupleMove = (
  move: SquareOneMove,
): move is SquareOneTupleMove => move.type === 'tuple';

export const parseSquareOneMove = (token: string): SquareOneMove => {
  if (token === '/') return { type: 'slash' };

  const match = token.match(SQUARE_ONE_MOVE_PATTERN);
  if (!match) throw new InvalidMoveError(token, 'square1');

  const [, topText, bottomText] = match;
  const top = Number(topText);
  const bottom = Number(bottomText);

  if (
    !isSquareOneTurn(top) ||
    !isSquareOneTurn(bottom) ||
    (top === 0 && bottom === 0)
  ) {
    throw new InvalidMoveError(token, 'square1');
  }

  return { type: 'tuple', top, bottom };
};

export const parseSquareOneAlgorithm = (
  algorithm: string,
): readonly SquareOneMove[] => splitAlgorithm(algorithm).map(parseSquareOneMove);

export const getSquareOneMoveCost = (move: SquareOneMove): number => {
  if (move.type === 'slash') return 1;

  if (
    !isSquareOneTurn(move.top) ||
    !isSquareOneTurn(move.bottom) ||
    (move.top === 0 && move.bottom === 0)
  ) {
    throw new InvalidMoveError('<malformed>', 'square1');
  }

  return 1;
};

export const getSquareOneSlashabilityMoveCost = (
  move: SquareOneMove,
): number | undefined => {
  if (move.type === 'slash') return undefined;

  if (
    !isSquareOneTurn(move.top) ||
    !isSquareOneTurn(move.bottom) ||
    (move.top === 0 && move.bottom === 0)
  ) {
    throw new InvalidMoveError('<malformed>', 'square1');
  }

  return Math.abs(move.top) + Math.abs(move.bottom);
};
