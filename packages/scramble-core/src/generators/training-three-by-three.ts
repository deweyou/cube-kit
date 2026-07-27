import { createCubeDefinition, splitAlgorithm, type CubeState } from '@cubegin/scramble-puzzle';
import {
  createThreeByThreeTrainingState,
  getThreeByThreeCubieStateFromScramble,
  scrambleThreeByThreeState,
  SubgroupSolver,
  type SubgroupGenerator,
  type ThreeByThreeCubieState,
  type ThreeByThreeTrainingStateConstraints,
} from '@cubegin/solver';
import { selectScrambleCase, type ScrambleCaseDefinition } from '../case-selection.js';
import type { GenerateTypeOptions, TrainingScrambleResult } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import type { TrainingScrambleTypeId } from '../catalog.js';

const ERROR_PREFIX = '@cubegin/scramble-core';
const UNKNOWN = -1;

export type ThreeByThreeTrainingScrambleTypeId = Extract<TrainingScrambleTypeId, `333.${string}`>;

interface ThreeByThreeTrainingCase extends ScrambleCaseDefinition {
  readonly constraints: ThreeByThreeTrainingStateConstraints;
}

const solvedPermutation = (length: number): readonly number[] =>
  Array.from({ length }, (_, index) => index);
const solvedOrientation = (length: number): readonly number[] => Array<number>(length).fill(0);
const randomPermutation = (length: number): readonly number[] =>
  Array<number>(length).fill(UNKNOWN);
const randomOrientation = (length: number): readonly number[] =>
  Array<number>(length).fill(UNKNOWN);

const SOLVED_CP = solvedPermutation(8);
const SOLVED_CO = solvedOrientation(8);
const SOLVED_EO = solvedOrientation(12);
const RANDOM_CP = randomPermutation(8);
const RANDOM_CO = randomOrientation(8);

const nibbleMask = (value: string, length: number): readonly number[] => {
  if (value.length !== length) {
    throw new Error(`${ERROR_PREFIX}: nibble mask '${value}' must contain ${length} digits`);
  }

  return Array.from(value)
    .reverse()
    .map((digit) => (digit.toLowerCase() === 'f' ? UNKNOWN : Number.parseInt(digit, 16)));
};

const stateConstraints = (
  edgePermutation: string | readonly number[],
  edgeOrientation: string | readonly number[],
  cornerPermutation: string | readonly number[],
  cornerOrientation: string | readonly number[],
): ThreeByThreeTrainingStateConstraints => ({
  edgePermutation:
    typeof edgePermutation === 'string' ? nibbleMask(edgePermutation, 12) : edgePermutation,
  edgeOrientation:
    typeof edgeOrientation === 'string' ? nibbleMask(edgeOrientation, 12) : edgeOrientation,
  cornerPermutation:
    typeof cornerPermutation === 'string' ? nibbleMask(cornerPermutation, 8) : cornerPermutation,
  cornerOrientation:
    typeof cornerOrientation === 'string' ? nibbleMask(cornerOrientation, 8) : cornerOrientation,
});

const typeConstraints = (
  constraints: ThreeByThreeTrainingStateConstraints,
): ThreeByThreeTrainingStateConstraints => constraints;

const LAST_LAYER = stateConstraints('ba987654ffff', '00000000ffff', '7654ffff', '0000ffff');
const LAST_SLOT_LAST_LAYER = stateConstraints(
  'ba9f7654ffff',
  '000f0000ffff',
  '765fffff',
  '000fffff',
);
const F2L_STATE = stateConstraints('ffff7654ffff', 'ffff0000ffff', 'ffffffff', 'ffffffff');
const EO_LINE_STATE = stateConstraints('ffff7f5fffff', '000000000000', 'ffffffff', 'ffffffff');
const EO_CROSS_STATE = stateConstraints('ffff7654ffff', '000000000000', 'ffffffff', 'ffffffff');
const ROUX_SECOND_BLOCK_STATE = stateConstraints(
  'fa9ff6ffffff',
  'f00ff0ffffff',
  'f65fffff',
  'f00fffff',
);
const ROUX_LSE_STATE = stateConstraints('ba98f6f4ffff', '0000f0f0ffff', SOLVED_CP, SOLVED_CO);

