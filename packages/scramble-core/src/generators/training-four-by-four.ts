import { createCubeDefinition, splitAlgorithm, type CubeState } from '@cubegin/scramble-puzzle';
import {
  createSolvedFourByFourState,
  getFourByFourStateFromScramble,
  scrambleFourByFourState,
  SubgroupSolver,
  type FourByFourState,
  type SubgroupGenerator,
} from '@cubegin/solver';
import { selectScrambleCase, type ScrambleCaseDefinition } from '../case-selection.js';
import type { TrainingScrambleTypeId } from '../catalog.js';
import type { GenerateTypeOptions, TrainingScrambleResult } from '../generator.js';
import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/scramble-core';
const MAX_PARTIAL_STATE_ATTEMPTS = 100;

export type FourByFourTrainingScrambleTypeId = Extract<TrainingScrambleTypeId, `444.${string}`>;

interface PartialStateMasks {
  readonly centers: number;
  readonly edges: number;
  readonly corners: number;
}

interface FourByFourTrainingCase extends ScrambleCaseDefinition {
  readonly state: FourByFourState;
}

const solved = createSolvedFourByFourState();

const PARTIAL_MASKS: Readonly<
  Record<
    Exclude<
      FourByFourTrainingScrambleTypeId,
      '444.edge_pairing' | '444.subset.rruu' | '444.poll' | '444.ppll'
    >,
    PartialStateMasks | ((random: RandomSource) => PartialStateMasks)
  >
> = {
  '444.ll': { centers: 0, edges: 0x0f00f0, corners: 0xf0 },
  '444.ell': { centers: 0, edges: 0x0f00f0, corners: 0 },
  '444.edges_only': { centers: 0, edges: 0xffffff, corners: 0 },
  '444.centers_only': { centers: 0xffffff, edges: 0, corners: 0 },
  '444.yau.ud_centers': { centers: 0xffff00, edges: 0xffffff, corners: 0xff },
  '444.yau.ud_3_edges': (random) => {
    const unsolvedSlot = drawRandomInt(random, 4);
    return {
      centers: 0xffff00,
      edges: 0xff0ff0 | (0x1001 << unsolvedSlot),
      corners: 0xff,
    };
  },
  '444.yau.last_8_dedges': { centers: 0, edges: 0xf0ff0f, corners: 0xff },
  '444.hoya.rl_centers': { centers: 0x00ffff, edges: 0xffffff, corners: 0xff },
  '444.hoya.rldx_centers': (random) => {
    const unsolvedFaceOffset = drawRandomInt(random, 2) * 4;
    return {
      centers: 0x0000f0 | (0xf00 << unsolvedFaceOffset),
      edges: 0xffffff,
      corners: 0xff,
    };
  },
  '444.hoya.rldx_cross': (random) => {
    const unsolvedFaceOffset = drawRandomInt(random, 2) * 4;
    return {
      centers: 0x0000f0 | (0xf00 << unsolvedFaceOffset),
      edges: 0xff0ff0,
      corners: 0xff,
    };
  },
};

const createLastLayerState = (
  edgePermutation: readonly number[],
  edgeOrientation: readonly number[],
  cornerPermutation: readonly number[],
  cornerOrientation: readonly number[],
): FourByFourState => {
  const edges = [...solved.edgePermutation];
  const corners = [...solved.cornerPermutation];
  const orientations = [...solved.cornerOrientation];
  for (let index = 0; index < 4; index += 1) {
    const source = edgePermutation[index] as number;
    edges[index] = source + (edgeOrientation[index] === 1 ? 12 : 0);
    edges[index + 12] = source + (edgeOrientation[index] === 1 ? 0 : 12);
    corners[index] = cornerPermutation[index] as number;
    orientations[index] = cornerOrientation[index] as number;
  }
  return {
    edgePermutation: edges,
    centerColors: [...solved.centerColors],
    cornerPermutation: corners,
    cornerOrientation: orientations,
  };
};

