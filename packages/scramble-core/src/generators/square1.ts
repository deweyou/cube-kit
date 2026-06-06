import {
  applySquareOneMove,
  createSolvedSquareOneState,
  parseSquareOneAlgorithm,
  type SquareOneState,
} from '@cubegin/scramble-puzzle';
import type { RandomSource } from '../random-source.js';
import { FullCube } from '../solvers/sq12phase/full-cube.js';
import { INVERSE_SOLUTION, Search, solveSquareOneStateIn } from '../solvers/sq12phase/search.js';

const ERROR_PREFIX = '@cubegin/scramble-core';
const WCA_MIN_SCRAMBLE_DISTANCE = 11;
const MAX_WCA_ATTEMPTS = 100;

export interface SquareOneScrambleOptions {
  random: RandomSource;
}

export const generateSquareOneScramble = ({ random }: SquareOneScrambleOptions): string => {
  const search = new Search();

  for (let attempt = 0; attempt < MAX_WCA_ATTEMPTS; attempt += 1) {
    const randomState = FullCube.randomCube(random);
    const solution = search.solution(randomState, INVERSE_SOLUTION);
    if (solution === null) continue;

    const scramble = solution.trim();
    const state = applyScrambleToSolvedState(scramble);
    const isTooCloseToSolved = solveSquareOneStateIn(state, WCA_MIN_SCRAMBLE_DISTANCE - 1) !== null;

    if (isTooCloseToSolved) continue;

    return scramble;
  }

  throw new Error(
    `${ERROR_PREFIX}: could not generate a Square-1 WCA scramble after ${MAX_WCA_ATTEMPTS} attempts`,
  );
};

const applyScrambleToSolvedState = (scramble: string): SquareOneState => {
  let state = createSolvedSquareOneState();

  for (const move of parseSquareOneAlgorithm(scramble)) {
    state = applySquareOneMove(state, move);
  }

  return state;
};
