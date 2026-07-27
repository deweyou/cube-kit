import {
  createFtoCubieFromState,
  createFtoDefinition,
  createFtoStateFromCubie,
  FtoCubie,
} from '@cubegin/scramble-puzzle';
import { FtoSolver } from '@cubegin/solver';
import { selectScrambleCase, type ScrambleCaseDefinition } from '../case-selection.js';
import type { TrainingScrambleTypeId } from '../catalog.js';
import type { GenerateTypeOptions, TrainingScrambleResult } from '../generator.js';
import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/scramble-core';
const MAX_STATE_ATTEMPTS = 1_000;
const L3T_CENTER_POSITIONS = [0, 1, 2, 3, 7, 11] as const;
const L3T_LBT_CENTER_POSITIONS = [0, 1, 2, 3, 6, 7, 9, 11] as const;
const TCP_CENTER_POSITIONS = [1, 2, 3, 7, 11] as const;

export type FtoTrainingScrambleTypeId = Extract<TrainingScrambleTypeId, `fto.${string}`>;

interface FtoTrainingCase extends ScrambleCaseDefinition {
  readonly cornerPermutation: readonly number[];
  readonly cornerOrientation: readonly number[];
}

const solver = new FtoSolver();
const fto = createFtoDefinition();

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

const cornerOrientations = (count: number): readonly (readonly number[])[] =>
  Array.from({ length: 2 ** (count - 1) }, (_, coordinate) => {
    const orientations = Array.from({ length: count }, () => 0);
    let parity = 0;
    for (let position = 0; position < count - 1; position += 1) {
      orientations[position] = (coordinate >> position) & 1;
      parity ^= orientations[position] as number;
    }
    orientations[count - 1] = parity;
    return orientations;
  });

const createLastTriangleCases = (
  scrambleTypeId: 'fto.l3t' | 'fto.l3t_lbt',
  cornerCount: number,
): readonly FtoTrainingCase[] =>
  enumeratePermutations(Array.from({ length: cornerCount }, (_, index) => index))
    .filter(hasEvenParity)
    .flatMap((cornerPermutation) =>
      cornerOrientations(cornerCount).map((cornerOrientation) => ({
        id: `${scrambleTypeId}.cp${cornerPermutation.join('')}-co${cornerOrientation.join('')}`,
        cornerPermutation,
        cornerOrientation,
      })),
    );

const L3T_CASES = createLastTriangleCases('fto.l3t', 3);
const L3T_LBT_CASES = createLastTriangleCases('fto.l3t_lbt', 4);
const TCP_CASES: readonly FtoTrainingCase[] = enumeratePermutations([0, 1, 2])
  .filter(hasEvenParity)
  .flatMap((cornerPermutation) =>
    [0, 1].map((orientation) => ({
      id: `fto.tcp.cp${cornerPermutation.join('')}-co0${orientation}${orientation}`,
      cornerPermutation,
      cornerOrientation: [0, orientation, orientation],
    })),
  );

const CASES_BY_TYPE = {
  'fto.l3t': L3T_CASES,
  'fto.l3t_lbt': L3T_LBT_CASES,
  'fto.tcp': TCP_CASES,
} satisfies Readonly<Record<'fto.l3t' | 'fto.l3t_lbt' | 'fto.tcp', readonly FtoTrainingCase[]>>;

export const generateFtoTrainingScramble = (
  scrambleTypeId: FtoTrainingScrambleTypeId,
  options: GenerateTypeOptions & { random: RandomSource },
): TrainingScrambleResult => {
  const target =
    scrambleTypeId === 'fto.edges_only'
      ? createEdgesOnlyState(options.random)
      : scrambleTypeId === 'fto.centers_only'
        ? createCentersOnlyState(options.random)
        : scrambleTypeId === 'fto.corners_only'
          ? createCornersOnlyState(options.random)
          : undefined;
  if (target !== undefined) {
    return {
      scrambleTypeId,
      eventId: 'fto',
      scramble: solver.scramble(createFtoStateFromCubie(target)),
    };
  }

  const caseType = scrambleTypeId as 'fto.l3t' | 'fto.l3t_lbt' | 'fto.tcp';
  const selectedCase = selectScrambleCase(CASES_BY_TYPE[caseType], options, options.random);
  const cubie =
    caseType === 'fto.tcp'
      ? createTcpState(selectedCase, options.random)
      : createLastTriangleState(
          selectedCase,
          caseType === 'fto.l3t' ? L3T_CENTER_POSITIONS : L3T_LBT_CENTER_POSITIONS,
          options.random,
        );
  return {
    scrambleTypeId,
    eventId: 'fto',
    scramble: solver.scramble(createFtoStateFromCubie(cubie)),
    caseId: selectedCase.id,
  };
};

