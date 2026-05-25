import type { RandomSource } from '../random-source.js';

const CLOCK_FIRST_SIDE_MOVES = [
  'UR',
  'DR',
  'DL',
  'UL',
  'U',
  'R',
  'D',
  'L',
  'ALL',
] as const;
const CLOCK_SECOND_SIDE_MOVES = ['U', 'R', 'D', 'L', 'ALL'] as const;

export interface ClockScrambleOptions {
  random: RandomSource;
}

const nextClockTurn = (move: string, random: RandomSource): string => {
  const turn = random.nextInt(12) - 5;
  const isClockwise = turn >= 0;

  return `${move}${Math.abs(turn)}${isClockwise ? '+' : '-'}`;
};

export const generateClockScramble = ({
  random,
}: ClockScrambleOptions): string => {
  const moves = [
    ...CLOCK_FIRST_SIDE_MOVES.map((move) => nextClockTurn(move, random)),
    'y2',
    ...CLOCK_SECOND_SIDE_MOVES.map((move) => nextClockTurn(move, random)),
  ];

  return moves.join(' ');
};
