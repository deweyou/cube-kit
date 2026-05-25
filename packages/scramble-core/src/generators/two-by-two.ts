import type { RandomSource } from '../random-source.js';
import { TwoByTwoSolver } from '../solvers/two-by-two-solver.js';

const SCRAMBLE_LENGTH = 11;

export interface TwoByTwoScrambleOptions {
  random: RandomSource;
}

export const generateTwoByTwoScramble = ({
  random,
}: TwoByTwoScrambleOptions): string => {
  const solver = new TwoByTwoSolver();
  return solver.generateExactly(solver.randomState(random), SCRAMBLE_LENGTH);
};
