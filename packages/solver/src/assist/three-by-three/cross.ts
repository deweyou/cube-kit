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
  binomial,
  createPruningTable,
  indexToPermutation,
  permutationToIndex,
} from './coordinate-utils.js';
import { countFaceTurnMetric, countQuarterTurnMetric } from './metrics.js';
import { parseThreeByThreeSolverAlgorithm } from './move-utils.js';

const TURN_NAMES = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
const SUFFIXES = ['', '2', "'"] as const;

const CROSS_SOLVED_EP = 69 * 24;
const CROSS_SOLVED_EO = 69 * 16;
const CROSS_MOVE_STRINGS = [
  ['UDLRFB', 'DURLFB', 'RLUDFB', 'LRDUFB', 'BFLRUD', 'FBLRDU'],
  ['UDLRFB', 'DURLFB', 'RLUDFB', 'LRDUFB', 'BFRLDU', 'FBRLUD'],
  ['UDLRFB', 'DURLFB', 'RLUDFB', 'LRDUFB', 'BFUDRL', 'FBUDLR'],
  ['UDLRFB', 'DURLFB', 'RLUDFB', 'LRDUFB', 'BFDULR', 'FBDURL'],
  ['UDLRFB', 'DULRBF', 'RLBFUD', 'LRFBUD', 'BFLRUD', 'FBRLUD'],
  ['UDLRFB', 'DULRBF', 'RLFBDU', 'LRBFDU', 'BFRLDU', 'FBLRDU'],
] as const;
const CROSS_ROTATIONS = [
  ['', 'z2', "z'", 'z', "x'", 'x'],
  ['z2', '', 'z', "z'", 'x', "x'"],
  ['z', "z'", '', 'z2', 'y', "y'"],
  ["z'", 'z', 'z2', '', "y'", 'y'],
  ['x', "x'", "y'", 'y', '', 'y2'],
  ["x'", 'x', 'y', "y'", 'y2', ''],
] as const;
const CROSS_TARGETS = ['D', 'U', 'L', 'R', 'F', 'B'] as const;

export const EO_LINE_MOVE_STRINGS = [
  'UDLRFB',
  'UDFBRL',
  'DURLFB',
  'DUFBLR',
  'RLUDFB',
  'RLFBDU',
  'LRDUFB',
  'LRFBUD',
  'BFLRUD',
  'BFUDRL',
  'FBLRDU',
  'FBDURL',
] as const;
export const EO_LINE_ROTATIONS = [
  '',
  'y',
  'z2',
  'z2 y',
  "z'",
  "z' y",
  'z',
  'z y',
  "x'",
  "x' y",
  'x',
  'x y',
] as const;
const EOFC_TARGETS = [
  'D(FB)',
  'D(LR)',
  'U(FB)',
  'U(LR)',
  'L(FB)',
  'L(UD)',
  'R(FB)',
  'R(UD)',
  'F(UD)',
  'F(LR)',
  'B(UD)',
  'B(LR)',
] as const;

interface CrossTables {
  readonly epm: readonly (readonly number[])[];
  readonly eom: readonly (readonly number[])[];
  readonly epd: readonly number[];
  readonly eod: readonly number[];
  readonly eofd: readonly number[];
  readonly fcm: readonly (readonly number[])[];
  readonly fem: readonly (readonly number[])[];
  readonly fecd: readonly (readonly number[])[];
}

interface FaceTurn {
  readonly face: CubeFace;
  readonly amount: 1 | 2 | 3;
}

interface CrossState {
  readonly ep: number;
  readonly eo: number;
}

interface XCrossState extends CrossState {
  readonly co: readonly number[];
  readonly feo: readonly number[];
}

interface EOFCState extends CrossState {
  readonly eof: number;
}

let crossTables: CrossTables | undefined;

const cycleEdge = (
  edges: number[],
  first: number,
  second: number,
  third: number,
  fourth: number,
  orientation: 0 | 1,
): void => {
  const edge = edges[first];
  edges[first] = edges[fourth] ^ orientation;
  edges[fourth] = edges[third] ^ orientation;
  edges[third] = edges[second] ^ orientation;
  edges[second] = edge ^ orientation;
};

export const moveEdge = (edges: number[], move: number): void => {
  if (move === 0) cycleEdge(edges, 0, 1, 2, 3, 0);
  else if (move === 1) cycleEdge(edges, 4, 7, 6, 5, 0);
  else if (move === 2) cycleEdge(edges, 2, 9, 6, 10, 0);
  else if (move === 3) cycleEdge(edges, 0, 11, 4, 8, 0);
  else if (move === 4) cycleEdge(edges, 1, 8, 5, 9, 1);
  else cycleEdge(edges, 3, 10, 7, 11, 1);
};

