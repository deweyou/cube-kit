import { InvalidMoveError } from '../errors.js';
import {
  validateSquareOneMove,
  type SquareOneMove,
  type SquareOneTupleMove,
  type SquareOneTurn,
} from './square1-parser.js';

export type SquareOnePiece = number;
export type SquareOnePieces = readonly SquareOnePiece[];

export interface SquareOneState {
  readonly sliceSolved: boolean;
  readonly pieces: SquareOnePieces;
}

export interface SquareOneSuccessor {
  readonly move: SquareOneMove;
  readonly state: SquareOneState;
}

const PIECE_COUNT = 24;
const TOP_START = 0;
const BOTTOM_START = 12;
const HALF_PIECE_COUNT = 12;
const SLICE_WIDTH = 6;

const SOLVED_SQUARE_ONE_PIECES = [
  0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 11, 12, 13, 13, 14,
  15, 15,
] as const satisfies SquareOnePieces;
const SQUARE_ONE_TURNS = [
  -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6,
] as const satisfies readonly SquareOneTurn[];

const createSquareOneState = (
  sliceSolved: boolean,
  pieces: readonly number[],
): SquareOneState => {
  if (pieces.length !== PIECE_COUNT) {
    throw new RangeError(
      `square1 state must contain 24 piece positions: ${pieces.length}`,
    );
  }

  for (const piece of pieces) {
    if (!Number.isSafeInteger(piece) || piece < 0 || piece > 15) {
      throw new RangeError(
        'square1 pieces must be integer piece indexes from 0 to 15',
      );
    }
  }

  return Object.freeze({
    sliceSolved,
    pieces: Object.freeze([...pieces]),
  });
};

const rotateHalf = (
  pieces: SquareOnePiece[],
  start: number,
  turn: number,
): void => {
  // TNoodle signs are opposite the array offset direction.
  const offset = ((-turn % HALF_PIECE_COUNT) + HALF_PIECE_COUNT) %
    HALF_PIECE_COUNT;
  const half = pieces.slice(start, start + HALF_PIECE_COUNT);

  for (let index = 0; index < HALF_PIECE_COUNT; index += 1) {
    pieces[start + index] = half[(offset + index) % HALF_PIECE_COUNT];
  }
};

const rotateTopAndBottom = (
  pieces: SquareOnePieces,
  move: SquareOneTupleMove,
): SquareOnePiece[] => {
  const nextPieces = [...pieces];

  rotateHalf(nextPieces, TOP_START, move.top);
  rotateHalf(nextPieces, BOTTOM_START, move.bottom);

  return nextPieces;
};

const slashPieces = (pieces: SquareOnePieces): SquareOnePiece[] => {
  const nextPieces = [...pieces];

  for (let index = 0; index < SLICE_WIDTH; index += 1) {
    const topIndex = TOP_START + SLICE_WIDTH + index;
    const bottomIndex = BOTTOM_START + index;
    const bottomPiece = nextPieces[bottomIndex];

    nextPieces[bottomIndex] = nextPieces[topIndex];
    nextPieces[topIndex] = bottomPiece;
  }

  return nextPieces;
};

export const createSolvedSquareOneState = (): SquareOneState =>
  createSquareOneState(true, SOLVED_SQUARE_ONE_PIECES);

export const canSquareOneSlash = (state: SquareOneState): boolean =>
  state.pieces[0] !== state.pieces[11] &&
  state.pieces[6] !== state.pieces[5] &&
  state.pieces[12] !== state.pieces[23] &&
  state.pieces[18] !== state.pieces[17];

export const applySquareOneMove = (
  state: SquareOneState,
  move: SquareOneMove,
): SquareOneState => {
  const validMove = validateSquareOneMove(move);

  if (validMove.type === 'slash') {
    if (!canSquareOneSlash(state)) {
      throw new InvalidMoveError('/', 'square1');
    }

    return createSquareOneState(!state.sliceSolved, slashPieces(state.pieces));
  }

  return createSquareOneState(
    state.sliceSolved,
    rotateTopAndBottom(state.pieces, validMove),
  );
};

export const areSquareOneStatesEqual = (
  a: SquareOneState,
  b: SquareOneState,
): boolean =>
  a.sliceSolved === b.sliceSolved &&
  a.pieces.length === PIECE_COUNT &&
  b.pieces.length === PIECE_COUNT &&
  a.pieces.every((piece, index) => piece === b.pieces[index]);

export const getSquareOneSuccessors = (
  state: SquareOneState,
): readonly SquareOneSuccessor[] => {
  const successors: SquareOneSuccessor[] = [];

  for (const top of SQUARE_ONE_TURNS) {
    for (const bottom of SQUARE_ONE_TURNS) {
      if (top === 0 && bottom === 0) continue;

      const move = {
        type: 'tuple',
        top,
        bottom,
      } as const satisfies SquareOneTupleMove;

      successors.push({
        move,
        state: applySquareOneMove(state, move),
      });
    }
  }

  if (canSquareOneSlash(state)) {
    const move = { type: 'slash' } as const;

    successors.push({
      move,
      state: applySquareOneMove(state, move),
    });
  }

  return Object.freeze(successors);
};

export const getSquareOneScrambleSuccessors = (
  state: SquareOneState,
): readonly SquareOneSuccessor[] =>
  getSquareOneSuccessors(state).filter((successor) =>
    canSquareOneSlash(successor.state),
  );
