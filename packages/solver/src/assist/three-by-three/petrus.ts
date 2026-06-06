import type { CubeFace, CubeMove } from '@cubegin/scramble-puzzle';
import {
  NoSolverSolutionError,
  UnknownSolverTargetError,
  UnsupportedSolverMoveError,
} from '../../errors.js';
import type {
  ThreeByThreeAssistOptions,
  ThreeByThreeAssistResult,
  ThreeByThreeAssistSolution,
} from '../../types.js';
import {
  binomial,
  createPruningTable,
  indexToPermutation,
  permutationToIndex,
} from './coordinate-utils.js';
import { moveEdge } from './cross.js';
import { countFaceTurnMetric, countQuarterTurnMetric } from './metrics.js';
import { parseThreeByThreeSolverAlgorithm } from './move-utils.js';

const FACTORIAL = [1, 1, 2, 6, 24] as const;
const SUFFIXES = ['', '2', "'"] as const;
const PETRUS_SOLVED_CO = 12;
const PETRUS_SOLVED_EP = 17 * 6;
const PETRUS_SOLVED_EO = 17 * 8;
const PETRUS_MOVE_STRINGS = [
  'DULRBF',
  'FBLRDU',
  'DUFBLR',
  'DURLFB',
  'UDFBRL',
  'UDLRFB',
  'UDRLBF',
  'UDBFLR',
] as const;
const PETRUS_TARGETS = ['ULF', 'ULB', 'URF', 'URB', 'DLF', 'DLB', 'DRF', 'DRB'] as const;

export interface PetrusTables {
  readonly epm: readonly (readonly number[])[];
  readonly eom: readonly (readonly number[])[];
  readonly com: readonly (readonly number[])[];
  readonly epd: readonly number[];
  readonly eod: readonly number[];
}

interface FaceTurn {
  readonly face: CubeFace;
  readonly amount: 1 | 2 | 3;
}

interface PetrusState {
  readonly co: number;
  readonly ep: number;
  readonly eo: number;
}

let petrusTables: PetrusTables | undefined;

const moveSuffix = (amount: CubeMove['amount']): string => {
  if (amount === 2) return '2';
  if (amount === 3) return "'";
  return '';
};

const rotationToken = (move: CubeMove): string => {
  if (!move.isRotation) return `${move.face}${moveSuffix(move.amount)}`;
  if (move.face === 'R') return `x${moveSuffix(move.amount)}`;
  if (move.face === 'U') return `y${moveSuffix(move.amount)}`;
  return `z${moveSuffix(move.amount)}`;
};

const toFaceTurn = (move: CubeMove): FaceTurn => {
  if (move.isRotation) throw new UnsupportedSolverMoveError(rotationToken(move));

  return { face: move.face, amount: move.amount };
};

const parseFaceTurns = (algorithm: string): readonly FaceTurn[] =>
  parseThreeByThreeSolverAlgorithm(algorithm).map(toFaceTurn);

const moveIndex = (moveMap: string, turn: FaceTurn): number => {
  const index = moveMap.indexOf(turn.face);
  if (index < 0) throw new UnsupportedSolverMoveError(`${turn.face}${moveSuffix(turn.amount)}`);

  return index;
};

const edgeMove = (
  combination: number,
  permutationAndOrientation: number,
  selectedEdgeCount: number,
  move: number,
): number => {
  const edges = Array<number>(12).fill(-1);
  const permutation = indexToPermutation(permutationAndOrientation, selectedEdgeCount, false);
  let remaining = selectedEdgeCount;
  let orientation = permutationAndOrientation;

  for (let position = 0; position < 12; position += 1) {
    if (combination >= binomial(11 - position, remaining)) {
      combination -= binomial(11 - position, remaining);
      remaining -= 1;
      edges[position] = (permutation[remaining] << 1) | (orientation & 1);
      orientation >>= 1;
    }
  }

  moveEdge(edges, move);

  let nextCombination = 0;
  let nextOrientation = 0;
  remaining = selectedEdgeCount;

  for (let position = 0; position < 12; position += 1) {
    if (edges[position] >= 0) {
      nextCombination += binomial(11 - position, remaining);
      remaining -= 1;
      permutation[remaining] = edges[position] >> 1;
      nextOrientation |= (edges[position] & 1) << (selectedEdgeCount - 1 - remaining);
    }
  }

  return (
    ((FACTORIAL[selectedEdgeCount] * nextCombination +
      permutationToIndex(permutation, selectedEdgeCount, false)) <<
      3) |
    nextOrientation
  );
};