const indexToCrossCombination = (
  index: number,
  permutation: readonly number[],
  orientation: number,
): number[] => {
  const edges = Array<number>(12).fill(-1);
  let remaining = 4;
  let nextOrientation = orientation;

  for (let position = 0; position < 12; position += 1) {
    if (index >= binomial(11 - position, remaining)) {
      index -= binomial(11 - position, remaining);
      remaining -= 1;
      edges[position] = (permutation[remaining] << 1) | (nextOrientation & 1);
      nextOrientation >>= 1;
    }
  }

  return edges;
};

const getCrossMove = (combination: number, permutationIndex: number, move: number): number => {
  const permutation = indexToPermutation(permutationIndex, 4, false);
  const edges = indexToCrossCombination(combination, permutation, permutationIndex);
  moveEdge(edges, move);

  let nextCombination = 0;
  let nextOrientation = 0;
  let remaining = 4;

  for (let position = 0; position < 12; position += 1) {
    if (edges[position] >= 0) {
      nextCombination += binomial(11 - position, remaining);
      remaining -= 1;
      permutation[remaining] = edges[position] >> 1;
      nextOrientation |= (edges[position] & 1) << (3 - remaining);
    }
  }

  return (
    ((24 * nextCombination + permutationToIndex(permutation, 4, false)) << 4) | nextOrientation
  );
};

const createFilledTable = (rows: number, columns: number): number[][] =>
  Array.from({ length: rows }, () => Array<number>(columns).fill(0));

const initializeCrossTables = (): CrossTables => {
  if (crossTables) return crossTables;

  const epm = createFilledTable(11880, 6);
  const eom = createFilledTable(7920, 6);

  for (let combination = 0; combination < 495; combination += 1) {
    for (let permutation = 0; permutation < 24; permutation += 1) {
      for (let move = 0; move < 6; move += 1) {
        const next = getCrossMove(combination, permutation, move);
        epm[24 * combination + permutation][move] = next >> 4;

        if (permutation < 16) {
          eom[16 * combination + permutation][move] = (Math.floor(next / 384) << 4) | (next & 15);
        }
      }
    }
  }

  const epd = createPruningTable(11880, [CROSS_SOLVED_EP], 6, epm, 3);
  const eod = createPruningTable(7920, [CROSS_SOLVED_EO], 7, eom, 3);
  const eofd = createPruningTable(
    7920,
    Array.from({ length: 495 }, (_, index) => index << 4),
    4,
    eom,
    3,
  );

  const fcm = createFilledTable(24, 6);
  const fem = createFilledTable(24, 6);
  const cornerPermutationMoves = [
    [1, 0, 3, 0, 0, 4],
    [2, 1, 1, 5, 1, 0],
    [3, 2, 2, 1, 6, 2],
    [0, 3, 7, 3, 2, 3],
    [4, 7, 0, 4, 4, 5],
    [5, 4, 5, 6, 5, 1],
    [6, 5, 6, 2, 7, 6],
    [7, 6, 4, 7, 3, 7],
  ];
  const cornerOrientationMoves = [
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
        fcm[corner * 3 + orientation][move] =
          cornerPermutationMoves[corner][move] * 3 +
          ((cornerOrientationMoves[corner][move] + orientation) % 3);
      }
    }
  }

  const firstEdgePermutationMoves = [
    [0, 0, 7, 0, 0, 8],
    [1, 1, 1, 9, 1, 4],
    [2, 2, 2, 5, 10, 2],
    [3, 3, 11, 3, 6, 3],
    [5, 4, 4, 4, 4, 0],
    [6, 5, 5, 1, 5, 5],
    [7, 6, 6, 6, 2, 6],
    [4, 7, 3, 7, 7, 7],
    [8, 11, 8, 8, 8, 1],
    [9, 8, 9, 2, 9, 9],
    [10, 9, 10, 10, 3, 10],
    [11, 10, 0, 11, 11, 11],
  ];
  const firstEdgeOrientationMoves = [
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0],
  ];

  for (let edge = 0; edge < 12; edge += 1) {
    for (let orientation = 0; orientation < 2; orientation += 1) {
      for (let move = 0; move < 6; move += 1) {
        fem[edge * 2 + orientation][move] =
          firstEdgePermutationMoves[edge][move] * 2 +
          (firstEdgeOrientationMoves[edge][move] ^ orientation);
      }
    }
  }

  const fecd = Array.from({ length: 4 }, (_, slot) => {
    const table = Array<number>(576).fill(-1);
    table[slot * 51 + 12] = 0;

    for (let depth = 0; depth < 6; depth += 1) {
      for (let index = 0; index < 576; index += 1) {
        if (table[index] !== depth) continue;

        for (let move = 0; move < 6; move += 1) {
          let next = index;

          for (let turn = 0; turn < 3; turn += 1) {
            next = 24 * fem[Math.floor(next / 24)][move] + fcm[next % 24][move];

            if (table[next] < 0) table[next] = depth + 1;
          }
        }
      }
    }

    return table;
  });

  crossTables = { epm, eom, epd, eod, eofd, fcm, fem, fecd };

  return crossTables;
};

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

