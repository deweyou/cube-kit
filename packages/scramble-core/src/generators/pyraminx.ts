import type { RandomSource } from '../random-source.js';
import { PyraminxSolver } from '../solvers/pyraminx-solver.js';

const SCRAMBLE_LENGTH = 11;

export interface PyraminxScrambleOptions {
  random: RandomSource;
}

export const generatePyraminxScramble = ({
  random,
}: PyraminxScrambleOptions): string => {
  const solver = new PyraminxSolver();

  return solver.generateExactly(
    solver.randomState(random),
    SCRAMBLE_LENGTH,
    false,
    random,
  );
};