const createFilledTable = (rows: number, columns: number): number[][] =>
  Array.from({ length: rows }, () => Array<number>(columns).fill(0));

const createCornerMoveTable = (): number[][] => {
  const table = createFilledTable(24, 6);
  const permutationMoves = [
    [1, 0, 3, 0, 0, 4],
    [2, 1, 1, 5, 1, 0],
    [3, 2, 2, 1, 6, 2],
    [0, 3, 7, 3, 2, 3],
    [4, 7, 0, 4, 4, 5],
    [5, 4, 5, 6, 5, 1],
    [6, 5, 6, 2, 7, 6],
    [7, 6, 4, 7, 3, 7],
  ];
  const orientationMoves = [
    [0, 0, 1, 0, 0, 2],
    [0, 0, 0, 2, 0, 1],
    [0, 0, 0, 1, 2, 0],
    [0, 0, 2, 0, 1, 0],
    [0, 0, 2, 0, 0, 1],
    [0, 0, 0, 1, 0, 2],
    [0, 0, 0, 2, 1, 0],
    [0, 0, 1, 0, 2, 0],
  ];

  for (let corner = 0; corner < 8; corner += 1) {
    for (let orientation = 0; orientation < 3; orientation += 1) {
      for (let move = 0; move < 6; move += 1) {
        table[corner * 3 + orientation][move] =
          permutationMoves[corner][move] * 3 + ((orientationMoves[corner][move] + orientation) % 3);
      }
    }
  }

  return table;
};

export const getPetrusTables = (): PetrusTables => {
  if (petrusTables) return petrusTables;

  const epm = createFilledTable(1320, 6);
  const eom = createFilledTable(1760, 6);

  for (let combination = 0; combination < 220; combination += 1) {
    for (let orientation = 0; orientation < 8; orientation += 1) {
      for (let move = 0; move < 6; move += 1) {
        const next = edgeMove(combination, orientation, 3, move);

        if (orientation < 6) epm[combination * 6 + orientation][move] = next >> 3;
        eom[combination * 8 + orientation][move] = (Math.floor(next / 48) << 3) | (next & 7);
      }
    }
  }

  petrusTables = {
    epm,
    eom,
    com: createCornerMoveTable(),
    epd: createPruningTable(1320, [PETRUS_SOLVED_EP], 5, epm, 3),
    eod: createPruningTable(1760, [PETRUS_SOLVED_EO], 5, eom, 3),
  };

  return petrusTables;
};

const applyScramble = (scramble: string, block: number, tables: PetrusTables): PetrusState => {
  let co = PETRUS_SOLVED_CO;
  let ep = PETRUS_SOLVED_EP;
  let eo = PETRUS_SOLVED_EO;
  const moveMap = PETRUS_MOVE_STRINGS[block];

  for (const turn of parseFaceTurns(scramble)) {
    const move = moveIndex(moveMap, turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      co = tables.com[co][move];
      ep = tables.epm[ep][move];
      eo = tables.eom[eo][move];
    }
  }

  return { co, ep, eo };
};

