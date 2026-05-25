import type { RandomSource } from '../random-source.js';
import { PyraminxSolver } from '../solvers/pyraminx-solver.js';

const ERROR_PREFIX = '@cubekit/scramble-core';
const SCRAMBLE_LENGTH = 11;
const WCA_MIN_SCRAMBLE_DISTANCE = 6;
const MAX_WCA_ATTEMPTS = 100;

export interface PyraminxScrambleOptions {
  random: RandomSource;
}

export const generatePyraminxScramble = ({
  random,
}: PyraminxScrambleOptions): string => {
  const solver = new PyraminxSolver();

  for (let attempt = 0; attempt < MAX_WCA_ATTEMPTS; attempt += 1) {
    const state = solver.randomState(random);
    const isTooCloseToSolved =
      solver.solveIn(state, WCA_MIN_SCRAMBLE_DISTANCE - 1, true, random) !==
      null;

    if (isTooCloseToSolved) continue;

    return solver.generateExactly(state, SCRAMBLE_LENGTH, false, random);
  }

  throw new Error(
    `${ERROR_PREFIX}: could not generate a Pyraminx WCA scramble after ${MAX_WCA_ATTEMPTS} attempts`,
  );
};
