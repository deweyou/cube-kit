import type { RandomSource } from '../random-source.js';
import { SkewbSolver } from '../solvers/skewb-solver.js';

const ERROR_PREFIX = '@cubekit/scramble-core';
const SCRAMBLE_LENGTH = 11;
const WCA_MIN_SCRAMBLE_DISTANCE = 7;
const MAX_WCA_ATTEMPTS = 100;

export interface SkewbScrambleOptions {
  random: RandomSource;
}

export const generateSkewbScramble = ({
  random,
}: SkewbScrambleOptions): string => {
  const solver = new SkewbSolver();

  for (let attempt = 0; attempt < MAX_WCA_ATTEMPTS; attempt += 1) {
    const state = solver.randomState(random);
    const isTooCloseToSolved =
      solver.solveIn(state, WCA_MIN_SCRAMBLE_DISTANCE - 1, random) !== null;

    if (isTooCloseToSolved) continue;

    return solver.generateExactly(state, SCRAMBLE_LENGTH, random);
  }

  throw new Error(
    `${ERROR_PREFIX}: could not generate a Skewb WCA scramble after ${MAX_WCA_ATTEMPTS} attempts`,
  );
};