const applyCrossScramble = (scramble: string, face: number, tables: CrossTables): CrossState => {
  let ep = CROSS_SOLVED_EP;
  let eo = CROSS_SOLVED_EO;
  const moveMap = CROSS_MOVE_STRINGS[0][face];

  for (const turn of parseFaceTurns(scramble)) {
    const move = moveIndex(moveMap, turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      ep = tables.epm[ep][move];
      eo = tables.eom[eo][move];
    }
  }

  return { ep, eo };
};

const applyXCrossScramble = (scramble: string, face: number, tables: CrossTables): XCrossState => {
  let ep = CROSS_SOLVED_EP;
  let eo = CROSS_SOLVED_EO;
  const co = [12, 15, 18, 21];
  const feo = [0, 2, 4, 6];
  const moveMap = CROSS_MOVE_STRINGS[0][face];

  for (const turn of parseFaceTurns(scramble)) {
    const move = moveIndex(moveMap, turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      for (let slot = 0; slot < 4; slot += 1) {
        co[slot] = tables.fcm[co[slot]][move];
        feo[slot] = tables.fem[feo[slot]][move];
      }

      ep = tables.epm[ep][move];
      eo = tables.eom[eo][move];
    }
  }

  return { ep, eo, co, feo };
};

const applyEOFCScramble = (scramble: string, side: number, tables: CrossTables): EOFCState => {
  let ep = CROSS_SOLVED_EP;
  let eo = CROSS_SOLVED_EO;
  let eof = 0;
  const moveMap = EO_LINE_MOVE_STRINGS[side];

  for (const turn of parseFaceTurns(scramble)) {
    const move = moveIndex(moveMap, turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      ep = tables.epm[ep][move];
      eo = tables.eom[eo][move];
      eof = tables.eom[eof][move];
    }
  }

  return { ep, eo, eof };
};

const applyCrossSolution = (
  state: CrossState,
  solution: string,
  tables: CrossTables,
): CrossState => {
  let { ep, eo } = state;

  for (const turn of parseFaceTurns(solution)) {
    const move = moveIndex(TURN_NAMES.join(''), turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      ep = tables.epm[ep][move];
      eo = tables.eom[eo][move];
    }
  }

  return { ep, eo };
};

const applyXCrossSolution = (
  state: XCrossState,
  solution: string,
  tables: CrossTables,
): XCrossState => {
  let { ep, eo } = state;
  const co = [...state.co];
  const feo = [...state.feo];

  for (const turn of parseFaceTurns(solution)) {
    const move = moveIndex(TURN_NAMES.join(''), turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      for (let slot = 0; slot < 4; slot += 1) {
        co[slot] = tables.fcm[co[slot]][move];
        feo[slot] = tables.fem[feo[slot]][move];
      }

      ep = tables.epm[ep][move];
      eo = tables.eom[eo][move];
    }
  }

  return { ep, eo, co, feo };
};

const applyEOFCSolution = (state: EOFCState, solution: string, tables: CrossTables): EOFCState => {
  let { ep, eo, eof } = state;

  for (const turn of parseFaceTurns(solution)) {
    const move = moveIndex(TURN_NAMES.join(''), turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      ep = tables.epm[ep][move];
      eo = tables.eom[eo][move];
      eof = tables.eom[eof][move];
    }
  }

  return { ep, eo, eof };
};

