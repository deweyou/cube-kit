import { TwoByTwoSolver, type TwoByTwoCubieState, type TwoByTwoState } from '@cubegin/solver';
import { selectScrambleCase, type ScrambleCaseDefinition } from '../case-selection.js';
import type { TrainingScrambleTypeId } from '../catalog.js';
import type { GenerateTypeOptions, TrainingScrambleResult } from '../generator.js';
import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/scramble-core';
const SCRAMBLE_LENGTH = 11;
const MAX_NO_BAR_ATTEMPTS = 1_000;

export type TwoByTwoTrainingScrambleTypeId = Extract<TrainingScrambleTypeId, `222.${string}`>;

interface TwoByTwoTrainingCase extends ScrambleCaseDefinition {
  readonly state: TwoByTwoState;
}

const solver = new TwoByTwoSolver();
const TOP_PIECES = [0, 1, 2, 3] as const;
const SOLVED_BOTTOM = [4, 5, 6] as const;
const EG1_BOTTOMS = [
  [6, 5, 4],
  [5, 4, 6],
  [5, 6, 4],
  [6, 4, 5],
] as const;
const EG2_BOTTOMS = [[4, 6, 5]] as const;

const enumeratePermutations = (values: readonly number[]): readonly (readonly number[])[] => {
  if (values.length <= 1) return [values];

  return values.flatMap((value, index) =>
    enumeratePermutations(values.filter((_, candidateIndex) => candidateIndex !== index)).map(
      (suffix) => [value, ...suffix],
    ),
  );
};

const enumerateOrientations = (
  count: number,
  requiredSumModuloThree: number,
): readonly (readonly number[])[] => {
  const orientations: number[][] = [];
  const prefix = Array.from({ length: count }, () => 0);

  const visit = (index: number): void => {
    if (index === count - 1) {
      const prefixSum = prefix.slice(0, index).reduce((sum, value) => sum + value, 0);
      prefix[index] = (requiredSumModuloThree - (prefixSum % 3) + 3) % 3;
      orientations.push([...prefix]);
      return;
    }

    for (let orientation = 0; orientation < 3; orientation += 1) {
      prefix[index] = orientation;
      visit(index + 1);
    }
  };

  visit(0);
  return orientations;
};

const TOP_PERMUTATIONS = enumeratePermutations(TOP_PIECES);
const TOP_ORIENTATIONS = enumerateOrientations(4, 0);
const PLUS_TOP_ORIENTATIONS = enumerateOrientations(4, 2);
const MINUS_TOP_ORIENTATIONS = enumerateOrientations(4, 1);
const LAST_SLOT_ORIENTATIONS = enumerateOrientations(5, 0);

const toState = (permutation: readonly number[], orientation: readonly number[]): TwoByTwoState =>
  solver.stateFromCubies({ permutation, orientation });

const createLastLayerCases = (
  scrambleTypeId: TwoByTwoTrainingScrambleTypeId,
  bottomPermutations: readonly (readonly number[])[],
  bottomTwist: 0 | 1 | 2,
): readonly TwoByTwoTrainingCase[] => {
  const topOrientations =
    bottomTwist === 0
      ? TOP_ORIENTATIONS
      : bottomTwist === 1
        ? PLUS_TOP_ORIENTATIONS
        : MINUS_TOP_ORIENTATIONS;

  return bottomPermutations.flatMap((bottomPermutation, bottomIndex) =>
    TOP_PERMUTATIONS.flatMap((topPermutation) =>
      topOrientations
        .map((topOrientation) => {
          const permutation = [...topPermutation, ...bottomPermutation];
          const orientation = [...topOrientation, bottomTwist, 0, 0];
          return {
            id: `${scrambleTypeId}.b${bottomIndex}.p${topPermutation.join('')}.o${topOrientation.join('')}`,
            state: toState(permutation, orientation),
          };
        })
        .filter(({ state }) => state.permutation !== 0 || state.orientation !== 0),
    ),
  );
};

const createPblCases = (): readonly TwoByTwoTrainingCase[] =>
  TOP_PERMUTATIONS.flatMap((topPermutation) =>
    enumeratePermutations(SOLVED_BOTTOM)
      .map((bottomPermutation) => {
        const permutation = [...topPermutation, ...bottomPermutation];
        return {
          id: `222.pbl.t${topPermutation.join('')}.b${bottomPermutation.join('')}`,
          state: toState(permutation, [0, 0, 0, 0, 0, 0, 0]),
        };
      })
      .filter(({ state }) => state.permutation !== 0),
  );

const createLastSlotCases = (): readonly TwoByTwoTrainingCase[] =>
  TOP_PERMUTATIONS.flatMap((topPermutation) => {
    const permutation = [...topPermutation, ...SOLVED_BOTTOM];
    [permutation[3], permutation[4]] = [permutation[4] as number, permutation[3] as number];

    return LAST_SLOT_ORIENTATIONS.map((lastSlotOrientation) => ({
      id: `222.ls.p${permutation.join('')}.o${lastSlotOrientation.join('')}`,
      state: toState(permutation, [...lastSlotOrientation, 0, 0]),
    }));
  });

