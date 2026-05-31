import type { CubeFace, CubeMove } from '@cubekit/scramble-puzzle';
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
  combinationToIndex,
  createPruningTable,
  cycleFour,
  flipToIndex,
  indexToCombination,
  indexToFlip,
  indexToPermutation,
  permutationToIndex,
} from './coordinate-utils.js';
import { EO_LINE_MOVE_STRINGS, EO_LINE_ROTATIONS, moveEdge } from './cross.js';
import { countFaceTurnMetric, countQuarterTurnMetric } from './metrics.js';
import { parseThreeByThreeSolverAlgorithm } from './move-utils.js';

const TURN_NAMES = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
const SUFFIXES = ['', '2', "'"] as const;
const EOLINE_SOLVED_EP = 106;
const EOLINE_TARGETS = [
  'DF DB',
  'DL DR',
  'UF UB',
  'UL UR',
  'LF LB',
  'LU LD',
  'RF RB',
  'RU RD',
  'FU FD',
  'FL FR',
  'BU BD',
  'BL BR',
] as const;

interface EOLineTables {
  readonly eom: readonly (readonly number[])[];
  readonly epm: readonly (readonly number[])[];
  readonly eod: readonly number[];
  readonly epd: readonly number[];
}

interface FaceTurn {
  readonly face: CubeFace;
  readonly amount: 1 | 2 | 3;
}

interface EOLineState {
  readonly eo: number;
  readonly ep: number;
}

let eoLineTables: EOLineTables | undefined;

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

const getLineEdgeMove = (
  combinationIndex: number,
  permutationIndex: number,
  move: number,
): number => {
  const combination = indexToCombination(combinationIndex, 2, 12);
  const permutation = indexToPermutation(permutationIndex, 2, false);
  const selectedEdges = [8, 10] as const;
  const edges = Array<number>(12).fill(-1);
  let next = 0;

  for (let position = 0; position < 12; position += 1) {
    if (combination[position] !== 0) {
      edges[position] = selectedEdges[permutation[next]];
      next += 1;
    }
  }

  if (move === 0) cycleFour(edges, 4, 7, 6, 5);
  else if (move === 1) cycleFour(edges, 8, 9, 10, 11);
  else if (move === 2) cycleFour(edges, 7, 3, 11, 2);
  else if (move === 3) cycleFour(edges, 5, 1, 9, 0);
  else if (move === 4) cycleFour(edges, 6, 2, 10, 1);
  else cycleFour(edges, 4, 0, 8, 3);

  const nextCombination = edges.map((edge) => (edge > 0 ? 1 : 0));
  const edgeMapping = [0, 1, 2, 3] as const;
  const nextPermutation: number[] = [];

  for (let position = 0; position < 12; position += 1) {
    if (nextCombination[position] !== 0) {
      nextPermutation.push(edgeMapping[edges[position] - 8]);
    }
  }

  return (
    combinationToIndex(nextCombination, 2, 12) * 2 + permutationToIndex(nextPermutation, 2, false)
  );
};

const createFilledTable = (rows: number, columns: number): number[][] =>
  Array.from({ length: rows }, () => Array<number>(columns).fill(0));

const initializeEOLineTables = (): EOLineTables => {
  if (eoLineTables) return eoLineTables;

  const eom = createFilledTable(2048, 6);
  const epm = createFilledTable(132, 6);

  for (let eo = 0; eo < 2048; eo += 1) {
    for (let move = 0; move < 6; move += 1) {
      const flips = indexToFlip(eo, 12, true);
      moveEdge(flips, move);
      eom[eo][move] = flipToIndex(flips, 12, true);
    }
  }

  for (let combination = 0; combination < 66; combination += 1) {
    for (let permutation = 0; permutation < 2; permutation += 1) {
      for (let move = 0; move < 6; move += 1) {
        epm[combination * 2 + permutation][move] = getLineEdgeMove(combination, permutation, move);
      }
    }
  }

  eoLineTables = {
    eom,
    epm,
    eod: createPruningTable(2048, [0], 7, eom, 3),
    epd: createPruningTable(132, [EOLINE_SOLVED_EP], 4, epm, 3),
  };

  return eoLineTables;
};