const searchCross = (
  ep: number,
  eo: number,
  depth: number,
  lastMove: number,
  tables: CrossTables,
): readonly number[] | undefined => {
  if (depth === 0) return ep === CROSS_SOLVED_EP && eo === CROSS_SOLVED_EO ? [] : undefined;
  if (tables.epd[ep] > depth || tables.eod[eo] > depth) return undefined;

  for (let move = 0; move < 6; move += 1) {
    if (move === lastMove) continue;

    let nextEp = ep;
    let nextEo = eo;

    for (let turn = 0; turn < 3; turn += 1) {
      nextEp = tables.epm[nextEp][move];
      nextEo = tables.eom[nextEo][move];

      const rest = searchCross(nextEp, nextEo, depth - 1, move, tables);
      if (rest) return [move * 3 + turn, ...rest];
    }
  }

  return undefined;
};

const searchEOFC = (
  ep: number,
  eo: number,
  eof: number,
  depth: number,
  lastMove: number,
  tables: CrossTables,
): readonly number[] | undefined => {
  if (depth === 0) {
    return ep === CROSS_SOLVED_EP && eo === CROSS_SOLVED_EO && (eof & 15) === 0 ? [] : undefined;
  }
  if (tables.epd[ep] > depth || tables.eod[eo] > depth || tables.eofd[eof] > depth) {
    return undefined;
  }

  for (let move = 0; move < 6; move += 1) {
    if (move === lastMove) continue;

    let nextEp = ep;
    let nextEo = eo;
    let nextEof = eof;

    for (let turn = 0; turn < 3; turn += 1) {
      nextEp = tables.epm[nextEp][move];
      nextEo = tables.eom[nextEo][move];
      nextEof = tables.eom[nextEof][move];

      const rest = searchEOFC(nextEp, nextEo, nextEof, depth - 1, move, tables);
      if (rest) return [move * 3 + turn, ...rest];
    }
  }

  return undefined;
};

const searchXCross = (
  state: Omit<XCrossState, 'co' | 'feo'> & { readonly co: number; readonly feo: number },
  slot: number,
  depth: number,
  lastMove: number,
  tables: CrossTables,
): readonly number[] | undefined => {
  if (depth === 0) {
    return state.ep === CROSS_SOLVED_EP &&
      state.eo === CROSS_SOLVED_EO &&
      state.co === (slot + 4) * 3 &&
      state.feo === slot * 2
      ? []
      : undefined;
  }
  if (
    tables.epd[state.ep] > depth ||
    tables.eod[state.eo] > depth ||
    tables.fecd[slot][state.feo * 24 + state.co] > depth
  ) {
    return undefined;
  }

  for (let move = 0; move < 6; move += 1) {
    if (move === lastMove) continue;

    let nextEp = state.ep;
    let nextEo = state.eo;
    let nextCo = state.co;
    let nextFeo = state.feo;

    for (let turn = 0; turn < 3; turn += 1) {
      nextCo = tables.fcm[nextCo][move];
      nextFeo = tables.fem[nextFeo][move];
      nextEp = tables.epm[nextEp][move];
      nextEo = tables.eom[nextEo][move];

      const rest = searchXCross(
        { ep: nextEp, eo: nextEo, co: nextCo, feo: nextFeo },
        slot,
        depth - 1,
        move,
        tables,
      );
      if (rest) return [move * 3 + turn, ...rest];
    }
  }

  return undefined;
};

const pathToAlgorithm = (path: readonly number[]): string =>
  path.map((move) => `${TURN_NAMES[Math.floor(move / 3)]}${SUFFIXES[move % 3]}`).join(' ');

const createSolution = ({
  method,
  target,
  targetLabel,
  setupRotation,
  path,
}: {
  readonly method: ThreeByThreeAssistSolution['method'];
  readonly target: string;
  readonly targetLabel: string;
  readonly setupRotation: string;
  readonly path: readonly number[];
}): ThreeByThreeAssistSolution => {
  const solution = pathToAlgorithm(path);

  return {
    method,
    target,
    targetLabel,
    setupRotation,
    solution,
    depth: path.length,
    metric: {
      ftm: countFaceTurnMetric(solution),
      qtm: countQuarterTurnMetric(solution),
    },
  };
};

