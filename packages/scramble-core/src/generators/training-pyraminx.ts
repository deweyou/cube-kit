import { PyraminxSolver, type PyraminxSolverState } from '@cubegin/solver';
import { selectScrambleCase, type ScrambleCaseDefinition } from '../case-selection.js';
import type { TrainingScrambleTypeId } from '../catalog.js';
import type { GenerateTypeOptions, TrainingScrambleResult } from '../generator.js';
import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/scramble-core';
const BODY_SCRAMBLE_LENGTH = 11;
const MAX_NO_BAR_ATTEMPTS = 1_000;

export type PyraminxTrainingScrambleTypeId = Extract<TrainingScrambleTypeId, `pyram.${string}`>;

interface PyraminxTrainingCase extends ScrambleCaseDefinition {
  readonly state: PyraminxSolverState;
}

const solver = new PyraminxSolver();

const L4E_CASE_DATA = [
  [1, 3, 'l3bar-1'],
  [59, 3, 'l3bar-2'],
  [25, 3, 'l3bar-3'],
  [35, 3, 'l3bar-4'],
  [12, 3, 'll-1'],
  [10, 3, 'll-2'],
  [2, 1, 'll-3'],
  [4, 1, 'll-4'],
  [3, 3, 'l4nb-1'],
  [57, 3, 'l4nb-2'],
  [53, 3, 'l4nb-3'],
  [45, 3, 'l4nb-4'],
  [33, 3, 'l4nb-5'],
  [27, 3, 'l4nb-6'],
  [49, 3, 'l3nb-1'],
  [43, 3, 'l3nb-2'],
  [41, 3, 'l3nb-3'],
  [51, 3, 'l3nb-4'],
  [8, 3, 'flip-1'],
  [16, 3, 'flip-2'],
  [56, 1, 'flip-3'],
  [21, 3, 'l4blk-1'],
  [13, 3, 'l4blk-2'],
  [29, 3, 'l4bar-1'],
  [37, 3, 'l4bar-2'],
  [61, 3, 'l4bar-3'],
  [5, 3, 'l4bar-4'],
  [17, 3, 'l4bar-5'],
  [11, 3, 'l4bar-6'],
  [9, 3, 'l4bar-7'],
  [19, 3, 'l4bar-8'],
  [20, 3, 'dflip-1'],
  [18, 3, 'dflip-2'],
  [60, 1, 'dflip-3'],
  [58, 1, 'dflip-4'],
] as const;

const enumeratePermutations = (values: readonly number[]): readonly (readonly number[])[] => {
  if (values.length <= 1) return [values];

  return values.flatMap((value, index) =>
    enumeratePermutations(values.filter((_, candidateIndex) => candidateIndex !== index)).map(
      (suffix) => [value, ...suffix],
    ),
  );
};

const hasEvenParity = (permutation: readonly number[]): boolean => {
  let inversions = 0;
  for (let left = 0; left < permutation.length; left += 1) {
    for (let right = left + 1; right < permutation.length; right += 1) {
      if ((permutation[left] as number) > (permutation[right] as number)) inversions += 1;
    }
  }
  return inversions % 2 === 0;
};

const EVEN_FOUR_PERMUTATIONS = enumeratePermutations([0, 1, 2, 3]).filter(hasEvenParity);

const L4E_CASES: readonly PyraminxTrainingCase[] = L4E_CASE_DATA.map(
  ([coordinate, naturalWeight, name]) => {
    const edgePermutation = [
      ...(EVEN_FOUR_PERMUTATIONS[coordinate & 1] as readonly number[]),
      4,
      5,
    ];
    const base = solver.stateFromCubies({
      edgePermutation,
      edgeOrientation: [0, 0, 0, 0, 0, 0],
      cornerOrientation: [0, 0, 0, 0],
      tipOrientation: [0, 0, 0, 0],
    });

    return {
      id: `pyram.l4e.${name}`,
      naturalWeight,
      state: {
        ...base,
        edgeOrient: coordinate >> 3,
        cornerOrient: ((coordinate >> 1) & 0x3) * 27,
      },
    };
  },
);

export const generatePyraminxTrainingScramble = (
  scrambleTypeId: PyraminxTrainingScrambleTypeId,
  options: GenerateTypeOptions & { random: RandomSource },
): TrainingScrambleResult => {
  if (scrambleTypeId === 'pyram.four_tips') {
    const state = {
      edgePerm: 0,
      edgeOrient: 0,
      cornerOrient: 0,
      tips: options.random.nextInt(80) + 1,
    };
    return {
      scrambleTypeId,
      eventId: 'pyram',
      scramble: solver.generateExactly(state, 0, false, options.random),
    };
  }

  if (scrambleTypeId === 'pyram.no_bar') {
    return {
      scrambleTypeId,
      eventId: 'pyram',
      scramble: generateNoBarScramble(options.random),
    };
  }

  const selectedCase = selectScrambleCase(L4E_CASES, options, options.random);
  const state = {
    ...selectedCase.state,
    tips: options.random.nextInt(81),
  };
  return {
    scrambleTypeId,
    eventId: 'pyram',
    scramble: solver.generateExactly(state, BODY_SCRAMBLE_LENGTH, false, options.random),
    caseId: selectedCase.id,
  };
};

export const getPyraminxTrainingCaseDefinitions = (
  scrambleTypeId: PyraminxTrainingScrambleTypeId,
): readonly ScrambleCaseDefinition[] =>
  scrambleTypeId === 'pyram.l4e'
    ? L4E_CASES.map(({ id, naturalWeight }) => Object.freeze({ id, naturalWeight }))
    : [];

export const doesPyraminxTrainingStateMatch = (
  scrambleTypeId: PyraminxTrainingScrambleTypeId,
  scramble: string,
): boolean => {
  const state = solver.stateFromScramble(scramble);
  switch (scrambleTypeId) {
    case 'pyram.l4e':
      return L4E_CASES.some(
        ({ state: candidate }) =>
          state.edgePerm === candidate.edgePerm &&
          state.edgeOrient === candidate.edgeOrient &&
          state.cornerOrient === candidate.cornerOrient,
      );
    case 'pyram.four_tips':
      return (
        state.edgePerm === 0 &&
        state.edgeOrient === 0 &&
        state.cornerOrient === 0 &&
        state.tips !== 0
      );
    case 'pyram.no_bar':
      return solver.isNoBarState(state);
  }
};

const generateNoBarScramble = (random: RandomSource): string => {
  for (let attempt = 0; attempt < MAX_NO_BAR_ATTEMPTS; attempt += 1) {
    const state = solver.randomState(random);
    if (!solver.isNoBarState(state)) continue;

    return solver.generateExactly(state, BODY_SCRAMBLE_LENGTH, false, random);
  }

  throw new Error(`${ERROR_PREFIX}: could not sample a Pyraminx no-bar state`);
};
