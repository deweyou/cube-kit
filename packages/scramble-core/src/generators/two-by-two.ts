import type { RandomSource } from '../random-source.js';
import { TwoByTwoSolver } from '@cubegin/solver';

const ERROR_PREFIX = '@cubegin/scramble-core';
const SCRAMBLE_LENGTH = 11;
const WCA_MIN_SCRAMBLE_DISTANCE = 4;
const MAX_WCA_ATTEMPTS = 100;

export interface TwoByTwoScrambleOptions {
  random: RandomSource;
}

export const generateTwoByTwoScramble = ({ random }: TwoByTwoScrambleOptions): string => {
  const solver = new TwoByTwoSolver();

  for (let attempt = 0; attempt < MAX_WCA_ATTEMPTS; attempt += 1) {
    const state = solver.randomState(random);
    const isTooCloseToSolved = solver.solveIn(state, WCA_MIN_SCRAMBLE_DISTANCE - 1) !== null;

    if (isTooCloseToSolved) continue;

    return solver.generateExactly(state, SCRAMBLE_LENGTH);
  }

  throw new Error(
    `${ERROR_PREFIX}: could not generate a 2x2 WCA scramble after ${MAX_WCA_ATTEMPTS} attempts`,
  );
};
