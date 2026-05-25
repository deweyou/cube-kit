import { InvalidMoveError } from '../errors.js';
import {
  CLOCK_TURN_NAMES,
  type ClockMove,
  type ClockTurnMove,
} from './clock-parser.js';

export type ClockPositions = readonly number[];

export interface ClockState {
  readonly positions: ClockPositions;
  readonly rightSideUp: boolean;
}

const MALFORMED_MOVE = '<malformed>';

const CLOCK_MOVE_DELTAS: ReadonlyMap<ClockTurnMove['name'], readonly number[]> =
  new Map([
    ['UR', [0, 1, 1, 0, 1, 1, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0]],
    ['DR', [0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, -1, 0, 0]],
    ['DL', [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1]],
    ['UL', [1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0]],
    ['U', [1, 1, 1, 1, 1, 1, 0, 0, 0, -1, 0, -1, 0, 0, 0, 0, 0, 0]],
    ['R', [0, 1, 1, 0, 1, 1, 0, 1, 1, -1, 0, 0, 0, 0, 0, -1, 0, 0]],
    ['D', [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, -1, 0, -1]],
    ['L', [1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, -1, 0, 0, 0, 0, 0, -1]],
    ['ALL', [1, 1, 1, 1, 1, 1, 1, 1, 1, -1, 0, -1, 0, 0, 0, -1, 0, -1]],
  ]);

const createClockState = (
  positions: readonly number[],
  rightSideUp: boolean,
): ClockState => {
  if (positions.length !== 18) {
    throw new RangeError(
      `clock state must contain 18 dial positions: ${positions.length}`,
    );
  }

  return Object.freeze({
    positions: Object.freeze([...positions]),
    rightSideUp,
  });
};

const validateMove = (move: ClockMove): ClockMove => {
  if (typeof move !== 'object' || move === null) {
    throw new InvalidMoveError(MALFORMED_MOVE, 'clock');
  }

  if (move.type === 'rotation') return move;

  if (
    move.type !== 'turn' ||
    !CLOCK_TURN_NAMES.includes(move.name) ||
    (move.direction !== '+' && move.direction !== '-') ||
    !Number.isSafeInteger(move.amount) ||
    move.amount < 0 ||
    move.amount > 6 ||
    (move.direction === '-' && (move.amount === 0 || move.amount === 6))
  ) {
    throw new InvalidMoveError(MALFORMED_MOVE, 'clock');
  }

  return move;
};

const moduloClock = (position: number): number => ((position % 12) + 12) % 12;

export const createSolvedClockState = (): ClockState =>
  createClockState(Array<number>(18).fill(0), true);

export const applyClockMove = (
  state: ClockState,
  move: ClockMove,
): ClockState => {
  const validMove = validateMove(move);

  if (validMove.type === 'rotation') {
    return createClockState(
      [...state.positions.slice(9), ...state.positions.slice(0, 9)],
      !state.rightSideUp,
    );
  }

  const deltas = CLOCK_MOVE_DELTAS.get(validMove.name);
  if (deltas === undefined) throw new InvalidMoveError(MALFORMED_MOVE, 'clock');

  const signedAmount =
    validMove.direction === '+' ? validMove.amount : -validMove.amount;

  return createClockState(
    state.positions.map((position, index) =>
      moduloClock(position + signedAmount * (deltas[index] ?? 0)),
    ),
    state.rightSideUp,
  );
};

export const areClockStatesEqual = (a: ClockState, b: ClockState): boolean =>
  a.positions.every((position, index) => position === b.positions[index]);
