import { splitAlgorithm } from '../algorithm.js';
import { InvalidMoveError } from '../errors.js';

export type SquareOneTurn = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;

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
const MALFORMED_MOVE = '<malformed>';

const isSquareOneRecord = (move: unknown): move is Record<string, unknown> =>
  typeof move === 'object' && move !== null;

const isSquareOneTurn = (turn: unknown): turn is SquareOneTurn =>
  typeof turn === 'number' && Number.isSafeInteger(turn) && turn >= MIN_TURN && turn <= MAX_TURN;

const hasOnlyKeys = (move: object, expectedKeys: readonly string[]): boolean =>
  Object.keys(move).length === expectedKeys.length &&
  expectedKeys.every((key) => Object.hasOwn(move, key));

export const isSquareOneTupleMove = (move: unknown): move is SquareOneTupleMove =>
  isSquareOneRecord(move) && move.type === 'tuple';

const isSquareOneSlashMove = (move: unknown): move is SquareOneSlashMove =>
  isSquareOneRecord(move) && move.type === 'slash' && hasOnlyKeys(move, ['type']);

export const validateSquareOneMove = (move: unknown): SquareOneMove => {
  if (isSquareOneSlashMove(move)) return move;

  if (
    isSquareOneTupleMove(move) &&
    hasOnlyKeys(move, ['type', 'top', 'bottom']) &&
    isSquareOneTurn(move.top) &&
    isSquareOneTurn(move.bottom) &&
    (move.top !== 0 || move.bottom !== 0)
  ) {
    return move;
  }

  throw new InvalidMoveError(MALFORMED_MOVE, 'square1');
};

export const parseSquareOneMove = (token: string): SquareOneMove => {
  if (token === '/') return { type: 'slash' };

  const match = token.match(SQUARE_ONE_MOVE_PATTERN);
  if (!match) throw new InvalidMoveError(token, 'square1');

  const [, topText, bottomText] = match;
  const top = Number(topText);
  const bottom = Number(bottomText);

  if (!isSquareOneTurn(top) || !isSquareOneTurn(bottom) || (top === 0 && bottom === 0)) {
    throw new InvalidMoveError(token, 'square1');
  }

  return { type: 'tuple', top, bottom };
};

export const parseSquareOneAlgorithm = (algorithm: string): readonly SquareOneMove[] =>
  splitAlgorithm(algorithm).map(parseSquareOneMove);

export const getSquareOneMoveCost = (move: SquareOneMove): number => {
  validateSquareOneMove(move);

  return 1;
};

export const getSquareOneSlashabilityMoveCost = (move: SquareOneMove): number | undefined => {
  const validMove = validateSquareOneMove(move);
  if (validMove.type === 'slash') return undefined;

  return Math.abs(validMove.top) + Math.abs(validMove.bottom);
};