const THREE_BY_THREE_CONSTRAINTS: Readonly<
  Partial<Record<ThreeByThreeTrainingScrambleTypeId, ThreeByThreeTrainingStateConstraints>>
> = {
  '333.edges_only': typeConstraints({
    edgePermutation: 'random',
    edgeOrientation: 'random',
    cornerPermutation: 'solved',
    cornerOrientation: 'solved',
  }),
  '333.corners_only': typeConstraints({
    edgePermutation: 'solved',
    edgeOrientation: 'solved',
    cornerPermutation: 'random',
    cornerOrientation: 'random',
  }),
  '333.ll': LAST_LAYER,
  '333.pll': stateConstraints('ba987654ffff', SOLVED_EO, '7654ffff', SOLVED_CO),
  '333.oll': LAST_LAYER,
  '333.lsll': LAST_SLOT_LAST_LAYER,
  '333.zbll': stateConstraints('ba987654ffff', SOLVED_EO, '7654ffff', '0000ffff'),
  '333.coll': stateConstraints('ba987654ffff', SOLVED_EO, '7654ffff', '0000ffff'),
  '333.cll': LAST_LAYER,
  '333.ell': stateConstraints('ba987654ffff', '00000000ffff', SOLVED_CP, SOLVED_CO),
  '333.2gll': stateConstraints('ba987654ffff', SOLVED_EO, SOLVED_CP, '0000ffff'),
  '333.zzll': stateConstraints('ba9876543f1f', SOLVED_EO, '7654ffff', '0000ffff'),
  '333.zbls': LAST_SLOT_LAST_LAYER,
  '333.eols': stateConstraints('ba9f7654ffff', SOLVED_EO, '765fffff', '000fffff'),
  '333.wvls': stateConstraints('ba9f7654ff8f', SOLVED_EO, '765fff4f', '000fffff'),
  '333.vls': LAST_SLOT_LAST_LAYER,
  '333.f2l': F2L_STATE,
  '333.easy_cross': stateConstraints('ffff765fffff', 'ffff000fffff', RANDOM_CP, RANDOM_CO),
  '333.easy_xcross': stateConstraints('fff8765fffff', 'fff0000fffff', '765fffff', '000fffff'),
  '333.eoline': EO_LINE_STATE,
  '333.eo_cross': EO_CROSS_STATE,
  '333.edge_permutation': typeConstraints({
    edgePermutation: 'random',
    edgeOrientation: 'solved',
    cornerPermutation: 'solved',
    cornerOrientation: 'solved',
  }),
  '333.edge_orientation': typeConstraints({
    edgePermutation: 'solved',
    edgeOrientation: 'random',
    cornerPermutation: 'solved',
    cornerOrientation: 'solved',
  }),
  '333.corner_permutation': typeConstraints({
    edgePermutation: 'solved',
    edgeOrientation: 'solved',
    cornerPermutation: 'random',
    cornerOrientation: 'solved',
  }),
  '333.corner_orientation': typeConstraints({
    edgePermutation: 'solved',
    edgeOrientation: 'solved',
    cornerPermutation: 'solved',
    cornerOrientation: 'random',
  }),
  '333.permutation_only': typeConstraints({
    edgePermutation: 'random',
    edgeOrientation: 'solved',
    cornerPermutation: 'random',
    cornerOrientation: 'solved',
  }),
  '333.orientation_only': typeConstraints({
    edgePermutation: 'solved',
    edgeOrientation: 'random',
    cornerPermutation: 'solved',
    cornerOrientation: 'random',
  }),
  '333.three_edge_cycle': typeConstraints({
    edgePermutation: 'random',
    edgeOrientation: 'solved',
    cornerPermutation: 'solved',
    cornerOrientation: 'solved',
  }),
  '333.three_corner_cycle': typeConstraints({
    edgePermutation: 'solved',
    edgeOrientation: 'solved',
    cornerPermutation: 'random',
    cornerOrientation: 'solved',
  }),
  '333.roux.second_block': ROUX_SECOND_BLOCK_STATE,
  '333.roux.cmll': stateConstraints('ba98f6f4ffff', '0000f0f0ffff', '7654ffff', '0000ffff'),
  '333.roux.lse': ROUX_LSE_STATE,
  '333.mehta.3qb': stateConstraints('ffff765fffff', 'ffff000fffff', 'f65fffff', 'f00fffff'),
  '333.mehta.eole': stateConstraints('ba98765fffff', '0000000fffff', 'f65fffff', 'f00fffff'),
  '333.mehta.tdr': stateConstraints('ba98765fffff', SOLVED_EO, 'f65fffff', 'f00fffff'),
  '333.mehta.6cp': stateConstraints('ba98765fffff', SOLVED_EO, 'f65fffff', SOLVED_CO),
  '333.mehta.cdrll': stateConstraints('ba98765fffff', SOLVED_EO, '7654ffff', '0000ffff'),
  '333.mehta.l5ep': stateConstraints('ba98765fffff', SOLVED_EO, SOLVED_CP, SOLVED_CO),
  '333.mehta.ttll': LAST_LAYER,
};

