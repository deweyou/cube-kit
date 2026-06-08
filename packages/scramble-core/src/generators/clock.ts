import { ClockSolver } from '@cubegin/solver';
import type { RandomSource } from '../random-source.js';

export interface ClockScrambleOptions {
  random: RandomSource;
}

export const generateClockScramble = ({ random }: ClockScrambleOptions): string =>
  new ClockSolver().randomStateScramble(random);
