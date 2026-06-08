import type { RandomSource } from '../random-source.js';
import {
  axisForRestriction,
  MIN2PHASE_INVERSE_SOLUTION as INVERSE_SOLUTION,
  randomCube,
  SearchWCA,
  splitMin2PhaseAlgorithm as splitAlgorithm,
} from '@cubegin/solver';

const THREE_BY_THREE_MAX_SCRAMBLE_LENGTH = 21;
const THREE_BY_THREE_PROBE_MAX = 100_000;
const THREE_BY_THREE_PROBE_MIN = 0;
const THREE_BY_THREE_MAX_ATTEMPTS = 20;
const FMC_PADDING = "R' U' F";

const ORIENTATION_SEQUENCES = [
  [],
  ['Uw'],
  ['Uw2'],
  ["Uw'"],
  ['Rw'],
  ['Rw', 'Uw'],
  ['Rw', 'Uw2'],
  ['Rw', "Uw'"],
  ['Rw2'],
  ['Rw2', 'Uw'],
  ['Rw2', 'Uw2'],
  ['Rw2', "Uw'"],
  ["Rw'"],
  ["Rw'", 'Uw'],
  ["Rw'", 'Uw2'],
  ["Rw'", "Uw'"],
  ['Fw'],
  ['Fw', 'Uw'],
  ['Fw', 'Uw2'],
  ['Fw', "Uw'"],
  ["Fw'"],
  ["Fw'", 'Uw'],
  ["Fw'", 'Uw2'],
  ["Fw'", "Uw'"],
] as const;

export interface ThreeByThreeScrambleOptions {
  random: RandomSource;
}

export interface MultiBlindScrambleOptions {
  random: RandomSource;
  cubeCount: number;
}

export const generateThreeByThreeScramble = ({ random }: ThreeByThreeScrambleOptions): string =>
  generateInverseSolution({
    random,
  });

export const generateThreeByThreeNoInspectionScramble = ({
  random,
}: ThreeByThreeScrambleOptions): string => {
  const orientation = chooseOrientation(random);
  const lastAxisRestriction = orientation[0]?.[0] ?? null;
  const scramble = generateInverseSolution({
    random,
    lastAxisRestriction,
  });

  return [...splitAlgorithm(scramble), ...orientation].join(' ');
};

export const generateThreeByThreeFewestMovesScramble = ({
  random,
}: ThreeByThreeScrambleOptions): string => {
  const scramble = generateInverseSolution({
    random,
    firstAxisRestriction: 'F',
    lastAxisRestriction: 'R',
  });

  return `${FMC_PADDING} ${scramble} ${FMC_PADDING}`;
};

export const generateMultiBlindScramble = ({
  random,
  cubeCount,
}: MultiBlindScrambleOptions): string => {
  validateCubeCount(cubeCount);

  return Array.from({ length: cubeCount }, () =>
    generateThreeByThreeNoInspectionScramble({ random }),
  ).join('\n');
};

interface GenerateInverseSolutionOptions {
  random: RandomSource;
  firstAxisRestriction?: string | null;
  lastAxisRestriction?: string | null;
}

const generateInverseSolution = ({
  random,
  firstAxisRestriction,
  lastAxisRestriction,
}: GenerateInverseSolutionOptions): string => {
  const search = new SearchWCA();

  for (let attempt = 0; attempt < THREE_BY_THREE_MAX_ATTEMPTS; attempt += 1) {
    const solution = search
      .solution(
        randomCube(random),
        THREE_BY_THREE_MAX_SCRAMBLE_LENGTH,
        THREE_BY_THREE_PROBE_MAX,
        THREE_BY_THREE_PROBE_MIN,
        INVERSE_SOLUTION,
        firstAxisRestriction,
        lastAxisRestriction,
      )
      .trim();

    if (!solution.startsWith('Error')) {
      if (satisfiesAxisRestrictions(solution, firstAxisRestriction, lastAxisRestriction)) {
        return solution;
      }

      continue;
    }
    if (solution !== 'Error 7' && solution !== 'Error 8') {
      throw new Error(`@cubegin/scramble-core: min2phase returned ${solution}`);
    }
  }

  throw new Error(
    '@cubegin/scramble-core: min2phase could not find a 3x3 scramble within retry limit',
  );
};

const satisfiesAxisRestrictions = (
  scramble: string,
  firstAxisRestriction: string | null | undefined,
  lastAxisRestriction: string | null | undefined,
): boolean => {
  const moves = splitAlgorithm(scramble);

  return (
    !violatesAxisRestriction(moves[0], firstAxisRestriction) &&
    !violatesAxisRestriction(moves.at(-1), lastAxisRestriction)
  );
};

const violatesAxisRestriction = (
  move: string | undefined,
  restriction: string | null | undefined,
): boolean => {
  if (move === undefined || restriction === null || restriction === undefined) {
    return false;
  }

  return axisForRestriction(move[0]) === axisForRestriction(restriction);
};

const chooseOrientation = (random: RandomSource): readonly string[] => {
  const index = random.nextInt(ORIENTATION_SEQUENCES.length);
  const orientation = ORIENTATION_SEQUENCES[index];

  if (orientation === undefined) {
    throw new RangeError(
      `@cubegin/scramble-core: random source returned ${index} for max ${ORIENTATION_SEQUENCES.length}`,
    );
  }

  return orientation;
};

const validateCubeCount = (cubeCount: number): void => {
  if (!Number.isSafeInteger(cubeCount) || cubeCount <= 0) {
    throw new Error(
      '@cubegin/scramble-core: multi-blind cubeCount must be a positive safe integer',
    );
  }
};