const CASES_BY_TYPE: Readonly<
  Record<Exclude<TwoByTwoTrainingScrambleTypeId, '222.no_bar'>, readonly TwoByTwoTrainingCase[]>
> = {
  '222.cll': createLastLayerCases('222.cll', [SOLVED_BOTTOM], 0),
  '222.eg1': createLastLayerCases('222.eg1', EG1_BOTTOMS, 0),
  '222.eg2': createLastLayerCases('222.eg2', EG2_BOTTOMS, 0),
  '222.pbl': createPblCases(),
  '222.tcll_plus': createLastLayerCases('222.tcll_plus', [SOLVED_BOTTOM], 1),
  '222.tcll_minus': createLastLayerCases('222.tcll_minus', [SOLVED_BOTTOM], 2),
  '222.ls': createLastSlotCases(),
  '222.teg1': createLastLayerCases('222.teg1', EG1_BOTTOMS, 1),
  '222.teg2': createLastLayerCases('222.teg2', EG2_BOTTOMS, 2),
};

export const generateTwoByTwoTrainingScramble = (
  scrambleTypeId: TwoByTwoTrainingScrambleTypeId,
  options: GenerateTypeOptions & { random: RandomSource },
): TrainingScrambleResult => {
  if (scrambleTypeId === '222.no_bar') {
    return {
      scrambleTypeId,
      eventId: '222',
      scramble: generateNoBarScramble(options.random),
    };
  }

  const selectedCase = selectScrambleCase(CASES_BY_TYPE[scrambleTypeId], options, options.random);
  return {
    scrambleTypeId,
    eventId: '222',
    scramble: solver.generateExactly(selectedCase.state, SCRAMBLE_LENGTH),
    caseId: selectedCase.id,
  };
};

export const getTwoByTwoTrainingCaseDefinitions = (
  scrambleTypeId: TwoByTwoTrainingScrambleTypeId,
): readonly ScrambleCaseDefinition[] =>
  scrambleTypeId === '222.no_bar'
    ? []
    : CASES_BY_TYPE[scrambleTypeId].map(({ id, naturalWeight }) =>
        Object.freeze({ id, ...(naturalWeight === undefined ? {} : { naturalWeight }) }),
      );

export const doesTwoByTwoTrainingStateMatch = (
  scrambleTypeId: TwoByTwoTrainingScrambleTypeId,
  scramble: string,
): boolean => {
  const state = solver.stateFromScramble(scramble);
  if (scrambleTypeId === '222.no_bar') return solver.isNoBarState(state);

  const cubies = solver.cubiesFromState(state);
  switch (scrambleTypeId) {
    case '222.cll':
      return hasBottom(cubies, [SOLVED_BOTTOM], 0);
    case '222.eg1':
      return hasBottom(cubies, EG1_BOTTOMS, 0);
    case '222.eg2':
      return hasBottom(cubies, EG2_BOTTOMS, 0);
    case '222.pbl':
      return (
        cubies.orientation.every((orientation) => orientation === 0) &&
        containsExactly(cubies.permutation.slice(0, 4), TOP_PIECES) &&
        containsExactly(cubies.permutation.slice(4), SOLVED_BOTTOM)
      );
    case '222.tcll_plus':
      return hasBottom(cubies, [SOLVED_BOTTOM], 1);
    case '222.tcll_minus':
      return hasBottom(cubies, [SOLVED_BOTTOM], 2);
    case '222.ls':
      return (
        cubies.permutation[3] === 4 &&
        TOP_PIECES.includes(cubies.permutation[4] as (typeof TOP_PIECES)[number]) &&
        cubies.permutation[5] === 5 &&
        cubies.permutation[6] === 6 &&
        cubies.orientation[5] === 0 &&
        cubies.orientation[6] === 0
      );
    case '222.teg1':
      return hasBottom(cubies, EG1_BOTTOMS, 1);
    case '222.teg2':
      return hasBottom(cubies, EG2_BOTTOMS, 2);
  }
};

const generateNoBarScramble = (random: RandomSource): string => {
  for (let attempt = 0; attempt < MAX_NO_BAR_ATTEMPTS; attempt += 1) {
    const state = solver.randomState(random);
    if (!solver.isNoBarState(state)) continue;

    return solver.generateExactly(state, SCRAMBLE_LENGTH);
  }

  throw new Error(`${ERROR_PREFIX}: could not sample a 2x2 no-bar state`);
};

const hasBottom = (
  cubies: TwoByTwoCubieState,
  allowedBottomPermutations: readonly (readonly number[])[],
  bottomTwist: 0 | 1 | 2,
): boolean =>
  allowedBottomPermutations.some((permutation) =>
    permutation.every((piece, index) => cubies.permutation[index + 4] === piece),
  ) &&
  cubies.orientation[4] === bottomTwist &&
  cubies.orientation[5] === 0 &&
  cubies.orientation[6] === 0;

const containsExactly = (actual: readonly number[], expected: readonly number[]): boolean =>
  actual.length === expected.length && expected.every((piece) => actual.includes(piece));
