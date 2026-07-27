import { createSkewbDefinition } from '@cubegin/scramble-puzzle';
import { SkewbSolver, type SkewbCubieState, type SkewbSolverState } from '@cubegin/solver';
import { selectScrambleCase, type ScrambleCaseDefinition } from '../case-selection.js';
import type { TrainingScrambleTypeId } from '../catalog.js';
import type { GenerateTypeOptions, TrainingScrambleResult } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import type {
  ResolvedTrainingOrientation,
  TrainingOrientationColor,
} from '../training-orientation.js';

const ERROR_PREFIX = '@cubegin/scramble-core';
const SCRAMBLE_LENGTH = 11;
const MAX_NO_BAR_ATTEMPTS = 1_000;

export type SkewbTrainingScrambleTypeId = Extract<TrainingScrambleTypeId, `skewb.${string}`>;

interface SkewbTrainingCase extends ScrambleCaseDefinition {
  readonly state: SkewbSolverState;
}

const solver = new SkewbSolver();
const skewb = createSkewbDefinition();

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
    Array.from({ length: 9 }, (_, orientationCoordinate) => {
      const cornerOrientation = orientationCoordinate % 3;
      const fixedCornerOrientation = Math.floor(orientationCoordinate / 3) % 3;
      const cubies: SkewbCubieState = {
        centerPermutation,
        cornerPermutation: [0, 1, 2, 3],
        cornerOrientation: [cornerOrientation, (3 - cornerOrientation) % 3, 0, 0],
        fixedCornerOrientation: [fixedCornerOrientation, (3 - fixedCornerOrientation) % 3, 0, 0],
      };
      return {
        id: `skewb.l2l.c${centerPermutation.join('')}.o${orientationCoordinate}`,
        state: solver.stateFromCubies(cubies),
      };
    }),
);

interface OrientedL2LSpec {
  readonly fixedCenter: number;
  readonly cornerPermutations: readonly (readonly number[])[];
  readonly cornerOrientations: readonly (readonly number[])[];
  readonly fixedCornerOrientations: readonly (readonly number[])[];
}

const IDENTITY_CORNERS = [0, 1, 2, 3] as const;
const L2L_FACE_SPECS: readonly OrientedL2LSpec[] = [
  {
    fixedCenter: 5,
    cornerPermutations: [IDENTITY_CORNERS],
    cornerOrientations: [
      [0, 0, 0, 0],
      [1, 2, 0, 0],
      [2, 1, 0, 0],
    ],
    fixedCornerOrientations: [
      [0, 0, 0, 0],
      [1, 2, 0, 0],
      [2, 1, 0, 0],
    ],
  },
  {
    fixedCenter: 4,
    cornerPermutations: [IDENTITY_CORNERS, [2, 3, 0, 1]],
    cornerOrientations: [
      [0, 0, 0, 0],
      [1, 0, 2, 0],
      [2, 0, 1, 0],
    ],
    fixedCornerOrientations: [[0, 0, 0, 0]],
  },
  {
    fixedCenter: 2,
    cornerPermutations: [IDENTITY_CORNERS, [3, 2, 1, 0]],
    cornerOrientations: [
      [0, 0, 0, 0],
      [0, 1, 2, 0],
      [0, 2, 1, 0],
    ],
    fixedCornerOrientations: [
      [0, 0, 0, 0],
      [1, 0, 0, 2],
      [2, 0, 0, 1],
    ],
  },
  {
    fixedCenter: 0,
    cornerPermutations: [IDENTITY_CORNERS, [1, 0, 3, 2]],
    cornerOrientations: [
      [0, 0, 0, 0],
      [0, 0, 1, 2],
      [0, 0, 2, 1],
    ],
    fixedCornerOrientations: [[0, 0, 0, 0]],
  },
  {
    fixedCenter: 1,
    cornerPermutations: [IDENTITY_CORNERS, [2, 3, 0, 1]],
    cornerOrientations: [
      [0, 0, 0, 0],
      [0, 1, 0, 2],
      [0, 2, 0, 1],
    ],
    fixedCornerOrientations: [
      [0, 0, 0, 0],
      [0, 1, 0, 2],
      [0, 2, 0, 1],
    ],
  },
  {
    fixedCenter: 3,
    cornerPermutations: [IDENTITY_CORNERS, [3, 2, 1, 0]],
    cornerOrientations: [
      [0, 0, 0, 0],
      [1, 0, 0, 2],
      [2, 0, 0, 1],
    ],
    fixedCornerOrientations: [[0, 0, 0, 0]],
  },
];