export const getFtoTrainingCaseDefinitions = (
  scrambleTypeId: FtoTrainingScrambleTypeId,
): readonly ScrambleCaseDefinition[] => {
  if (!(scrambleTypeId in CASES_BY_TYPE)) return [];
  return CASES_BY_TYPE[scrambleTypeId as keyof typeof CASES_BY_TYPE].map(({ id }) =>
    Object.freeze({ id }),
  );
};

export const doesFtoTrainingStateMatch = (
  scrambleTypeId: FtoTrainingScrambleTypeId,
  scramble: string,
): boolean => {
  const state = createFtoCubieFromState(fto.applyAlgorithm(fto.createSolvedState(), scramble));
  switch (scrambleTypeId) {
    case 'fto.edges_only':
      return isCornerFamilySolved(state) && isCenterFamilySolved(state) && !isIdentity(state.ep);
    case 'fto.centers_only':
      return isCornerFamilySolved(state) && isIdentity(state.ep) && !isCenterFamilySolved(state);
    case 'fto.corners_only':
      return isIdentity(state.ep) && isCenterFamilySolved(state) && !isCornerFamilySolved(state);
    case 'fto.l3t':
      return isLastTriangleState(state, 3, L3T_CENTER_POSITIONS);
    case 'fto.l3t_lbt':
      return isLastTriangleState(state, 4, L3T_LBT_CENTER_POSITIONS);
    case 'fto.tcp':
      return isTcpState(state);
  }
};

const createLastTriangleState = (
  selectedCase: FtoTrainingCase,
  centerPositions: readonly number[],
  random: RandomSource,
): FtoCubie => {
  const cubie = new FtoCubie();
  selectedCase.cornerPermutation.forEach((piece, position) => {
    cubie.cp[position] = piece;
    cubie.co[position] = selectedCase.cornerOrientation[position] as number;
  });
  for (let attempt = 0; attempt < MAX_STATE_ATTEMPTS; attempt += 1) {
    const centerPermutation = randomEvenPermutation(centerPositions.length, random);
    cubie.uf = identityPermutation(12);
    centerPositions.forEach((position, index) => {
      cubie.uf[position] = centerPositions[centerPermutation[index] as number] as number;
    });
    if (!isFixedSolved(cubie)) return cubie;
  }
  throw new Error(`${ERROR_PREFIX}: could not sample a non-solved FTO last-triangle state`);
};

const createTcpState = (selectedCase: FtoTrainingCase, random: RandomSource): FtoCubie => {
  const cubie = new FtoCubie();
  selectedCase.cornerPermutation.forEach((piece, position) => {
    cubie.cp[position] = piece;
    cubie.co[position] = selectedCase.cornerOrientation[position] as number;
  });
  for (let attempt = 0; attempt < MAX_STATE_ATTEMPTS; attempt += 1) {
    const centerPermutation = randomEvenPermutation(TCP_CENTER_POSITIONS.length, random);
    if (
      (TCP_CENTER_POSITIONS[centerPermutation[0] as number] as number) < 3 ||
      (TCP_CENTER_POSITIONS[centerPermutation[1] as number] as number) < 3
    ) {
      continue;
    }
    TCP_CENTER_POSITIONS.forEach((position, index) => {
      cubie.uf[position] = TCP_CENTER_POSITIONS[centerPermutation[index] as number] as number;
    });
    return cubie;
  }
  throw new Error(`${ERROR_PREFIX}: could not sample an FTO TCP state`);
};

const createEdgesOnlyState = (random: RandomSource): FtoCubie => {
  const cubie = new FtoCubie();
  cubie.ep = randomNonIdentityEvenPermutation(12, random);
  return cubie;
};

const createCentersOnlyState = (random: RandomSource): FtoCubie => {
  for (let attempt = 0; attempt < MAX_STATE_ATTEMPTS; attempt += 1) {
    const cubie = new FtoCubie();
    cubie.uf = randomEvenPermutation(12, random);
    cubie.rl = randomEvenPermutation(12, random);
    if (!isCenterFamilySolved(cubie)) return cubie;
  }
  throw new Error(`${ERROR_PREFIX}: could not sample a non-solved FTO center state`);
};