const PPLL_CASE_DATA = [
  [[2, 1, 0, 3], [0, 1, 2, 3], 2, 'epll-opp'],
  [[0, 1, 3, 2], [0, 1, 2, 3], 4, 'epll-adj'],
  [[3, 0, 1, 2], [0, 1, 2, 3], 1, 'epll-o-minus'],
  [[1, 2, 3, 0], [0, 1, 2, 3], 1, 'epll-o-plus'],
  [[2, 3, 1, 0], [0, 1, 2, 3], 4, 'epll-w'],
  [[0, 1, 2, 3], [2, 1, 0, 3], 2, 'cpll-pn'],
  [[0, 1, 2, 3], [3, 1, 2, 0], 4, 'cpll-pj'],
  [[2, 3, 0, 1], [3, 1, 2, 0], 4, 'cpll-m'],
  [[1, 2, 0, 3], [2, 1, 0, 3], 4, 'diag-sa'],
  [[3, 1, 0, 2], [0, 3, 2, 1], 4, 'diag-sb'],
  [[0, 3, 2, 1], [3, 2, 1, 0], 1, 'diag-q'],
  [[2, 1, 0, 3], [3, 2, 1, 0], 1, 'diag-x'],
  [[1, 0, 3, 2], [0, 2, 1, 3], 4, 'adj-ka'],
  [[3, 2, 1, 0], [0, 2, 1, 3], 4, 'adj-kb'],
  [[3, 1, 0, 2], [3, 1, 2, 0], 4, 'adj-pa'],
  [[2, 1, 3, 0], [3, 1, 2, 0], 4, 'adj-pb'],
  [[0, 1, 3, 2], [0, 2, 3, 1], 4, 'adj-ba'],
  [[0, 2, 1, 3], [3, 1, 0, 2], 4, 'adj-bb'],
  [[0, 3, 1, 2], [1, 0, 2, 3], 4, 'adj-ca'],
  [[0, 2, 3, 1], [1, 0, 2, 3], 4, 'adj-cb'],
  [[2, 0, 1, 3], [0, 1, 3, 2], 4, 'adj-da'],
  [[2, 1, 3, 0], [0, 1, 3, 2], 4, 'adj-db'],
  [[2, 3, 0, 1], [0, 1, 2, 3], 1, 'pll-h'],
  [[3, 0, 2, 1], [0, 1, 2, 3], 4, 'pll-ua'],
  [[1, 3, 2, 0], [0, 1, 2, 3], 4, 'pll-ub'],
  [[3, 2, 1, 0], [0, 1, 2, 3], 2, 'pll-z'],
  [[0, 1, 2, 3], [1, 2, 0, 3], 4, 'pll-aa'],
  [[0, 1, 2, 3], [2, 0, 1, 3], 4, 'pll-ab'],
  [[0, 1, 2, 3], [1, 0, 3, 2], 2, 'pll-e'],
  [[0, 3, 2, 1], [1, 0, 2, 3], 4, 'pll-f'],
  [[2, 0, 1, 3], [1, 2, 0, 3], 4, 'pll-ga'],
  [[1, 2, 0, 3], [2, 0, 1, 3], 4, 'pll-gb'],
  [[1, 3, 2, 0], [2, 0, 1, 3], 4, 'pll-gc'],
  [[3, 0, 2, 1], [1, 2, 0, 3], 4, 'pll-gd'],
  [[3, 1, 2, 0], [1, 0, 2, 3], 4, 'pll-ja'],
  [[1, 0, 2, 3], [1, 0, 2, 3], 4, 'pll-jb'],
  [[2, 1, 0, 3], [2, 1, 0, 3], 1, 'pll-na'],
  [[0, 3, 2, 1], [2, 1, 0, 3], 1, 'pll-nb'],
  [[0, 1, 3, 2], [1, 0, 2, 3], 4, 'pll-ra'],
  [[0, 2, 1, 3], [1, 0, 2, 3], 4, 'pll-rb'],
  [[2, 1, 0, 3], [1, 0, 2, 3], 4, 'pll-t'],
  [[1, 0, 2, 3], [2, 1, 0, 3], 4, 'pll-v'],
  [[3, 1, 2, 0], [2, 1, 0, 3], 4, 'pll-y'],
] as const;

