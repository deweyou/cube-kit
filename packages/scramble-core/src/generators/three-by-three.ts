import type { RandomSource } from '../random-source.js';
import { SearchWCA } from '../solvers/min2phase/search-wca.js';
import { splitAlgorithm } from '../solvers/min2phase/util.js';

const THREE_BY_THREE_MAX_SCRAMBLE_LENGTH = 21;
const FMC_PADDING = "R' U' F";

const ORIENTATION_SEQUENCES = [
  ['Rw'],
  ['Rw2'],
  ["Rw'"],
  ['Fw'],
  ["Fw'"],
  ['Uw'],
  ['Rw', 'Uw'],
  ['Rw', 'Uw2'],
  ['Rw', "Uw'"],
  ['Rw2', 'Uw'],
  ['Rw2', 'Uw2'],
  ['Rw2', "Uw'"],
  ["Rw'", 'Uw'],
  ["Rw'", 'Uw2'],
  ["Rw'", "Uw'"],
  ['Fw', 'Uw'],
  ['Fw', 'Uw2'],
  ['Fw', "Uw'"],
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

export const generateThreeByThreeScramble = ({
  random,
}: ThreeByThreeScrambleOptions): string =>
  createSearcher().generateInverseSolution({
    random,
    maxDepth: THREE_BY_THREE_MAX_SCRAMBLE_LENGTH,
  });

export const generateThreeByThreeNoInspectionScramble = ({
  random,
}: ThreeByThreeScrambleOptions): string => {
  const orientation = chooseOrientation(random);
  const firstAxisRestriction = orientation[0]?.[0] ?? null;
  const scramble = createSearcher().generateInverseSolution({
    random,
    maxDepth: THREE_BY_THREE_MAX_SCRAMBLE_LENGTH,
    firstAxisRestriction,
  });

  return [...splitAlgorithm(scramble), ...orientation].join(' ');
};

export const generateThreeByThreeFewestMovesScramble = ({
  random,
}: ThreeByThreeScrambleOptions): string => {
  const scramble = createSearcher().generateInverseSolution({
    random,
    maxDepth: THREE_BY_THREE_MAX_SCRAMBLE_LENGTH,
    firstAxisRestriction: 'R',
    lastAxisRestriction: 'F',
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

const createSearcher = (): SearchWCA => new SearchWCA();

const chooseOrientation = (random: RandomSource): readonly string[] => {
  const index = random.nextInt(ORIENTATION_SEQUENCES.length);
  const orientation = ORIENTATION_SEQUENCES[index];

  if (orientation === undefined) {
    throw new RangeError(
      `@cubekit/scramble-core: random source returned ${index} for max ${ORIENTATION_SEQUENCES.length}`,
    );
  }

  return orientation;
};

const validateCubeCount = (cubeCount: number): void => {
  if (!Number.isSafeInteger(cubeCount) || cubeCount <= 0) {
    throw new Error(
      '@cubekit/scramble-core: multi-blind cubeCount must be a positive safe integer',
    );
  }
};