const SKEWB_FACE_BY_COLOR = {
  white: 0,
  blue: 1,
  red: 2,
  yellow: 3,
  green: 4,
  orange: 5,
} as const satisfies Record<TrainingOrientationColor, number>;

const createOrientedL2LStates = (spec: OrientedL2LSpec): readonly SkewbSolverState[] => {
  const centerPermutations = enumeratePermutations([0, 1, 2, 3, 4, 5]).filter(
    (permutation) =>
      hasEvenParity(permutation) && permutation[spec.fixedCenter] === spec.fixedCenter,
  );

  return centerPermutations.flatMap((centerPermutation) =>
    spec.cornerPermutations.flatMap((cornerPermutation) =>
      spec.cornerOrientations.flatMap((cornerOrientation) =>
        spec.fixedCornerOrientations.map((fixedCornerOrientation) =>
          solver.stateFromCubies({
            centerPermutation,
            cornerPermutation,
            cornerOrientation,
            fixedCornerOrientation,
          }),
        ),
      ),
    ),
  );
};

const ORIENTED_L2L_STATES = L2L_FACE_SPECS.map(createOrientedL2LStates);

export const generateSkewbTrainingScramble = (
  scrambleTypeId: SkewbTrainingScrambleTypeId,
  options: GenerateTypeOptions & {
    random: RandomSource;
    resolvedOrientation?: ResolvedTrainingOrientation;
  },
): TrainingScrambleResult => {
  if (scrambleTypeId === 'skewb.no_bar') {
    return {
      scrambleTypeId,
      eventId: 'skewb',
      scramble: generateNoBarScramble(options.random),
    };
  }

  const selectedCase = selectScrambleCase(L2L_CASES, options, options.random);
  const selectedCaseIndex = L2L_CASES.indexOf(selectedCase);
  const targetState =
    options.resolvedOrientation === undefined
      ? selectedCase.state
      : orientedL2LState(options.resolvedOrientation.bottomColor, selectedCaseIndex);
  return {
    scrambleTypeId,
    eventId: 'skewb',
    scramble: solver.generateExactly(targetState, SCRAMBLE_LENGTH, options.random),
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

  return skewb
    .applyAlgorithm(skewb.createSolvedState(), scramble)
    .image.some((face) => face.every((sticker) => sticker === face[0]));
};

const orientedL2LState = (
  bottomColor: TrainingOrientationColor,
  selectedCaseIndex: number,
): SkewbSolverState => {
  const faceIndex = SKEWB_FACE_BY_COLOR[bottomColor];
  const states = ORIENTED_L2L_STATES[faceIndex];
  const state = states?.[selectedCaseIndex % states.length];
  if (state === undefined) {
    throw new Error(`${ERROR_PREFIX}: could not resolve oriented Skewb L2L state`);
  }
  return state;
};

const generateNoBarScramble = (random: RandomSource): string => {
  for (let attempt = 0; attempt < MAX_NO_BAR_ATTEMPTS; attempt += 1) {
    const state = solver.randomState(random);
    if (!solver.isNoBarState(state)) continue;

    return solver.generateExactly(state, SCRAMBLE_LENGTH, random);
  }

  throw new Error(`${ERROR_PREFIX}: could not sample a Skewb no-bar state`);
};