const requestedTargetIndexes = (
  method: string,
  allTargets: readonly string[],
  targets: readonly string[] | undefined,
): readonly number[] => {
  if (!targets) return allTargets.map((_, index) => index);

  return targets.map((target) => {
    const index = allTargets.indexOf(target);
    if (index < 0) throw new UnknownSolverTargetError(method, target);

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

export const solveCross = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => {
  const tables = initializeCrossTables();
  const solutions = requestedTargetIndexes('cross', CROSS_TARGETS, options.targets).map((face) => {
    const state = applyCrossScramble(scramble, face, tables);
    const maxDepth = options.maxDepth ?? 8;
    const path = firstPath(maxDepth, (depth) => searchCross(state.ep, state.eo, depth, -1, tables));
    if (!path) throw new NoSolverSolutionError('cross', CROSS_TARGETS[face], maxDepth);

    return createSolution({
      method: 'cross',
      target: CROSS_TARGETS[face],
      targetLabel: `Cross(${CROSS_TARGETS[face]})`,
      setupRotation: CROSS_ROTATIONS[0][face],
      path,
    });
  });

  return { method: 'cross', scramble, solutions };
};

export const solveXCross = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => {
  const tables = initializeCrossTables();
  const solutions = requestedTargetIndexes('xcross', CROSS_TARGETS, options.targets).map((face) => {
    const state = applyXCrossScramble(scramble, face, tables);
    const maxDepth = options.maxDepth ?? 10;

    for (let depth = 0; depth <= maxDepth; depth += 1) {
      for (let slot = 0; slot < 4; slot += 1) {
        const path = searchXCross(
          { ep: state.ep, eo: state.eo, co: state.co[slot], feo: state.feo[slot] },
          slot,
          depth,
          -1,
          tables,
        );
        if (path) {
          return createSolution({
            method: 'xcross',
            target: CROSS_TARGETS[face],
            targetLabel: `XCross(${CROSS_TARGETS[face]})`,
            setupRotation: CROSS_ROTATIONS[0][face],
            path,
          });
        }
      }
    }

    throw new NoSolverSolutionError('xcross', CROSS_TARGETS[face], maxDepth);
  });

  return { method: 'xcross', scramble, solutions };
};

export const solveEOFC = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => {
  const tables = initializeCrossTables();
  const solutions = requestedTargetIndexes('eofc', EOFC_TARGETS, options.targets).map((side) => {
    const state = applyEOFCScramble(scramble, side, tables);
    const maxDepth = options.maxDepth ?? 12;
    const path = firstPath(maxDepth, (depth) =>
      searchEOFC(state.ep, state.eo, state.eof, depth, -1, tables),
    );
    if (!path) throw new NoSolverSolutionError('eofc', EOFC_TARGETS[side], maxDepth);

    return createSolution({
      method: 'eofc',
      target: EOFC_TARGETS[side],
      targetLabel: EOFC_TARGETS[side],
      setupRotation: EO_LINE_ROTATIONS[side],
      path,
    });
  });

  return { method: 'eofc', scramble, solutions };
};

export const isCrossSolutionSolved = (
  scramble: string,
  solution: ThreeByThreeAssistSolution,
): boolean => {
  const face = CROSS_TARGETS.indexOf(solution.target as (typeof CROSS_TARGETS)[number]);
  if (face < 0) return false;

  const tables = initializeCrossTables();
  const state = applyCrossSolution(
    applyCrossScramble(scramble, face, tables),
    solution.solution,
    tables,
  );

  return state.ep === CROSS_SOLVED_EP && state.eo === CROSS_SOLVED_EO;
};

export const isXCrossSolutionSolved = (
  scramble: string,
  solution: ThreeByThreeAssistSolution,
): boolean => {
  const face = CROSS_TARGETS.indexOf(solution.target as (typeof CROSS_TARGETS)[number]);
  if (face < 0) return false;

  const tables = initializeCrossTables();
  const state = applyXCrossSolution(
    applyXCrossScramble(scramble, face, tables),
    solution.solution,
    tables,
  );

  return (
    state.ep === CROSS_SOLVED_EP &&
    state.eo === CROSS_SOLVED_EO &&
    state.co.some((corner, slot) => corner === (slot + 4) * 3 && state.feo[slot] === slot * 2)
  );
};

export const isEOFCSolutionSolved = (
  scramble: string,
  solution: ThreeByThreeAssistSolution,
): boolean => {
  const side = EOFC_TARGETS.indexOf(solution.target as (typeof EOFC_TARGETS)[number]);
  if (side < 0) return false;

  const tables = initializeCrossTables();
  const state = applyEOFCSolution(
    applyEOFCScramble(scramble, side, tables),
    solution.solution,
    tables,
  );

  return state.ep === CROSS_SOLVED_EP && state.eo === CROSS_SOLVED_EO && (state.eof & 15) === 0;
};
