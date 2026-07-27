import { SkewbSolver, type SkewbCubieState, type SkewbSolverState } from '@cubegin/solver';
import { selectScrambleCase, type ScrambleCaseDefinition } from '../case-selection.js';
import type { TrainingScrambleTypeId } from '../catalog.js';
import type { GenerateTypeOptions, TrainingScrambleResult } from '../generator.js';
import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/scramble-core';
const SCRAMBLE_LENGTH = 11;
const MAX_NO_BAR_ATTEMPTS = 1_000;

export type SkewbTrainingScrambleTypeId = Extract<TrainingScrambleTypeId, `skewb.${string}`>;

interface SkewbTrainingCase extends ScrambleCaseDefinition {
  readonly state: SkewbSolverState;
}

const solver = new SkewbSolver();

const enumeratePermutations = (values: readonly number[]): readonly (readonly number[])[] => {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    enumeratePermutations(values.filter((_, candidateIndex) => candidateIndex !== index)).map(
      (suffix) => [value, ...suffix],
    ),
  );
};

const hasEvenParity = (permutation: readonly number[]): boolean => {
  let parity = 0;
  for (let left = 0; left < permutation.length; left += 1) {
    for (let right = left + 1; right < permutation.length; right += 1) {
      if ((permutation[left] as number) > (permutation[right] as number)) parity ^= 1;
    }
  }
  return parity === 0;
};

const L2L_CENTER_PERMUTATIONS = enumeratePermutations([0, 1, 2, 3, 4])
  .filter(hasEvenParity)
  .map((permutation) => [...permutation, 5]);

const L2L_CASES: readonly SkewbTrainingCase[] = L2L_CENTER_PERMUTATIONS.flatMap(
  (centerPermutation) =>
    Array.from({ length: 27 }, (_, orientationCoordinate) => {
      const first = orientationCoordinate % 3;
      const second = Math.floor(orientationCoordinate / 3) % 3;
      const fixed = Math.floor(orientationCoordinate / 9) % 3;
      const cubies: SkewbCubieState = {
        centerPermutation,
        cornerPermutation: [0, 1, 2, 3],
        cornerOrientation: [first, second, 0, (6 - first - second) % 3],
        fixedCornerOrientation: [fixed, 0, 0, (3 - fixed) % 3],
      };
      return {
        id: `skewb.l2l.c${centerPermutation.join('')}.o${orientationCoordinate}`,
        state: solver.stateFromCubies(cubies),
      };
    }),
);

export const generateSkewbTrainingScramble = (
  scrambleTypeId: SkewbTrainingScrambleTypeId,
  options: GenerateTypeOptions & { random: RandomSource },
): TrainingScrambleResult => {
  if (scrambleTypeId === 'skewb.no_bar') {
    return {
      scrambleTypeId,
      eventId: 'skewb',
      scramble: generateNoBarScramble(options.random),
    };
  }

  const selectedCase = selectScrambleCase(L2L_CASES, options, options.random);
  return {
    scrambleTypeId,
    eventId: 'skewb',
    scramble: solver.generateExactly(selectedCase.state, SCRAMBLE_LENGTH, options.random),
    caseId: selectedCase.id,
  };
};

export const getSkewbTrainingCaseDefinitions = (
  scrambleTypeId: SkewbTrainingScrambleTypeId,
): readonly ScrambleCaseDefinition[] =>
  scrambleTypeId === 'skewb.l2l'
    ? L2L_CASES.map(({ id, naturalWeight }) =>
        Object.freeze({ id, ...(naturalWeight === undefined ? {} : { naturalWeight }) }),
      )
    : [];

export const doesSkewbTrainingStateMatch = (
  scrambleTypeId: SkewbTrainingScrambleTypeId,
  scramble: string,
): boolean => {
  const state = solver.stateFromScramble(scramble);
  if (scrambleTypeId === 'skewb.no_bar') return solver.isNoBarState(state);

  return isL2LState(solver.cubiesFromState(state));
};

const isL2LState = (cubies: SkewbCubieState): boolean =>
  cubies.centerPermutation[5] === 5 &&
  cubies.cornerPermutation.every((piece, index) => piece === index) &&
  cubies.cornerOrientation[2] === 0 &&
  cubies.fixedCornerOrientation[1] === 0 &&
  cubies.fixedCornerOrientation[2] === 0;

const generateNoBarScramble = (random: RandomSource): string => {
  for (let attempt = 0; attempt < MAX_NO_BAR_ATTEMPTS; attempt += 1) {
    const state = solver.randomState(random);
    if (!solver.isNoBarState(state)) continue;

    return solver.generateExactly(state, SCRAMBLE_LENGTH, random);
  }

  throw new Error(`${ERROR_PREFIX}: could not sample a Skewb no-bar state`);
};