const applySolution = (
  state: PetrusState,
  solution: string,
  block: number,
  tables: PetrusTables,
): PetrusState => {
  let { co, ep, eo } = state;
  const moveMap = PETRUS_MOVE_STRINGS[block];

  for (const turn of parseFaceTurns(solution)) {
    const move = moveIndex(moveMap, turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      co = tables.com[co][move];
      ep = tables.epm[ep][move];
      eo = tables.eom[eo][move];
    }
  }

  return { co, ep, eo };
};

const searchPetrusS1 = (
  state: PetrusState,
  depth: number,
  lastMove: number,
  tables: PetrusTables,
): readonly number[] | undefined => {
  if (depth === 0) {
    return state.co === PETRUS_SOLVED_CO &&
      state.ep === PETRUS_SOLVED_EP &&
      state.eo === PETRUS_SOLVED_EO
      ? []
      : undefined;
  }
  if (tables.epd[state.ep] > depth || tables.eod[state.eo] > depth) return undefined;

  for (let move = 0; move < 6; move += 1) {
    if (move === lastMove) continue;

    let co = state.co;
    let ep = state.ep;
    let eo = state.eo;

    for (let turn = 0; turn < 3; turn += 1) {
      co = tables.com[co][move];
      ep = tables.epm[ep][move];
      eo = tables.eom[eo][move];

      const rest = searchPetrusS1({ co, ep, eo }, depth - 1, move, tables);
      if (rest) return [move * 3 + turn, ...rest];
    }
  }

  return undefined;
};

const pathToAlgorithm = (path: readonly number[], block: number): string =>
  path
    .map((move) => `${PETRUS_MOVE_STRINGS[block][Math.floor(move / 3)]}${SUFFIXES[move % 3]}`)
    .join(' ');

const firstPath = (
  maxDepth: number,
  search: (depth: number) => readonly number[] | undefined,
): readonly number[] | undefined => {
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const path = search(depth);
    if (path) return path;
  }

  return undefined;
};

const requestedTargets = (targets: readonly string[] | undefined): readonly number[] => {
  if (!targets) return PETRUS_TARGETS.map((_, index) => index);

  return targets.map((target) => {
    const index = PETRUS_TARGETS.indexOf(target as (typeof PETRUS_TARGETS)[number]);
    if (index < 0) throw new UnknownSolverTargetError('petrus-s1', target);

    return index;
  });
};

const createSolution = (block: number, path: readonly number[]): ThreeByThreeAssistSolution => {
  const solution = pathToAlgorithm(path, block);

  return {
    method: 'petrus-s1',
    target: PETRUS_TARGETS[block],
    targetLabel: PETRUS_TARGETS[block],
    setupRotation: '',
    solution,
    depth: path.length,
    metric: {
      ftm: countFaceTurnMetric(solution),
      qtm: countQuarterTurnMetric(solution),
    },
  };
};

export const solvePetrusS1 = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => {
  const tables = getPetrusTables();
  const maxDepth = options.maxDepth ?? 8;
  const solutions = requestedTargets(options.targets).map((block) => {
    const state = applyScramble(scramble, block, tables);
    const path = firstPath(maxDepth, (depth) => searchPetrusS1(state, depth, -1, tables));
    if (!path) throw new NoSolverSolutionError('petrus-s1', PETRUS_TARGETS[block], maxDepth);

    return createSolution(block, path);
  });

  return { method: 'petrus-s1', scramble, solutions };
};

export const isPetrusS1SolutionSolved = (
  scramble: string,
  solution: ThreeByThreeAssistSolution,
): boolean => {
  const block = PETRUS_TARGETS.indexOf(solution.target as (typeof PETRUS_TARGETS)[number]);
  if (block < 0) return false;

  const tables = getPetrusTables();
  const state = applySolution(
    applyScramble(scramble, block, tables),
    solution.solution,
    block,
    tables,
  );

  return (
    state.co === PETRUS_SOLVED_CO && state.ep === PETRUS_SOLVED_EP && state.eo === PETRUS_SOLVED_EO
  );
};