const PPLL_CASES: readonly FourByFourTrainingCase[] = PPLL_CASE_DATA.map(
  ([edgePermutation, cornerPermutation, naturalWeight, name]) => ({
    id: `444.ppll.${name}`,
    naturalWeight,
    state: createLastLayerState(edgePermutation, [0, 0, 0, 0], cornerPermutation, [0, 0, 0, 0]),
  }),
);

const POLL_CORNER_PATTERNS = [
  ['s', [2, 0, 2, 2]],
  ['a', [0, 1, 1, 1]],
  ['t', [0, 0, 1, 2]],
  ['l', [0, 1, 0, 2]],
  ['u', [0, 0, 2, 1]],
  ['pi', [2, 2, 1, 1]],
  ['h', [2, 1, 2, 1]],
  ['o', [0, 0, 0, 0]],
] as const;

const POLL_CASES: readonly FourByFourTrainingCase[] = [3, 1].flatMap((orientedEdges) =>
  POLL_CORNER_PATTERNS.flatMap(([name, cornerOrientation]) => {
    const uniqueSlots = name === 'o' ? [0] : name === 'h' ? [0, 3] : [0, 1, 2, 3];
    return uniqueSlots.map((slot) => {
      const edgeOrientation = Array.from({ length: 4 }, (_, index) =>
        orientedEdges === 3 ? (index === slot ? 1 : 0) : index === slot ? 0 : 1,
      );
      return {
        id: `444.poll.${orientedEdges}e-${name}-${slot}`,
        naturalWeight: 4,
        state: createLastLayerState([0, 1, 2, 3], edgeOrientation, [0, 1, 2, 3], cornerOrientation),
      };
    });
  }),
);

let rruuSolver: SubgroupSolver<CubeState> | undefined;

export const generateFourByFourTrainingScramble = (
  scrambleTypeId: FourByFourTrainingScrambleTypeId,
  options: GenerateTypeOptions & { random: RandomSource },
): TrainingScrambleResult => {
  if (scrambleTypeId === '444.edge_pairing') {
    return {
      scrambleTypeId,
      eventId: '444',
      scramble: generateEdgePairingTemplate(4, options.random),
    };
  }
  if (scrambleTypeId === '444.subset.rruu') {
    return {
      scrambleTypeId,
      eventId: '444',
      scramble: generateRruuScramble(options.random),
    };
  }
  if (scrambleTypeId === '444.poll' || scrambleTypeId === '444.ppll') {
    const cases = scrambleTypeId === '444.poll' ? POLL_CASES : PPLL_CASES;
    const selectedCase = selectScrambleCase(cases, options, options.random);
    return {
      scrambleTypeId,
      eventId: '444',
      scramble: scrambleFourByFourState(selectedCase.state),
      caseId: selectedCase.id,
    };
  }

  const maskSpec = PARTIAL_MASKS[scrambleTypeId];
  const masks = typeof maskSpec === 'function' ? maskSpec(options.random) : maskSpec;
  return {
    scrambleTypeId,
    eventId: '444',
    scramble: scrambleFourByFourState(createPartialState(masks, options.random)),
  };
};

export const getFourByFourTrainingCaseDefinitions = (
  scrambleTypeId: FourByFourTrainingScrambleTypeId,
): readonly ScrambleCaseDefinition[] => {
  const cases =
    scrambleTypeId === '444.poll' ? POLL_CASES : scrambleTypeId === '444.ppll' ? PPLL_CASES : [];
  return cases.map(({ id, naturalWeight }) => Object.freeze({ id, naturalWeight }));
};