const topOrientationCases = (
  prefix: string,
  base: ThreeByThreeTrainingStateConstraints,
): readonly ThreeByThreeTrainingCase[] =>
  [
    ['o', [0, 0, 0, 0]],
    ['s', [0, 2, 2, 2]],
    ['as', [0, 1, 1, 1]],
    ['h', [1, 2, 1, 2]],
    ['pi', [1, 1, 2, 2]],
    ['l', [0, 1, 0, 2]],
    ['t', [0, 0, 1, 2]],
    ['u', [0, 0, 2, 1]],
  ].map(([name, topOrientation]) => ({
    id: `${prefix}.${name as string}`,
    naturalWeight: name === 'o' || name === 'h' ? 1 : 4,
    constraints: {
      ...base,
      cornerOrientation: [...(topOrientation as readonly number[]), 0, 0, 0, 0],
    },
  }));

const PLL_CASE_DATA = [
  ['h', '1032', '3210', 1],
  ['ua', '3102', '3210', 4],
  ['ub', '3021', '3210', 4],
  ['z', '2301', '3210', 2],
  ['aa', '3210', '3021', 4],
  ['ab', '3210', '3102', 4],
  ['e', '3210', '2301', 2],
  ['f', '3012', '3201', 4],
  ['ga', '2130', '3021', 4],
  ['gb', '1320', '3102', 4],
  ['gc', '3021', '3102', 4],
  ['gd', '3102', '3021', 4],
  ['ja', '3201', '3201', 4],
  ['jb', '3120', '3201', 4],
  ['na', '1230', '3012', 1],
  ['nb', '3012', '3012', 1],
  ['ra', '0213', '3201', 4],
  ['rb', '2310', '3201', 4],
  ['t', '1230', '3201', 4],
  ['v', '3120', '3012', 4],
  ['y', '3201', '3012', 4],
] as const;

const PLL_CASES: readonly ThreeByThreeTrainingCase[] = PLL_CASE_DATA.map(
  ([name, edgeTop, cornerTop, naturalWeight]) => ({
    id: `333.pll.${name}`,
    naturalWeight,
    constraints: stateConstraints(`ba987654${edgeTop}`, SOLVED_EO, `7654${cornerTop}`, SOLVED_CO),
  }),
);

const OLL_EDGE_PATTERNS = [
  ['dot', [1, 1, 1, 1]],
  ['line', [1, 0, 1, 0]],
  ['l', [1, 1, 0, 0]],
  ['cross', [0, 0, 0, 0]],
] as const;

