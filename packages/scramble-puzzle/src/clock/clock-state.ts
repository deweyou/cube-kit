import { InvalidMoveError } from '../errors.js';
import { CLOCK_TURN_NAMES, type ClockMove, type ClockTurnMove } from './clock-parser.js';

export type ClockPositions = readonly number[];
export type ClockFaceRotation = 0 | 1 | 2 | 3;
export type ClockFaceRotations = readonly [ClockFaceRotation, ClockFaceRotation];
type ClockTurnCoordinate = { readonly x: -1 | 0 | 1; readonly y: -1 | 0 | 1 };

export interface ClockState {
  readonly positions: ClockPositions;
  readonly rightSideUp: boolean;
  readonly rotations: ClockFaceRotations;
}

const MALFORMED_MOVE = '<malformed>';

const CLOCK_MOVE_DELTAS: ReadonlyMap<ClockTurnMove['name'], readonly number[]> = new Map([
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

const SOLVED_ROTATIONS = [0, 0] as const satisfies ClockFaceRotations;

const normalizeClockFaceRotation = (quarterTurns: number): ClockFaceRotation =>
  (((quarterTurns % 4) + 4) % 4) as ClockFaceRotation;

const createClockState = (
  positions: readonly number[],
  rightSideUp: boolean,
  rotations: ClockFaceRotations = SOLVED_ROTATIONS,
): ClockState => {
  if (positions.length !== 18) {
    throw new RangeError(`clock state must contain 18 dial positions: ${positions.length}`);
  }

  return Object.freeze({
    positions: Object.freeze([...positions]),
    rightSideUp,
    rotations: Object.freeze([...rotations]) as unknown as ClockFaceRotations,
  });
};

const clockFaceRotationsFor = (state: ClockState): ClockFaceRotations =>
  state.rotations ?? SOLVED_ROTATIONS;

const validateMove = (move: ClockMove): ClockMove => {
  if (typeof move !== 'object' || move === null) {
    throw new InvalidMoveError(MALFORMED_MOVE, 'clock');
  }

  if (move.type === 'rotation') {
    if (
      (move.axis !== 'x' && move.axis !== 'y' && move.axis !== 'z') ||
      !Number.isSafeInteger(move.amount) ||
      (move.amount !== -1 && move.amount !== 1 && move.amount !== 2) ||
      (move.axis !== 'z' && move.amount !== 2)
    ) {
      throw new InvalidMoveError(MALFORMED_MOVE, 'clock');
    }

    return move;
  }

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

const CLOCK_TURN_COORDINATES = {
  D: { x: 0, y: -1 },
  DL: { x: -1, y: -1 },
  DR: { x: 1, y: -1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
  U: { x: 0, y: 1 },
  UL: { x: -1, y: 1 },
  UR: { x: 1, y: 1 },
} satisfies Record<Exclude<ClockTurnMove['name'], 'ALL'>, ClockTurnCoordinate>;

const CLOCK_TURN_NAME_BY_COORDINATE = new Map<string, Exclude<ClockTurnMove['name'], 'ALL'>>(
  Object.entries(CLOCK_TURN_COORDINATES).map(([name, coordinate]) => [
    `${coordinate.x},${coordinate.y}`,
    name as Exclude<ClockTurnMove['name'], 'ALL'>,
  ]),
);

const rotateCoordinateCounterClockwise = (
  coordinate: ClockTurnCoordinate,
  quarterTurns: ClockFaceRotation,
): ClockTurnCoordinate => {
  let nextCoordinate = coordinate;

  for (let turn = 0; turn < quarterTurns; turn += 1) {
    nextCoordinate = {
      x: (-nextCoordinate.y) as -1 | 0 | 1,
      y: nextCoordinate.x,
    };
  }

  return nextCoordinate;
};

export const getClockTurnNameForFaceRotation = (
  name: ClockTurnMove['name'],
  rotation: ClockFaceRotation,
): ClockTurnMove['name'] => {
  if (name === 'ALL') return name;

  const coordinate = CLOCK_TURN_COORDINATES[name];
  const rotatedCoordinate = rotateCoordinateCounterClockwise(coordinate, rotation);
  const rotatedName = CLOCK_TURN_NAME_BY_COORDINATE.get(
    `${rotatedCoordinate.x},${rotatedCoordinate.y}`,
  );

  if (rotatedName === undefined) throw new InvalidMoveError(MALFORMED_MOVE, 'clock');

  return rotatedName;
};

export const getClockTurnMoveForState = (
  state: ClockState,
  move: ClockTurnMove,
): ClockTurnMove => ({
  ...move,
  name: getClockTurnNameForFaceRotation(move.name, clockFaceRotationsFor(state)[0]),
});

export const createSolvedClockState = (): ClockState =>
  createClockState(Array<number>(18).fill(0), true);

export const applyClockMove = (state: ClockState, move: ClockMove): ClockState => {
  const validMove = validateMove(move);

  if (validMove.type === 'rotation') {
    if (validMove.axis === 'z') {
      const rotations = clockFaceRotationsFor(state);

      return createClockState(state.positions, state.rightSideUp, [
        normalizeClockFaceRotation(rotations[0] + validMove.amount),
        normalizeClockFaceRotation(rotations[1] - validMove.amount),
      ]);
    }

    const rotations = clockFaceRotationsFor(state);

    return createClockState(
      [...state.positions.slice(9), ...state.positions.slice(0, 9)],
      !state.rightSideUp,
      [rotations[1], rotations[0]],
    );
  }

  const orientedMove = getClockTurnMoveForState(state, validMove);
  const deltas = CLOCK_MOVE_DELTAS.get(orientedMove.name);
  if (deltas === undefined) throw new InvalidMoveError(MALFORMED_MOVE, 'clock');

  const signedAmount = orientedMove.direction === '+' ? orientedMove.amount : -orientedMove.amount;

  return createClockState(
    state.positions.map((position, index) =>
      moduloClock(position + signedAmount * (deltas[index] ?? 0)),
    ),
    state.rightSideUp,
    clockFaceRotationsFor(state),
  );
};

export const areClockStatesEqual = (a: ClockState, b: ClockState): boolean =>
  a.rightSideUp === b.rightSideUp &&
  clockFaceRotationsFor(a).every(
    (rotation, index) => rotation === clockFaceRotationsFor(b)[index],
  ) &&
  a.positions.every((position, index) => position === b.positions[index]);