export const doesFourByFourTrainingStateMatch = (
  scrambleTypeId: FourByFourTrainingScrambleTypeId,
  scramble: string,
): boolean => {
  if (scrambleTypeId === '444.edge_pairing') return isEdgePairingTemplate(scramble, 4);
  if (scrambleTypeId === '444.subset.rruu') {
    return splitAlgorithm(scramble).every((move) => /^(?:R|Rw|U)(?:2|')?$/.test(move));
  }

  const state = getFourByFourStateFromScramble(scramble);
  if (scrambleTypeId === '444.poll') {
    return POLL_CASES.some(({ state: candidate }) => statesEqual(state, candidate));
  }
  if (scrambleTypeId === '444.ppll') {
    return PPLL_CASES.some(({ state: candidate }) => statesEqual(state, candidate));
  }

  const maskSpec = PARTIAL_MASKS[scrambleTypeId];
  if (typeof maskSpec === 'function') {
    return Array.from({ length: 4 }, (_, candidate) =>
      maskSpec({ nextInt: (maxExclusive) => candidate % maxExclusive }),
    ).some((masks) => stateMatchesMasks(state, masks));
  }
  return stateMatchesMasks(state, maskSpec);
};

export const generateEdgePairingTemplate = (size: number, random: RandomSource): string => {
  if (!Number.isSafeInteger(size) || size < 4 || size > 7) {
    throw new RangeError(`${ERROR_PREFIX}: edge-pairing template size must be from 4 to 7`);
  }

  const maxWidth = Math.floor(size / 2);
  const blocks: string[] = [];
  const axes = ['R', 'F', 'L', 'B'] as const;
  for (let block = 0; block < 8 + size; block += 1) {
    const width = 2 + drawRandomInt(random, maxWidth - 1);
    const face = axes[drawRandomInt(random, axes.length)] as string;
    const wideMove = `${width === 2 ? '' : width}${face}w`;
    const amount = ['', '2', "'"][drawRandomInt(random, 3)] as string;
    const interleaveFace = block % 2 === 0 ? 'U' : 'D';
    const interleaveAmount = ['', '2', "'"][drawRandomInt(random, 3)] as string;
    blocks.push(
      `${wideMove}${amount}`,
      `${interleaveFace}${interleaveAmount}`,
      inverseMove(`${wideMove}${amount}`),
    );
  }
  return blocks.join(' ');
};

export const isEdgePairingTemplate = (scramble: string, size: number): boolean => {
  const maxWidth = Math.floor(size / 2);
  const moves = splitAlgorithm(scramble);
  let wideMoveCount = 0;
  for (const move of moves) {
    if (/^[UD](?:2|')?$/.test(move)) continue;
    const match = move.match(/^(\d+)?[RFLB]w(?:2|')?$/);
    if (match === null) return false;
    const width = match[1] === undefined ? 2 : Number.parseInt(match[1], 10);
    if (width < 2 || width > maxWidth) return false;
    wideMoveCount += 1;
  }
  return wideMoveCount >= 2 && moves.length >= 12;
};

const createPartialState = (masks: PartialStateMasks, random: RandomSource): FourByFourState => {
  for (let attempt = 0; attempt < MAX_PARTIAL_STATE_ATTEMPTS; attempt += 1) {
    const state: FourByFourState = {
      centerColors: shuffledMaskedValues(solved.centerColors, masks.centers, random),
      edgePermutation: shuffledMaskedValues(solved.edgePermutation, masks.edges, random),
      cornerPermutation: shuffledMaskedValues(solved.cornerPermutation, masks.corners, random),
      cornerOrientation: randomCornerOrientation(masks.corners, random),
    };
    if (!statesEqual(state, solved)) return state;
  }
  throw new Error(`${ERROR_PREFIX}: could not create a non-solved 4x4 partial state`);
};

const generateRruuScramble = (random: RandomSource): string => {
  rruuSolver ??= createRruuSolver();
  return rruuSolver.sample(random, { minDepth: 4 }).scramble.join(' ');
};

const createRruuSolver = (): SubgroupSolver<CubeState> => {
  const cube = createCubeDefinition(4, ['444']);
  const moves = ['R', 'R2', "R'", 'Rw', 'Rw2', "Rw'", 'U', 'U2', "U'"];
  const generators: SubgroupGenerator<CubeState>[] = moves.map((move) => ({
    id: move,
    inverseId: inverseMove(move),
    apply: (state) => cube.applyAlgorithm(state, move),
  }));
  return new SubgroupSolver({
    identity: cube.createSolvedState(),
    generators,
    stateKey: (state) => state.image.flatMap((face) => face.flatMap((row) => row)).join(''),
    maxDepth: 5,
    maxStates: 100_000,
  });
};

const shuffledMaskedValues = (
  values: readonly number[],
  mask: number,
  random: RandomSource,
): readonly number[] => {
  const result = [...values];
  const positions = result.map((_, index) => index).filter((index) => ((mask >> index) & 1) === 1);
  const shuffled = positions.map((position) => result[position] as number);
  shuffle(shuffled, random);
  positions.forEach((position, index) => {
    result[position] = shuffled[index] as number;
  });
  return result;
};

const randomCornerOrientation = (mask: number, random: RandomSource): readonly number[] => {
  const orientations = [...solved.cornerOrientation];
  const positions = orientations
    .map((_, index) => index)
    .filter((index) => ((mask >> index) & 1) === 1);
  let sum = 0;
  for (let index = 0; index < positions.length - 1; index += 1) {
    const orientation = drawRandomInt(random, 3);
    orientations[positions[index] as number] = orientation;
    sum += orientation;
  }
  if (positions.length > 0) {
    orientations[positions.at(-1) as number] = (3 - (sum % 3)) % 3;
  }
  return orientations;
};

const stateMatchesMasks = (state: FourByFourState, masks: PartialStateMasks): boolean =>
  fixedPositionsMatch(state.centerColors, solved.centerColors, masks.centers) &&
  fixedPositionsMatch(state.edgePermutation, solved.edgePermutation, masks.edges) &&
  fixedPositionsMatch(state.cornerPermutation, solved.cornerPermutation, masks.corners) &&
  fixedPositionsMatch(state.cornerOrientation, solved.cornerOrientation, masks.corners) &&
  !statesEqual(state, solved);

const fixedPositionsMatch = (
  actual: readonly number[],
  expected: readonly number[],
  randomizedMask: number,
): boolean =>
  actual.every(
    (value, index) => ((randomizedMask >> index) & 1) === 1 || value === expected[index],
  );

const statesEqual = (first: FourByFourState, second: FourByFourState): boolean =>
  first.edgePermutation.every((value, index) => value === second.edgePermutation[index]) &&
  first.centerColors.every((value, index) => value === second.centerColors[index]) &&
  first.cornerPermutation.every((value, index) => value === second.cornerPermutation[index]) &&
  first.cornerOrientation.every((value, index) => value === second.cornerOrientation[index]);

const shuffle = (values: number[], random: RandomSource): void => {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = drawRandomInt(random, index + 1);
    [values[index], values[target]] = [values[target] as number, values[index] as number];
  }
};

const inverseMove = (move: string): string => {
  if (move.endsWith('2')) return move;
  if (move.endsWith("'")) return move.slice(0, -1);
  return `${move}'`;
};

const drawRandomInt = (random: RandomSource, maxExclusive: number): number => {
  const value = random.nextInt(maxExclusive);
  if (!Number.isSafeInteger(value) || value < 0 || value >= maxExclusive) {
    throw new RangeError(
      `${ERROR_PREFIX}: 4x4 random source returned ${value} for max ${maxExclusive}`,
    );
  }
  return value;
};