const OLL_CASES: readonly ThreeByThreeTrainingCase[] = topOrientationCases(
  '333.oll',
  LAST_LAYER,
).flatMap((cornerCase) =>
  OLL_EDGE_PATTERNS.map(([edgeName, edgeOrientation]) => ({
    id: `${cornerCase.id}.${edgeName}`,
    naturalWeight: cornerCase.naturalWeight,
    constraints: {
      ...cornerCase.constraints,
      edgeOrientation: [...edgeOrientation, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  })),
);

const genericOrientationCases = (
  scrambleTypeId: ThreeByThreeTrainingScrambleTypeId,
): readonly ThreeByThreeTrainingCase[] =>
  topOrientationCases(scrambleTypeId, THREE_BY_THREE_CONSTRAINTS[scrambleTypeId] ?? LAST_LAYER);

const createCycleCases = (pieceFamily: 'edge' | 'corner'): readonly ThreeByThreeTrainingCase[] => {
  const pieceCount = pieceFamily === 'edge' ? 12 : 8;
  const cases: ThreeByThreeTrainingCase[] = [];

  for (let first = 0; first < pieceCount - 2; first += 1) {
    for (let second = first + 1; second < pieceCount - 1; second += 1) {
      for (let third = second + 1; third < pieceCount; third += 1) {
        for (const direction of ['cw', 'ccw'] as const) {
          const permutation = solvedPermutation(pieceCount).slice();
          if (direction === 'cw') {
            permutation[first] = third;
            permutation[second] = first;
            permutation[third] = second;
          } else {
            permutation[first] = second;
            permutation[second] = third;
            permutation[third] = first;
          }

          cases.push({
            id: `333.three_${pieceFamily}_cycle.${first}-${second}-${third}.${direction}`,
            constraints:
              pieceFamily === 'edge'
                ? {
                    edgePermutation: permutation,
                    edgeOrientation: 'solved',
                    cornerPermutation: 'solved',
                    cornerOrientation: 'solved',
                  }
                : {
                    edgePermutation: 'solved',
                    edgeOrientation: 'solved',
                    cornerPermutation: permutation,
                    cornerOrientation: 'solved',
                  },
          });
        }
      }
    }
  }

  return cases;
};

const createPermutationCases = (
  scrambleTypeId: ThreeByThreeTrainingScrambleTypeId,
  pieceFamily: 'edge' | 'corner',
  positions: readonly number[],
  base: ThreeByThreeTrainingStateConstraints,
): readonly ThreeByThreeTrainingCase[] =>
  enumeratePermutations(positions)
    .filter((permutation) => !permutation.every((piece, index) => piece === positions[index]))
    .filter(hasEvenPermutationParity)
    .map((permutation) => {
      const piecePermutation = solvedPermutation(pieceFamily === 'edge' ? 12 : 8).slice();
      positions.forEach((position, index) => {
        piecePermutation[position] = permutation[index] as number;
      });

      return {
        id: `${scrambleTypeId}.${permutation.join('-')}`,
        constraints: {
          ...base,
          ...(pieceFamily === 'edge'
            ? { edgePermutation: piecePermutation }
            : { cornerPermutation: piecePermutation }),
        },
      };
    });

const enumeratePermutations = (values: readonly number[]): readonly (readonly number[])[] => {
  if (values.length <= 1) return [values];

  return values.flatMap((value, index) =>
    enumeratePermutations(values.filter((_, candidateIndex) => candidateIndex !== index)).map(
      (suffix) => [value, ...suffix],
    ),
  );
};

const hasEvenPermutationParity = (permutation: readonly number[]): boolean => {
  let inversions = 0;
  for (let left = 0; left < permutation.length; left += 1) {
    for (let right = left + 1; right < permutation.length; right += 1) {
      if ((permutation[left] as number) > (permutation[right] as number)) inversions += 1;
    }
  }

  return inversions % 2 === 0;
};

const CASES_BY_TYPE: Readonly<
  Partial<Record<ThreeByThreeTrainingScrambleTypeId, readonly ThreeByThreeTrainingCase[]>>
> = {
  '333.pll': PLL_CASES,
  '333.oll': OLL_CASES,
  '333.zbll': genericOrientationCases('333.zbll'),
  '333.coll': genericOrientationCases('333.coll'),
  '333.cll': genericOrientationCases('333.cll'),
  '333.ell': [
    {
      id: '333.ell.h',
      constraints: stateConstraints('ba9876541032', '00000000ffff', SOLVED_CP, SOLVED_CO),
    },
    {
      id: '333.ell.ua',
      constraints: stateConstraints('ba9876543102', '00000000ffff', SOLVED_CP, SOLVED_CO),
    },
    {
      id: '333.ell.z',
      constraints: stateConstraints('ba9876542301', '00000000ffff', SOLVED_CP, SOLVED_CO),
    },
  ],
  '333.2gll': genericOrientationCases('333.2gll'),
  '333.zzll': genericOrientationCases('333.zzll'),
  '333.zbls': genericOrientationCases('333.zbls'),
  '333.eols': genericOrientationCases('333.eols'),
  '333.wvls': genericOrientationCases('333.wvls'),
  '333.vls': genericOrientationCases('333.vls'),
  '333.three_edge_cycle': createCycleCases('edge'),
  '333.three_corner_cycle': createCycleCases('corner'),
  '333.roux.cmll': genericOrientationCases('333.roux.cmll'),
  '333.mehta.6cp': createPermutationCases(
    '333.mehta.6cp',
    'corner',
    [0, 1, 2, 3, 4, 7],
    THREE_BY_THREE_CONSTRAINTS['333.mehta.6cp'] as ThreeByThreeTrainingStateConstraints,
  ),
  '333.mehta.cdrll': genericOrientationCases('333.mehta.cdrll'),
  '333.mehta.l5ep': createPermutationCases(
    '333.mehta.l5ep',
    'edge',
    [0, 1, 2, 3, 4],
    THREE_BY_THREE_CONSTRAINTS['333.mehta.l5ep'] as ThreeByThreeTrainingStateConstraints,
  ),
  '333.mehta.ttll': genericOrientationCases('333.mehta.ttll'),
};

const SUBGROUP_MOVES: Readonly<
  Record<
    Extract<ThreeByThreeTrainingScrambleTypeId, `333.subset.${string}` | '333.roux.lse_mu'>,
    readonly string[]
  >
> = {
  '333.subset.ru': ['R', 'U'],
  '333.subset.lu': ['L', 'U'],
  '333.subset.fru': ['F', 'R', 'U'],
  '333.subset.rul': ['R', 'U', 'L'],
  '333.subset.rrwu': ['R', 'Rw', 'U'],
  '333.subset.mu': ['M', 'U'],
  '333.subset.half_turn': ['R2', 'U2', 'F2', 'L2', 'D2', 'B2'],
  '333.subset.domino': ['U', 'D', 'R2', 'F2', 'L2', 'B2'],
  '333.roux.lse_mu': ['M', 'U'],
};

const subgroupCache = new Map<string, SubgroupSolver<CubeState>>();

export const generateThreeByThreeTrainingScramble = (
  scrambleTypeId: ThreeByThreeTrainingScrambleTypeId,
  options: GenerateTypeOptions & { random: RandomSource },
): TrainingScrambleResult => {
  if (scrambleTypeId in SUBGROUP_MOVES) {
    return {
      scrambleTypeId,
      eventId: '333',
      scramble: generateSubgroupScramble(subgroupType(scrambleTypeId), options.random),
    };
  }

  const cases = CASES_BY_TYPE[scrambleTypeId];
  const selectedCase =
    cases === undefined ? undefined : selectScrambleCase(cases, options, options.random);
  if (cases === undefined && options.enabledCaseIds !== undefined) {
    throw new Error(`${ERROR_PREFIX}: scramble type '${scrambleTypeId}' does not support cases`);
  }

  const constraints = selectedCase?.constraints ?? THREE_BY_THREE_CONSTRAINTS[scrambleTypeId];
  if (constraints === undefined) {
    throw new Error(`${ERROR_PREFIX}: scramble type '${scrambleTypeId}' is not implemented`);
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const facelets = createThreeByThreeTrainingState(constraints, options.random);
    const scramble = scrambleThreeByThreeState(facelets).trim();
    if (splitAlgorithm(scramble).length >= 3) {
      return {
        scrambleTypeId,
        eventId: '333',
        scramble,
        ...(selectedCase === undefined ? {} : { caseId: selectedCase.id }),
      };
    }
  }

  throw new Error(`${ERROR_PREFIX}: could not generate a non-degenerate '${scrambleTypeId}' state`);
};

export const getThreeByThreeTrainingCaseDefinitions = (
  scrambleTypeId: ThreeByThreeTrainingScrambleTypeId,
): readonly ScrambleCaseDefinition[] =>
  (CASES_BY_TYPE[scrambleTypeId] ?? []).map(({ id, naturalWeight }) =>
    Object.freeze({ id, ...(naturalWeight === undefined ? {} : { naturalWeight }) }),
  );

export const doesThreeByThreeTrainingStateMatch = (
  scrambleTypeId: ThreeByThreeTrainingScrambleTypeId,
  scramble: string,
): boolean => {
  if (scrambleTypeId in SUBGROUP_MOVES) {
    const allowedMoves = new Set(expandMoveTokens(SUBGROUP_MOVES[subgroupType(scrambleTypeId)]));
    return splitAlgorithm(scramble).every((move) => allowedMoves.has(move));
  }

  const cubies = getThreeByThreeCubieStateFromScramble(scramble);
  const constraints = THREE_BY_THREE_CONSTRAINTS[scrambleTypeId];
  if (constraints === undefined) return false;

  if (scrambleTypeId === '333.three_edge_cycle') {
    return isSingleThreeCycle(cubies.edgePermutation) && isSolvedCorners(cubies);
  }
  if (scrambleTypeId === '333.three_corner_cycle') {
    return isSingleThreeCycle(cubies.cornerPermutation) && isSolvedEdges(cubies);
  }

  return stateMatchesConstraints(cubies, constraints);
};

const generateSubgroupScramble = (
  scrambleTypeId: keyof typeof SUBGROUP_MOVES,
  random: RandomSource,
): string => {
  const moves = SUBGROUP_MOVES[scrambleTypeId];
  let solver = subgroupCache.get(scrambleTypeId);
  if (solver === undefined) {
    solver = createCubeSubgroupSolver(moves);
    subgroupCache.set(scrambleTypeId, solver);
  }

  return solver.sample(random, { minDepth: 4 }).scramble.join(' ');
};

const createCubeSubgroupSolver = (baseMoves: readonly string[]): SubgroupSolver<CubeState> => {
  const cube = createCubeDefinition(3, ['333']);
  const generators: SubgroupGenerator<CubeState>[] = expandMoveTokens(baseMoves).map((move) => ({
    id: move,
    inverseId: inverseMove(move),
    apply: (state) => cube.applyAlgorithm(state, move),
  }));

  return new SubgroupSolver({
    identity: cube.createSolvedState(),
    generators,
    stateKey: cubeStateKey,
    maxDepth: baseMoves.length <= 2 ? 6 : 5,
    maxStates: 80_000,
  });
};

const expandMoveTokens = (baseMoves: readonly string[]): readonly string[] =>
  baseMoves.flatMap((move) => (move.endsWith('2') ? [move] : [move, `${move}2`, `${move}'`]));

const inverseMove = (move: string): string => {
  if (move.endsWith('2')) return move;
  if (move.endsWith("'")) return move.slice(0, -1);
  return `${move}'`;
};

const cubeStateKey = (state: CubeState): string =>
  state.image.flatMap((face) => face.flatMap((row) => row)).join('');

const subgroupType = (
  scrambleTypeId: ThreeByThreeTrainingScrambleTypeId,
): keyof typeof SUBGROUP_MOVES => scrambleTypeId as keyof typeof SUBGROUP_MOVES;

const stateMatchesConstraints = (
  cubies: ThreeByThreeCubieState,
  constraints: ThreeByThreeTrainingStateConstraints,
): boolean =>
  partMatches(cubies.cornerPermutation, constraints.cornerPermutation, false) &&
  partMatches(cubies.cornerOrientation, constraints.cornerOrientation, true) &&
  partMatches(cubies.edgePermutation, constraints.edgePermutation, false) &&
  partMatches(cubies.edgeOrientation, constraints.edgeOrientation, true);

const partMatches = (
  actual: readonly number[],
  expected: ThreeByThreeTrainingStateConstraints[keyof ThreeByThreeTrainingStateConstraints],
  isOrientation: boolean,
): boolean => {
  if (expected === undefined || expected === 'random') return true;
  if (expected === 'solved') {
    return actual.every((value, index) => value === (isOrientation ? 0 : index));
  }

  return expected.every((value, index) => value === UNKNOWN || actual[index] === value);
};

const isSingleThreeCycle = (permutation: readonly number[]): boolean => {
  const moved = permutation
    .map((piece, position) => ({ piece, position }))
    .filter(({ piece, position }) => piece !== position);
  if (moved.length !== 3) return false;

  const movedPositions = new Set(moved.map(({ position }) => position));
  return moved.every(({ piece }) => movedPositions.has(piece));
};

const isSolvedEdges = (cubies: ThreeByThreeCubieState): boolean =>
  cubies.edgePermutation.every((piece, index) => piece === index) &&
  cubies.edgeOrientation.every((orientation) => orientation === 0);

const isSolvedCorners = (cubies: ThreeByThreeCubieState): boolean =>
  cubies.cornerPermutation.every((piece, index) => piece === index) &&
  cubies.cornerOrientation.every((orientation) => orientation === 0);
