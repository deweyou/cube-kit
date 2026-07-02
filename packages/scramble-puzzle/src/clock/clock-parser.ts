import { splitAlgorithm } from '../algorithm.js';
import { InvalidMoveError } from '../errors.js';

export const CLOCK_TURN_NAMES = ['UR', 'DR', 'DL', 'UL', 'U', 'R', 'D', 'L', 'ALL'] as const;

export type ClockTurnName = (typeof CLOCK_TURN_NAMES)[number];
export type ClockDirection = '+' | '-';

export interface ClockTurnMove {
  readonly type: 'turn';
  readonly name: ClockTurnName;
  readonly amount: number;
  readonly direction: ClockDirection;
}

export type ClockRotationAxis = 'x' | 'y' | 'z';
export type ClockRotationAmount = -1 | 1 | 2;

export interface ClockRotationMove {
  readonly type: 'rotation';
  readonly axis: ClockRotationAxis;
  readonly amount: ClockRotationAmount;
}

export type ClockMove = ClockTurnMove | ClockRotationMove;

const CLOCK_MOVE_PATTERN = /^(UR|DR|DL|UL|ALL|U|R|D|L)(\d)([+-])$/;
const CLOCK_TURN_NAME_SET = new Set<string>(CLOCK_TURN_NAMES);

const isClockTurnName = (name: string): name is ClockTurnName => CLOCK_TURN_NAME_SET.has(name);

export const parseClockMove = (token: string): ClockMove => {
  if (token === 'x2' || token === 'y2') {
    return { type: 'rotation', axis: token === 'x2' ? 'x' : 'y', amount: 2 };
  }
  if (token === 'z' || token === "z'" || token === 'z2') {
    const amount = token === "z'" ? -1 : token === 'z2' ? 2 : 1;

    return { type: 'rotation', axis: 'z', amount };
  }

  const match = token.match(CLOCK_MOVE_PATTERN);
  if (!match) throw new InvalidMoveError(token, 'clock');

  const [, name, amountText, direction] = match;
  if (!isClockTurnName(name) || (direction !== '+' && direction !== '-')) {
    throw new InvalidMoveError(token, 'clock');
  }

  const amount = Number(amountText);
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    amount > 6 ||
    (direction === '-' && (amount === 0 || amount === 6))
  ) {
    throw new InvalidMoveError(token, 'clock');
  }

  return { type: 'turn', name, amount, direction };
};

export const parseClockAlgorithm = (algorithm: string): readonly ClockMove[] =>
  splitAlgorithm(algorithm).map(parseClockMove);
