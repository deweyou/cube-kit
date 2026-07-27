import { createSquareOneDefinition, type SquareOneState } from '@cubegin/scramble-puzzle';
import { SQUARE_ONE_INVERSE_SOLUTION, SquareOneFullCube, SquareOneSearch } from '@cubegin/solver';
import { selectScrambleCase, type ScrambleCaseDefinition } from '../case-selection.js';
import type { TrainingScrambleTypeId } from '../catalog.js';
import type { GenerateTypeOptions, TrainingScrambleResult } from '../generator.js';
import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/scramble-core';
const SHAPE_COUNT = 3_678;
const CUBE_SHAPE_INDEX = 1_037;
const MAX_CUBE_SHAPE_ATTEMPTS = 100;

export type SquareOneTrainingScrambleTypeId = Extract<TrainingScrambleTypeId, `sq1.${string}`>;

interface SquareOneCspCase extends ScrambleCaseDefinition {
  readonly shapeIndex: number;
}

interface SquareOnePblCase extends ScrambleCaseDefinition {
  readonly edgePermutation: number;
  readonly cornerPermutation: number;
}

export interface SquareOneTrainingStateSnapshot {
  readonly shapeIndex: number;
  readonly shapeCoordinate: number;
  readonly parity: number;
  readonly middleLayer: 0 | 1;
  readonly pieces: readonly number[];
}

const squareOne = createSquareOneDefinition();
const solvedState = squareOne.createSolvedState();
const solvedPieces = new SquareOneFullCube().pieces();

const CSP_SHAPES = [
  0, 1, 3, 18, 19, 1004, 1005, 1006, 1007, 1008, 1009, 1011, 1015, 1016, 1018, 1154, 1155, 1156,
  1157, 1158, 1159, 1161, 1166, 1168, 424, 425, 426, 427, 428, 429, 431, 436, 95, 218, 341, 482,
  528, 632, 1050, 342, 343, 345, 346, 348, 353, 223, 487, 533, 535, 1055, 219, 225, 483, 489, 639,
  1051, 1057, 486, 1054, 1062, 6, 21, 34, 46, 59, 71, 144, 157, 182, 305, 7, 22, 35, 47, 60, 72,
  145, 158, 183, 306, 8, 23, 36, 48, 61, 73, 146, 159, 184, 307,
] as const;

const CSP_WEIGHTS = [
  16, 16, 16, 10, 16, 24, 16, 24, 16, 24, 16, 16, 4, 24, 16, 48, 32, 48, 32, 48, 32, 32, 48, 16, 48,
  32, 48, 16, 48, 32, 32, 48, 36, 48, 72, 72, 48, 48, 72, 48, 36, 72, 48, 48, 72, 32, 48, 16, 32,
  48, 16, 32, 48, 48, 16, 48, 48, 36, 72, 36, 72, 96, 96, 72, 96, 72, 72, 72, 72, 24, 48, 64, 64,
  48, 64, 48, 48, 48, 48, 16, 24, 32, 32, 24, 32, 24, 24, 24, 24, 8,
] as const;

const CSP_CASES: readonly SquareOneCspCase[] = CSP_SHAPES.map((shapeIndex, index) => ({
  id: `sq1.csp.shape-${shapeIndex}`,
  naturalWeight: CSP_WEIGHTS[index],
  shapeIndex,
}));

const PBL_CASE_DATA = [
  ['h', 0x1032, 0x3210, 1],
  ['ua', 0x3102, 0x3210, 4],
  ['ub', 0x3021, 0x3210, 4],
  ['z', 0x2301, 0x3210, 2],
  ['aa', 0x3210, 0x3021, 4],
  ['ab', 0x3210, 0x3102, 4],
  ['e', 0x3210, 0x2301, 2],
  ['f', 0x3012, 0x3201, 4],
  ['ga', 0x1320, 0x3102, 4],
  ['gb', 0x2130, 0x3021, 4],
  ['gc', 0x3021, 0x3102, 4],
  ['gd', 0x3102, 0x3021, 4],
  ['ja', 0x3201, 0x3201, 4],
  ['jb', 0x3120, 0x3201, 4],
  ['na', 0x1230, 0x3012, 1],
  ['nb', 0x3012, 0x3012, 1],
  ['ra', 0x0213, 0x3201, 4],
  ['rb', 0x2310, 0x3201, 4],
  ['t', 0x1230, 0x3201, 4],
  ['v', 0x3120, 0x3012, 4],
  ['y', 0x3201, 0x3012, 4],
] as const;

const PBL_CASES: readonly SquareOnePblCase[] = PBL_CASE_DATA.map(
  ([name, edgePermutation, cornerPermutation, naturalWeight]) => ({
    id: `sq1.pbl.${name}`,
    naturalWeight,
    edgePermutation,
    cornerPermutation,
  }),
);

