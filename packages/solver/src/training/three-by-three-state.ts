import type { RandomSource } from '../random-source.js';
import { CubieCube } from '../full/min2phase/cubie-cube.js';
import { SearchWCA } from '../full/min2phase/search-wca.js';
import { fromScramble, randomState } from '../full/min2phase/tools.js';
import { INVERSE_SOLUTION } from '../full/min2phase/util.js';

const ERROR_PREFIX = '@cubegin/solver';
const MAX_SCRAMBLE_LENGTH = 21;
const PROBE_MAX = 1_000_000_000;
const PROBE_MIN = 50;

export type ThreeByThreeStatePart = 'random' | 'solved' | readonly number[];

export interface ThreeByThreeTrainingStateConstraints {
  readonly cornerPermutation?: ThreeByThreeStatePart;
  readonly cornerOrientation?: ThreeByThreeStatePart;
  readonly edgePermutation?: ThreeByThreeStatePart;
  readonly edgeOrientation?: ThreeByThreeStatePart;
}

export interface ThreeByThreeCubieState {
  readonly cornerPermutation: readonly number[];
  readonly cornerOrientation: readonly number[];
  readonly edgePermutation: readonly number[];
  readonly edgeOrientation: readonly number[];
}

export const createThreeByThreeTrainingState = (
  constraints: ThreeByThreeTrainingStateConstraints,
  random: RandomSource,
): string =>
  randomState(
    normalizePart('cornerPermutation', constraints.cornerPermutation, 8),
    normalizePart('cornerOrientation', constraints.cornerOrientation, 8),
    normalizePart('edgePermutation', constraints.edgePermutation, 12),
    normalizePart('edgeOrientation', constraints.edgeOrientation, 12),
    random,
  );

export const getThreeByThreeCubieState = (facelets: string): ThreeByThreeCubieState => {
  const cube = CubieCube.fromFaceCube(facelets);
  if (cube === null || cube.verify() !== 0) {
    throw new Error(`${ERROR_PREFIX}: invalid 3x3 facelet state`);
  }

  return Object.freeze({
    cornerPermutation: Object.freeze([...cube.cp]),
    cornerOrientation: Object.freeze([...cube.co]),
    edgePermutation: Object.freeze([...cube.ep]),
    edgeOrientation: Object.freeze([...cube.eo]),
  });
};

export const getThreeByThreeCubieStateFromScramble = (scramble: string): ThreeByThreeCubieState =>
  getThreeByThreeCubieState(fromScramble(scramble));

export const scrambleThreeByThreeState = (facelets: string): string => {
  getThreeByThreeCubieState(facelets);

  const scramble = new SearchWCA()
    .solution(facelets, MAX_SCRAMBLE_LENGTH, PROBE_MAX, PROBE_MIN, INVERSE_SOLUTION)
    .trim();
  if (scramble.startsWith('Error')) {
    throw new Error(`${ERROR_PREFIX}: min2phase could not scramble the requested 3x3 state`);
  }

  return scramble;
};

const normalizePart = (
  name: keyof ThreeByThreeTrainingStateConstraints,
  part: ThreeByThreeStatePart | undefined,
  length: number,
): readonly number[] | null => {
  if (part === undefined || part === 'random') return null;
  if (part === 'solved') return [];
  if (part.length !== length) {
    throw new Error(`${ERROR_PREFIX}: ${name} must contain ${length} entries`);
  }
  if (part.some((value) => !Number.isSafeInteger(value) || value < -1 || value >= length)) {
    throw new Error(`${ERROR_PREFIX}: ${name} contains an invalid coordinate value`);
  }

  return [...part];
};