const createCornersOnlyState = (random: RandomSource): FtoCubie => {
  for (let attempt = 0; attempt < MAX_STATE_ATTEMPTS; attempt += 1) {
    const cubie = new FtoCubie();
    cubie.cp = randomEvenPermutation(6, random);
    cubie.co = randomCornerOrientation(6, random);
    if (!isCornerFamilySolved(cubie)) return cubie;
  }
  throw new Error(`${ERROR_PREFIX}: could not sample a non-solved FTO corner state`);
};

const randomNonIdentityEvenPermutation = (length: number, random: RandomSource): number[] => {
  for (let attempt = 0; attempt < MAX_STATE_ATTEMPTS; attempt += 1) {
    const permutation = randomEvenPermutation(length, random);
    if (!isIdentity(permutation)) return permutation;
  }
  throw new Error(`${ERROR_PREFIX}: could not sample a non-identity even permutation`);
};

const randomEvenPermutation = (length: number, random: RandomSource): number[] => {
  const permutation = identityPermutation(length);
  for (let index = length - 1; index > 0; index -= 1) {
    const selected = drawRandomInt(random, index + 1);
    [permutation[index], permutation[selected]] = [permutation[selected], permutation[index]];
  }
  if (!hasEvenParity(permutation)) {
    [permutation[length - 2], permutation[length - 1]] = [
      permutation[length - 1],
      permutation[length - 2],
    ];
  }
  return permutation;
};

const randomCornerOrientation = (length: number, random: RandomSource): number[] => {
  const orientation = Array.from({ length }, () => 0);
  let parity = 0;
  for (let position = 0; position < length - 1; position += 1) {
    orientation[position] = drawRandomInt(random, 2);
    parity ^= orientation[position] as number;
  }
  orientation[length - 1] = parity;
  return orientation;
};

const isLastTriangleState = (
  state: FtoCubie,
  cornerCount: number,
  centerPositions: readonly number[],
): boolean =>
  isIdentity(state.ep) &&
  isColorSolved(state.rl) &&
  state.cp.slice(cornerCount).every((piece, index) => piece === index + cornerCount) &&
  state.co.slice(cornerCount).every((orientation) => orientation === 0) &&
  state.uf.every(
    (piece, position) =>
      centerPositions.includes(position) || Math.trunc(piece / 3) === Math.trunc(position / 3),
  ) &&
  !isFixedSolved(state);

const isTcpState = (state: FtoCubie): boolean =>
  isIdentity(state.ep) &&
  isColorSolved(state.rl) &&
  state.cp.slice(3).every((piece, index) => piece === index + 3) &&
  state.co[0] === 0 &&
  state.co.slice(3).every((orientation) => orientation === 0) &&
  state.uf.every(
    (piece, position) =>
      (TCP_CENTER_POSITIONS as readonly number[]).includes(position) ||
      Math.trunc(piece / 3) === Math.trunc(position / 3),
  ) &&
  !isFixedSolved(state);

const isCornerFamilySolved = (state: FtoCubie): boolean =>
  isIdentity(state.cp) && state.co.every((orientation) => orientation === 0);

const isCenterFamilySolved = (state: FtoCubie): boolean =>
  isColorSolved(state.uf) && isColorSolved(state.rl);

const isColorSolved = (permutation: readonly number[]): boolean =>
  permutation.every((piece, position) => Math.trunc(piece / 3) === Math.trunc(position / 3));

const isFixedSolved = (state: FtoCubie): boolean =>
  isIdentity(state.cp) &&
  state.co.every((orientation) => orientation === 0) &&
  isIdentity(state.ep) &&
  isColorSolved(state.uf) &&
  isColorSolved(state.rl);

const isIdentity = (permutation: readonly number[]): boolean =>
  permutation.every((piece, position) => piece === position);

const identityPermutation = (length: number): number[] =>
  Array.from({ length }, (_, index) => index);

const drawRandomInt = (random: RandomSource, maxExclusive: number): number => {
  const value = random.nextInt(maxExclusive);
  if (!Number.isSafeInteger(value) || value < 0 || value >= maxExclusive) {
    throw new RangeError(
      `${ERROR_PREFIX}: FTO random source returned ${value} for max ${maxExclusive}`,
    );
  }
  return value;
};