export const generateSquareOneTrainingScramble = (
  scrambleTypeId: SquareOneTrainingScrambleTypeId,
  options: GenerateTypeOptions & { random: RandomSource },
): TrainingScrambleResult => {
  if (scrambleTypeId === 'sq1.cube_shape') {
    return {
      scrambleTypeId,
      eventId: 'sq1',
      scramble: solveTrainingState(createCubeShapeState(options.random)),
    };
  }

  if (scrambleTypeId === 'sq1.csp') {
    const selectedCase = selectScrambleCase(CSP_CASES, options, options.random);
    const state = SquareOneFullCube.fromCoordinates({
      shapeIndex: selectedCase.shapeIndex,
      cornerPermutation: randomPermutation(options.random),
      edgePermutation: randomPermutation(options.random),
      middleLayer: drawRandomBit(options.random),
    });
    return {
      scrambleTypeId,
      eventId: 'sq1',
      scramble: solveTrainingState(state),
      caseId: selectedCase.id,
    };
  }

  const selectedCase = selectScrambleCase(PBL_CASES, options, options.random);
  return {
    scrambleTypeId,
    eventId: 'sq1',
    scramble: solveTrainingState(createPblState(selectedCase, options.random)),
    caseId: selectedCase.id,
  };
};

export const getSquareOneTrainingCaseDefinitions = (
  scrambleTypeId: SquareOneTrainingScrambleTypeId,
): readonly ScrambleCaseDefinition[] => {
  const cases =
    scrambleTypeId === 'sq1.csp' ? CSP_CASES : scrambleTypeId === 'sq1.pbl' ? PBL_CASES : [];
  return cases.map(({ id, naturalWeight }) => Object.freeze({ id, naturalWeight }));
};

export const getSquareOneTrainingStateSnapshot = (
  scramble: string,
): SquareOneTrainingStateSnapshot => {
  const state = squareOne.applyAlgorithm(solvedState, scramble) as SquareOneState;
  const cube = SquareOneFullCube.fromSquareOneState(state);
  return {
    shapeIndex: cube.getShapeIndex(),
    shapeCoordinate: cube.getShapeIdx(),
    parity: cube.getParity(),
    middleLayer: cube.ml as 0 | 1,
    pieces: cube.pieces(),
  };
};

export const doesSquareOneTrainingStateMatch = (
  scrambleTypeId: SquareOneTrainingScrambleTypeId,
  scramble: string,
): boolean => {
  const state = getSquareOneTrainingStateSnapshot(scramble);
  switch (scrambleTypeId) {
    case 'sq1.cube_shape':
      return state.shapeIndex !== CUBE_SHAPE_INDEX;
    case 'sq1.csp':
      return CSP_SHAPES.includes(state.shapeIndex as (typeof CSP_SHAPES)[number]);
    case 'sq1.pbl':
      return (
        state.shapeIndex === CUBE_SHAPE_INDEX &&
        state.pieces.slice(12).every((piece, index) => piece === solvedPieces[index + 12])
      );
  }
};

const createCubeShapeState = (random: RandomSource): SquareOneFullCube => {
  for (let attempt = 0; attempt < MAX_CUBE_SHAPE_ATTEMPTS; attempt += 1) {
    const shapeIndex = drawRandomInt(random, SHAPE_COUNT);
    if (shapeIndex === CUBE_SHAPE_INDEX) continue;

    return SquareOneFullCube.fromCoordinates({
      shapeIndex,
      cornerPermutation: randomPermutation(random),
      edgePermutation: randomPermutation(random),
      middleLayer: drawRandomBit(random),
    });
  }
  throw new Error(`${ERROR_PREFIX}: could not sample a non-cube Square-1 shape`);
};

const createPblState = (
  selectedCase: SquareOnePblCase,
  random: RandomSource,
): SquareOneFullCube => {
  const cube = new SquareOneFullCube();
  const edgePermutation = (0x4444 - selectedCase.edgePermutation) & 0x3333;
  const cornerPermutation = (0x3333 - selectedCase.cornerPermutation) & 0x3333;

  for (let index = 0; index < 4; index += 1) {
    const shift = 12 - index * 4;
    const corner = ((cornerPermutation >> shift) & 0xf) * 2 + 1;
    cube.setPiece(index * 3 + 1, corner);
    cube.setPiece(index * 3 + 2, corner);
    cube.setPiece((index * 3 + 3) % 12, ((edgePermutation >> shift) & 0xf) * 2);
  }
  cube.ml = drawRandomInt(random, 2);
  return cube;
};

const solveTrainingState = (state: SquareOneFullCube): string => {
  const solution = new SquareOneSearch().solution(state, SQUARE_ONE_INVERSE_SOLUTION);
  if (solution === null) {
    throw new Error(`${ERROR_PREFIX}: Square-1 training state has no two-phase solution`);
  }
  return solution.trim();
};

const randomPermutation = (random: RandomSource): readonly number[] => {
  const permutation = Array.from({ length: 8 }, (_, index) => index);
  for (let index = 0; index < permutation.length - 1; index += 1) {
    const target = index + drawRandomInt(random, permutation.length - index);
    [permutation[index], permutation[target]] = [permutation[target] as number, permutation[index]];
  }
  return permutation;
};

const drawRandomBit = (random: RandomSource): 0 | 1 => drawRandomInt(random, 2) as 0 | 1;

const drawRandomInt = (random: RandomSource, maxExclusive: number): number => {
  const value = random.nextInt(maxExclusive);
  if (!Number.isSafeInteger(value) || value < 0 || value >= maxExclusive) {
    throw new RangeError(
      `${ERROR_PREFIX}: Square-1 random source returned ${value} for max ${maxExclusive}`,
    );
  }
  return value;
};