const applyScramble = (scramble: string, target: number, tables: EOLineTables): EOLineState => {
  let eo = 0;
  let ep = EOLINE_SOLVED_EP;
  const moveMap = EO_LINE_MOVE_STRINGS[target];

  for (const turn of parseFaceTurns(scramble)) {
    const move = moveIndex(moveMap, turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      eo = tables.eom[eo][move];
      ep = tables.epm[ep][move];
    }
  }

  return { eo, ep };
};

const applySolution = (state: EOLineState, solution: string, tables: EOLineTables): EOLineState => {
  let { eo, ep } = state;

  for (const turn of parseFaceTurns(solution)) {
    const move = moveIndex(TURN_NAMES.join(''), turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      eo = tables.eom[eo][move];
      ep = tables.epm[ep][move];
    }
  }

  return { eo, ep };
};

const searchEOLine = (
  eo: number,
  ep: number,
  depth: number,
  lastMove: number,
  tables: EOLineTables,
): readonly number[] | undefined => {
  if (depth === 0) return eo === 0 && ep === EOLINE_SOLVED_EP ? [] : undefined;
  if (tables.eod[eo] > depth || tables.epd[ep] > depth) return undefined;

  for (let move = 0; move < 6; move += 1) {
    if (move === lastMove) continue;

    let nextEo = eo;
    let nextEp = ep;

    for (let turn = 0; turn < 3; turn += 1) {
      nextEo = tables.eom[nextEo][move];
      nextEp = tables.epm[nextEp][move];

      const rest = searchEOLine(nextEo, nextEp, depth - 1, move, tables);
      if (rest) return [move * 3 + turn, ...rest];
    }
  }

  return undefined;
};

const pathToAlgorithm = (path: readonly number[]): string =>
  path.map((move) => `${TURN_NAMES[Math.floor(move / 3)]}${SUFFIXES[move % 3]}`).join(' ');

const createSolution = (
  targetIndex: number,
  path: readonly number[],
): ThreeByThreeAssistSolution => {
  const solution = pathToAlgorithm(path);

  return {
    method: 'eoline',
    target: EOLINE_TARGETS[targetIndex],
    targetLabel: EOLINE_TARGETS[targetIndex],
    setupRotation: EO_LINE_ROTATIONS[targetIndex],
    solution,
    depth: path.length,
    metric: {
      ftm: countFaceTurnMetric(solution),
      qtm: countQuarterTurnMetric(solution),
    },
  };
};

const requestedTargets = (targets: readonly string[] | undefined): readonly number[] => {
  if (!targets) return EOLINE_TARGETS.map((_, index) => index);

  return targets.map((target) => {
    const index = EOLINE_TARGETS.indexOf(target as (typeof EOLINE_TARGETS)[number]);
    if (index < 0) throw new UnknownSolverTargetError('eoline', target);

    return index;
  });
};

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

export const solveEOLine = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => {
  const tables = initializeEOLineTables();
  const maxDepth = options.maxDepth ?? 9;
  const solutions = requestedTargets(options.targets).map((target) => {
    const state = applyScramble(scramble, target, tables);
    const path = firstPath(maxDepth, (depth) =>
      searchEOLine(state.eo, state.ep, depth, -1, tables),
    );
    if (!path) throw new NoSolverSolutionError('eoline', EOLINE_TARGETS[target], maxDepth);

    return createSolution(target, path);
  });

  return { method: 'eoline', scramble, solutions };
};

export const isEOLineSolutionSolved = (
  scramble: string,
  solution: ThreeByThreeAssistSolution,
): boolean => {
  const target = EOLINE_TARGETS.indexOf(solution.target as (typeof EOLINE_TARGETS)[number]);
  if (target < 0) return false;

  const tables = initializeEOLineTables();
  const state = applySolution(applyScramble(scramble, target, tables), solution.solution, tables);

  return state.eo === 0 && state.ep === EOLINE_SOLVED_EP;
};
