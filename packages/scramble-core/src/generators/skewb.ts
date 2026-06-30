import type { RandomSource } from '../random-source.js';
import { SkewbSolver } from '@cubegin/solver';

const ERROR_PREFIX = '@cubegin/scramble-core';
const SCRAMBLE_LENGTH = 11;
const MIN_SCRAMBLE_DISTANCE = 7;
const MAX_ATTEMPTS = 100;

export interface SkewbScrambleOptions {
  random: RandomSource;
}

export const generateSkewbScramble = ({ random }: SkewbScrambleOptions): string => {
  const solver = new SkewbSolver();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const state = solver.randomState(random);
    const isTooCloseToSolved = solver.solveIn(state, MIN_SCRAMBLE_DISTANCE - 1, random) !== null;

    if (isTooCloseToSolved) continue;

    return solver.generateExactly(state, SCRAMBLE_LENGTH, random);
  }

  throw new Error(
    `${ERROR_PREFIX}: could not generate a Skewb scramble after ${MAX_ATTEMPTS} attempts`,
  );
};
