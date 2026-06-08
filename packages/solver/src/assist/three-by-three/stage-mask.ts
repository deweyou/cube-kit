import { NoSolverSolutionError, UnknownSolverTargetError } from '../../errors.js';
import type {
  ThreeByThreeAssistMethod,
  ThreeByThreeAssistOptions,
  ThreeByThreeAssistResult,
  ThreeByThreeAssistSolution,
} from '../../types.js';
import { SearchWCA } from '../../full/min2phase/search-wca.js';
import { countFaceTurnMetric, countQuarterTurnMetric } from './metrics.js';
import { parseThreeByThreeSolverAlgorithm } from './move-utils.js';

const SOLVED_FACELETS = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
const MOVE_NAMES = 'URFDLBurfdlbMESxyz';
const SUFFIXES = ['', '2', "'"] as const;
const DEFAULT_STAGE_MAX_DEPTH = 10;
const DEFAULT_BLOCK_222_MAX_DEPTH = 8;
const DEFAULT_TWO_PHASE_MAX_DEPTH = 30;
const DEFAULT_GENERAL_MAX_DEPTH = 10;
const MAX_PRUNING_SIZE = 100_000;

type StageMethod = 'cfop-f2l' | 'roux-s2' | 'petrus-s2' | 'zz-f2l' | 'eo-dr';
type StageMoveMap = Readonly<Record<string, number>>;
type StageStepMap = Readonly<Record<string, number>>;
type SolverMap = Record<string, MaskSolver>;

interface StageMeta {
  readonly move: StageMoveMap;
  readonly maxDepth?: number;
  readonly firstMoves?: readonly string[];
  readonly head: string;
  readonly step: StageStepMap;
}

const appendSuffix = (
  moves: Readonly<Record<string, number>>,
  suffixes: readonly string[] = SUFFIXES,
): StageMoveMap => {
  const result: Record<string, number> = {};

  for (const [move, axisFace] of Object.entries(moves)) {
    for (const suffix of suffixes) {
      result[`${move}${suffix}`] = axisFace;
    }
  }

  return result;
};

const MOVES = appendSuffix({
  U: 0x00,
  R: 0x11,
  F: 0x22,
  D: 0x30,
  L: 0x41,
  B: 0x52,
});

const MOVES_WITHOUT_D = appendSuffix({
  U: 0x00,
  R: 0x11,
  F: 0x22,
  L: 0x41,
  B: 0x52,
});

const MOVES_ROUX_SB = appendSuffix({
  U: 0x00,
  R: 0x11,
  M: 0x61,
  r: 0x71,
});

const MOVES_ZZ_F2L = appendSuffix({
  U: 0x00,
  R: 0x11,
  L: 0x41,
});

const MOVE_DATA: readonly (readonly (readonly number[])[])[] = [
  [
    [0, 2, 8, 6],
    [1, 5, 7, 3],
    [18, 36, 45, 9],
    [19, 37, 46, 10],
    [20, 38, 47, 11],
  ],
  [
    [9, 11, 17, 15],
    [10, 14, 16, 12],
    [2, 51, 29, 20],
    [5, 48, 32, 23],
    [8, 45, 35, 26],
  ],
  [
    [18, 20, 26, 24],
    [19, 23, 25, 21],
    [6, 9, 29, 44],
    [7, 12, 28, 41],
    [8, 15, 27, 38],
  ],
  [
    [27, 29, 35, 33],
    [28, 32, 34, 30],
    [24, 15, 51, 42],
    [25, 16, 52, 43],
    [26, 17, 53, 44],
  ],
  [
    [36, 38, 44, 42],
    [37, 41, 43, 39],
    [0, 18, 27, 53],
    [3, 21, 30, 50],
    [6, 24, 33, 47],
  ],
  [
    [45, 47, 53, 51],
    [46, 50, 52, 48],
    [2, 36, 33, 17],
    [1, 39, 34, 14],
    [0, 42, 35, 11],
  ],
  [
    [0, 2, 8, 6],
    [1, 5, 7, 3],
    [18, 36, 45, 9],
    [19, 37, 46, 10],
    [20, 38, 47, 11],
    [21, 39, 48, 12],
    [22, 40, 49, 13],
    [23, 41, 50, 14],
  ],
  [
    [9, 11, 17, 15],
    [10, 14, 16, 12],
    [2, 51, 29, 20],
    [5, 48, 32, 23],
    [8, 45, 35, 26],
    [1, 52, 28, 19],
    [4, 49, 31, 22],
    [7, 46, 34, 25],
  ],
  [
    [18, 20, 26, 24],
    [19, 23, 25, 21],
    [6, 9, 29, 44],
    [7, 12, 28, 41],
    [8, 15, 27, 38],
    [3, 10, 32, 43],
    [4, 13, 31, 40],
    [5, 16, 30, 37],
  ],
  [
    [27, 29, 35, 33],
    [28, 32, 34, 30],
    [24, 15, 51, 42],
    [25, 16, 52, 43],
    [26, 17, 53, 44],
    [21, 12, 48, 39],
    [22, 13, 49, 40],
    [23, 14, 50, 41],
  ],
  [
    [36, 38, 44, 42],
    [37, 41, 43, 39],
    [0, 18, 27, 53],
    [3, 21, 30, 50],
    [6, 24, 33, 47],
    [1, 19, 28, 52],
    [4, 22, 31, 49],
    [7, 25, 34, 46],
  ],
  [
    [45, 47, 53, 51],
    [46, 50, 52, 48],
    [2, 36, 33, 17],
    [1, 39, 34, 14],
    [0, 42, 35, 11],
    [5, 37, 30, 16],
    [4, 40, 31, 13],
    [3, 43, 32, 10],
  ],
  [
    [1, 19, 28, 52],
    [4, 22, 31, 49],
    [7, 25, 34, 46],
  ],
  [
    [21, 12, 48, 39],
    [22, 13, 49, 40],
    [23, 14, 50, 41],
  ],
  [
    [3, 10, 32, 43],
    [4, 13, 31, 40],
    [5, 16, 30, 37],
  ],
  [
    [9, 11, 17, 15],
    [10, 14, 16, 12],
    [2, 51, 29, 20],
    [5, 48, 32, 23],
    [8, 45, 35, 26],
    [36, 42, 44, 38],
    [37, 39, 43, 41],
    [0, 53, 27, 18],
    [3, 50, 30, 21],
    [6, 47, 33, 24],
    [1, 52, 28, 19],
    [4, 49, 31, 22],
    [7, 46, 34, 25],
  ],
  [
    [0, 2, 8, 6],
    [1, 5, 7, 3],
    [18, 36, 45, 9],
    [19, 37, 46, 10],
    [20, 38, 47, 11],
    [27, 33, 35, 29],
    [28, 30, 34, 32],
    [24, 42, 51, 15],
    [25, 43, 52, 16],
    [26, 44, 53, 17],
    [21, 39, 48, 12],
    [22, 40, 49, 13],
    [23, 41, 50, 14],
  ],
  [
    [18, 20, 26, 24],
    [19, 23, 25, 21],
    [6, 9, 29, 44],
    [7, 12, 28, 41],
    [8, 15, 27, 38],
    [45, 51, 53, 47],
    [46, 48, 52, 50],
    [2, 17, 33, 36],
    [1, 14, 34, 39],
    [0, 11, 35, 42],
    [3, 10, 32, 43],
    [4, 13, 31, 40],
    [5, 16, 30, 37],
  ],
];

class MaskSolver {
  private readonly solvedStates: readonly string[];
  private readonly doMove: (state: string, move: string) => string | undefined;
  private readonly movesList: readonly (readonly [string, number])[];
  private readonly pruningTable = new Map<string, number>();
  private toUpdate: string[] | undefined;
  private pruningTableSize = 0;
  private pruningDepth = -1;
  private previousSize = 0;
  private cost = 0;
  private state = '';
  private maxDepth = 0;
  private solutionMoveIndexes: number[] = [];
  private previousSolutionKey: string | undefined;
  private currentSolution: readonly string[] | undefined;
  private subOptimal = false;
  private visited = new Map<string, number>();

  constructor(
    solvedStates: readonly string[],
    doMove: (state: string, move: string) => string | undefined,
    moves: StageMoveMap,
  ) {
    this.solvedStates = solvedStates;
    this.doMove = doMove;
    this.movesList = Object.entries(moves);
  }

  search(state: string, minDepth = 0, maxDepth?: number): readonly string[] | undefined {
    this.solutionMoveIndexes = [];
    this.currentSolution = undefined;
    this.previousSolutionKey = undefined;
    this.subOptimal = false;
    this.state = state;
    this.visited = new Map<string, number>();
    this.maxDepth = minDepth;

    return this.searchNext(maxDepth);
  }

  private updatePruning(targetDepth = this.pruningDepth + 1): void {
    for (let depth = this.pruningDepth + 1; depth <= targetDepth; depth += 1) {
      if (this.previousSize >= MAX_PRUNING_SIZE) break;

      if (depth < 1) {
        this.previousSize = 0;

        for (const state of this.solvedStates) {
          if (!this.pruningTable.has(state)) {
            this.pruningTable.set(state, depth);
            this.pruningTableSize += 1;
          }
        }
      } else {
        this.updatePruningBfs(depth - 1);
      }

      if (this.cost === 0) return;

      this.pruningDepth = depth;
      this.previousSize = this.pruningTableSize;
    }
  }

  private updatePruningBfs(fromDepth: number): void {
    if (this.toUpdate === undefined) {
      this.toUpdate = [];

      for (const [state, depth] of this.pruningTable.entries()) {
        if (depth === fromDepth) this.toUpdate.push(state);
      }
    }

    while (this.toUpdate.length > 0) {
      const state = this.toUpdate.pop();
      if (state === undefined) continue;

      for (const [move] of this.movesList) {
        const nextState = this.doMove(state, move);
        if (!nextState || this.pruningTable.has(nextState)) continue;

        this.pruningTable.set(nextState, fromDepth + 1);
        this.pruningTableSize += 1;
      }

      if (this.cost >= 0) {
        if (this.cost === 0) return;
        this.cost -= 1;
      }
    }

    this.toUpdate = undefined;
  }

  private searchNext(maxDepth?: number, cost = -1): readonly string[] | undefined {
    const limit = maxDepth === undefined ? 99 : maxDepth + 1;
    this.previousSolutionKey = this.currentSolution?.join(',');
    this.currentSolution = undefined;
    this.cost = cost;

    for (; this.maxDepth < limit; this.maxDepth += 1) {
      this.updatePruning(Math.ceil(this.maxDepth / 2));

      if (this.cost === 0) return undefined;
      if (this.idaSearch(this.state, this.maxDepth, undefined, 0)) break;
    }

    return this.currentSolution;
  }

  private pruningDepthFor(state: string): number {
    return this.pruningTable.get(state) ?? this.pruningDepth + 1;
  }

  private idaSearch(
    state: string,
    remainingDepth: number,
    lastMoveIndex: number | undefined,
    depth: number,
  ): boolean {
    if (this.pruningDepthFor(state) > remainingDepth) return false;

    if (remainingDepth === 0) {
      if (!this.solvedStates.includes(state)) return false;

      const solution = this.solutionMoveIndexes.map(
        (moveIndex) => this.movesList[moveIndex]?.[0] ?? '',
      );
      const solutionKey = solution.join(',');

      this.subOptimal = true;
      if (solutionKey === this.previousSolutionKey) return false;

      this.currentSolution = solution;
      return true;
    }

    if (!this.subOptimal) {
      const visitedDepth = this.visited.get(state);
      if (visitedDepth !== undefined && visitedDepth < depth) return false;
      this.visited.set(state, depth);
    }

    if (this.cost >= 0) {
      if (this.cost === 0) return true;
      this.cost -= 1;
    }

    const lastMove = lastMoveIndex === undefined ? '' : (this.movesList[lastMoveIndex]?.[0] ?? '');
    const lastAxisFace =
      lastMoveIndex === undefined ? -1 : (this.movesList[lastMoveIndex]?.[1] ?? -1);
    const startMoveIndex = this.solutionMoveIndexes[depth] ?? 0;

    for (let moveIndex = startMoveIndex; moveIndex < this.movesList.length; moveIndex += 1) {
      const moveArgs = this.movesList[moveIndex];
      if (moveArgs === undefined) continue;

      const [move, moveAxisFace] = moveArgs;
      const axisFace = moveAxisFace ^ lastAxisFace;

      if (axisFace === 0 || ((axisFace & 0xf) === 0 && move <= lastMove)) continue;

      const nextState = this.doMove(state, move);
      if (!nextState || nextState === state) continue;

      this.solutionMoveIndexes[depth] = moveIndex;
      if (this.idaSearch(nextState, remainingDepth - 1, moveIndex, depth + 1)) return true;
      this.solutionMoveIndexes.pop();
    }

    return false;
  }
}

const acycle = (values: string[], permutation: readonly number[], power: number): void => {
  const snapshot = permutation.map((index) => values[index] ?? '');

  for (let index = 0; index < permutation.length; index += 1) {
    const target = permutation[(index + power) % permutation.length];
    if (target === undefined) continue;

    values[target] = snapshot[index] ?? '';
  }
};

const movePower = (move: string): number => {
  if (move.endsWith('2')) return 2;
  if (move.endsWith("'")) return 3;

  return 1;
};

const cubeMove = (state: string, move: string): string | undefined => {
  const moveIndex = MOVE_NAMES.indexOf(move[0] ?? '');
  const swaps = MOVE_DATA[moveIndex];
  if (swaps === undefined) return undefined;

  const next = state.split('');
  const power = movePower(move);

  for (const swap of swaps) {
    acycle(next, swap, power);
  }

  return next.join('');
};

const parseStageScramble = (scramble: string): readonly string[] =>
  parseThreeByThreeSolverAlgorithm(scramble).map((move) => {
    if (move.amount === 2) return `${move.face}2`;
    if (move.amount === 3) return `${move.face}'`;

    return move.face;
  });

const applyMoves = (state: string, moves: readonly string[]): string => {
  let nextState = state;

  for (const move of moves) {
    nextState = cubeMove(nextState, move) ?? nextState;
  }

  return nextState;
};

const stateInit = (
  state: string,
  scrambleMoves: readonly string[],
  priorSolutionMoves: readonly string[],
): string => applyMoves(applyMoves(state, scrambleMoves), priorSolutionMoves);

const stringifyMoves = (moves: readonly string[]): string => moves.join(' ').trim();

const createStageSolution = <Method extends ThreeByThreeAssistMethod>(
  method: Method,
  target: string,
  targetLabel: string,
  moves: readonly string[],
): ThreeByThreeAssistSolution => {
  const solution = stringifyMoves(moves);

  return {
    method,
    target,
    targetLabel,
    setupRotation: '',
    solution,
    depth: moves.length,
    metric: {
      ftm: countFaceTurnMetric(solution),
      qtm: countQuarterTurnMetric(solution),
    },
  };
};

const createSolvers = (stage: StageMeta): SolverMap => {
  const solvers: SolverMap = {};

  for (const solvedState of Object.keys(stage.step)) {
    solvers[solvedState] = new MaskSolver([solvedState], cubeMove, stage.move);
  }

  return solvers;
};

const solveParallel = (
  solvers: SolverMap,
  maps: StageStepMap,
  firstMoves: readonly string[],
  mask: number,
  maxDepth: number,
  scrambleMoves: readonly string[],
  priorSolutionMoves: readonly string[],
): readonly [readonly string[] | undefined, number] => {
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    for (const [solvedState, solver] of Object.entries(solvers)) {
      const solvedMask = maps[solvedState];
      if (solvedMask === undefined || (solvedMask | mask) !== solvedMask) continue;

      const state = stateInit(solvedState, scrambleMoves, priorSolutionMoves);
      const solution = solver.search(state, 0, depth);

      if (solution !== undefined) return [solution, mask | solvedMask];

      for (const firstMove of firstMoves) {
        const firstState = cubeMove(state, firstMove);
        if (firstState === undefined) continue;

        const firstMoveSolution = solver.search(firstState, 0, depth);
        if (firstMoveSolution !== undefined) {
          return [[firstMove, ...firstMoveSolution], mask | solvedMask];
        }
      }
    }
  }

  return [undefined, mask];
};

const solveStepByStep = (
  method: StageMethod,
  scramble: string,
  stages: readonly StageMeta[],
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => {
  const scrambleMoves = parseStageScramble(scramble);
  const priorSolutionMoves: string[] = [];
  const solutions: ThreeByThreeAssistSolution[] = [];
  let mask = 0;

  for (const stage of stages) {
    const maxDepth = options.maxDepth ?? stage.maxDepth ?? DEFAULT_STAGE_MAX_DEPTH;
    const [moves, nextMask] = solveParallel(
      createSolvers(stage),
      stage.step,
      stage.firstMoves ?? [],
      mask,
      maxDepth,
      scrambleMoves,
      priorSolutionMoves,
    );

    if (moves === undefined) {
      throw new NoSolverSolutionError(method, stage.head, maxDepth);
    }

    solutions.push(createStageSolution(method, stage.head, stage.head, moves));
    priorSolutionMoves.push(...moves);
    mask = nextMask;
  }

  return { method, scramble, solutions };
};

const CFOP_F2L_META: readonly StageMeta[] = [
  {
    move: MOVES,
    maxDepth: 8,
    head: 'Cross',
    step: {
      '----U--------R--R-----F--F--D-DDD-D-----L--L-----B--B-': 0x0,
    },
  },
  {
    move: MOVES_WITHOUT_D,
    head: 'F2L-1',
    step: {
      '----U-------RR-RR-----FF-FF-DDDDD-D-----L--L-----B--B-': 0x1,
      '----U--------R--R----FF-FF-DD-DDD-D-----LL-LL----B--B-': 0x2,
      '----U--------RR-RR----F--F--D-DDD-DD----L--L----BB-BB-': 0x4,
      '----U--------R--R-----F--F--D-DDDDD----LL-LL-----BB-BB': 0x8,
    },
  },
  {
    move: MOVES_WITHOUT_D,
    head: 'F2L-2',
    step: {
      '----U-------RR-RR----FFFFFFDDDDDD-D-----LL-LL----B--B-': 0x3,
      '----U-------RRRRRR----FF-FF-DDDDD-DD----L--L----BB-BB-': 0x5,
      '----U--------RR-RR---FF-FF-DD-DDD-DD----LL-LL---BB-BB-': 0x6,
      '----U-------RR-RR-----FF-FF-DDDDDDD----LL-LL-----BB-BB': 0x9,
      '----U--------R--R----FF-FF-DD-DDDDD----LLLLLL----BB-BB': 0xa,
      '----U--------RR-RR----F--F--D-DDDDDD---LL-LL----BBBBBB': 0xc,
    },
  },
  {
    move: MOVES_WITHOUT_D,
    head: 'F2L-3',
    step: {
      '----U-------RRRRRR---FFFFFFDDDDDD-DD----LL-LL---BB-BB-': 0x7,
      '----U-------RR-RR----FFFFFFDDDDDDDD----LLLLLL----BB-BB': 0xb,
      '----U-------RRRRRR----FF-FF-DDDDDDDD---LL-LL----BBBBBB': 0xd,
      '----U--------RR-RR---FF-FF-DD-DDDDDD---LLLLLL---BBBBBB': 0xe,
    },
  },
  {
    move: MOVES_WITHOUT_D,
    head: 'F2L-4',
    step: {
      '----U-------RRRRRR---FFFFFFDDDDDDDDD---LLLLLL---BBBBBB': 0xf,
    },
  },
];

const ROUX_S2_META: readonly StageMeta[] = [
  {
    move: MOVES,
    maxDepth: 10,
    firstMoves: ['x', 'x2', "x'"],
    head: 'Step 1',
    step: {
      '---------------------F--F--D--D--D-----LLLLLL-----B--B': 0x0,
    },
  },
  {
    move: MOVES_ROUX_SB,
    maxDepth: 16,
    head: 'Step 2',
    step: {
      '------------RRRRRR---F-FF-FD-DD-DD-D---LLLLLL---B-BB-B': 0x1,
    },
  },
];

const PETRUS_S2_META: readonly StageMeta[] = [
  {
    move: MOVES,
    maxDepth: 8,
    head: '2x2x2',
    step: {
      '---------------------FF-FF-DD-DD--------LL-LL---------': 0x1,
      '------------------------------DD-DD----LL-LL-----BB-BB': 0x2,
    },
  },
  {
    move: MOVES,
    maxDepth: 10,
    head: '2x2x3',
    step: {
      '---------------------FF-FF-DD-DD-DD----LLLLLL----BB-BB': 0x3,
    },
  },
];

const ZZ_F2L_META: readonly StageMeta[] = [
  {
    move: MOVES,
    maxDepth: 10,
    head: 'EOLine',
    step: {
      '-H-HUH-H-----R-------HFH-F--D-HDH-D-----L-------HBH-B-': 0x0,
    },
  },
  {
    move: MOVES_ZZ_F2L,
    maxDepth: 16,
    head: 'ZZF2L1',
    step: {
      '-H-HUH-H----RRRRRR---HFF-FF-DDHDD-DD----L-------BBHBB-': 0x1,
      '-H-HUH-H-----R-------FFHFF-DD-DDHDD----LLLLLL---HBB-BB': 0x2,
    },
  },
  {
    move: MOVES_ZZ_F2L,
    maxDepth: 16,
    head: 'ZZF2L2',
    step: {
      '-H-HUH-H----RRRRRR---FFFFFFDDDDDDDDD---LLLLLL---BBBBBB': 0x3,
    },
  },
];

const EO_DR_META: readonly StageMeta[] = [
  {
    move: MOVES,
    maxDepth: 7,
    head: 'EO',
    step: {
      '-H-HUH-H-----R-------HFH----H-HDH-H-----L-------HBH---': 0x0,
    },
  },
  {
    move: MOVES,
    maxDepth: 10,
    head: 'DR',
    step: {
      'UUUUUUUUU---RRR------FFF---UUUUUUUUU---RRR------FFF---': 0x1,
    },
  },
];

const BLOCK_222_TARGETS = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'] as const;
const BLOCK_222_SOLVED_STATES = [
  '----UU-UURR-RR-----FF-FF------------------------------',
  '---UU-UU----------FF-FF--------------LL-LL------------',
  'UU-UU-------------------------------LL-LL-----BB-BB---',
  '-UU-UU----RR-RR------------------------------BB-BB----',
  '------------RR-RR-----FF-FF-DD-DD---------------------',
  '---------------------FF-FF-DD-DD--------LL-LL---------',
  '------------------------------DD-DD----LL-LL-----BB-BB',
  '-------------RR-RR-------------DD-DD------------BB-BB-',
] as const;

type Block222Target = (typeof BLOCK_222_TARGETS)[number];

const GENERAL_PRESETS = [
  ['3x3x3', SOLVED_FACELETS],
  ['Empty', '----U--------R--------F--------D--------L--------B----'],
  ['2x2x2', '----UU-UURR-RR-----FF-FF------------------------------'],
  ['2x2x3', '---UUUUUURR-RR----FFFFFF-------------LL-LL------------'],
  ['Cross', '----U--------R--R-----F--F--D-DDD-D-----L--L-----B--B-'],
  ['XCross', '----U-------RR-RR-----FF-FF-DDDDD-D-----L--L-----B--B-'],
  ['EOLine', '-H-HUH-H-----R-------HFH-F--D-HDH-D-----L-------HBH-B-'],
  ['Roux1', '---------------------F--F--D--D--D-----LLLLLL-----B--B'],
  ['Domino', 'UUUUUUUUU---RRR------FFF---UUUUUUUUU---RRR------FFF---'],
  ['EO&CO', 'XYXYUYXYX----R-------YFY---XYXYDYXYX----L-------YBY---'],
  ['Corner', 'U-U---U-UR-R---R-RF-F---F-FD-D---D-DL-L---L-LB-B---B-B'],
] as const satisfies readonly (readonly [string, string])[];

const GENERAL_PRESET_BY_LABEL = new Map<string, string>(GENERAL_PRESETS);
const GENERAL_LABEL_BY_MASK = new Map<string, string>(
  GENERAL_PRESETS.map(([label, mask]) => [mask, label]),
);
const GENERAL_RAW_MASK_PATTERN = /^[URFDLBHXYZ-]{54}$/u;

const isBlock222Target = (target: string): target is Block222Target =>
  BLOCK_222_TARGETS.includes(target as Block222Target);

const resolveBlock222Targets = (
  targets: readonly string[] | undefined,
): readonly Block222Target[] => {
  if (targets === undefined) return BLOCK_222_TARGETS;

  return targets.map((target) => {
    if (!isBlock222Target(target)) throw new UnknownSolverTargetError('block-222', target);

    return target;
  });
};

const resolveGeneralTargets = (
  targets: readonly string[] | undefined,
): readonly (readonly [string, string])[] => {
  const requestedTargets = targets ?? ['Cross'];

  return requestedTargets.map((target) => {
    const presetMask = GENERAL_PRESET_BY_LABEL.get(target);
    if (presetMask !== undefined) return [target, presetMask] as const;

    if (GENERAL_RAW_MASK_PATTERN.test(target)) {
      return [GENERAL_LABEL_BY_MASK.get(target) ?? target, target] as const;
    }

    throw new UnknownSolverTargetError('333-general', target);
  });
};

export const solveCfopF2L = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveStepByStep('cfop-f2l', scramble, CFOP_F2L_META, options);

export const solveRouxS2 = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveStepByStep('roux-s2', scramble, ROUX_S2_META, options);

export const solvePetrusS2 = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveStepByStep('petrus-s2', scramble, PETRUS_S2_META, options);

export const solveZZF2L = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveStepByStep('zz-f2l', scramble, ZZ_F2L_META, options);

export const solveEODR = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveStepByStep('eo-dr', scramble, EO_DR_META, options);

export const solveBlock222 = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => {
  const scrambleMoves = parseStageScramble(scramble);
  const maxDepth = options.maxDepth ?? DEFAULT_BLOCK_222_MAX_DEPTH;
  const solver = new MaskSolver(BLOCK_222_SOLVED_STATES, cubeMove, MOVES);
  const solutions = resolveBlock222Targets(options.targets).map((target) => {
    const targetIndex = BLOCK_222_TARGETS.indexOf(target);
    const solvedState = BLOCK_222_SOLVED_STATES[targetIndex];
    if (solvedState === undefined) throw new UnknownSolverTargetError('block-222', target);

    const moves = solver.search(stateInit(solvedState, scrambleMoves, []), 0, maxDepth);
    if (moves === undefined) throw new NoSolverSolutionError('block-222', target, maxDepth);

    return createStageSolution('block-222', target, target, moves);
  });

  return { method: 'block-222', scramble, solutions };
};

export const solveThreeByThreeGeneral = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => {
  const scrambleMoves = parseStageScramble(scramble);
  const maxDepth = options.maxDepth ?? DEFAULT_GENERAL_MAX_DEPTH;
  const solutions = resolveGeneralTargets(options.targets).map(([targetLabel, solvedState]) => {
    const solver = new MaskSolver([solvedState], cubeMove, MOVES);
    const moves = solver.search(stateInit(solvedState, scrambleMoves, []), 0, maxDepth);

    if (moves === undefined) {
      throw new NoSolverSolutionError('333-general', targetLabel, maxDepth);
    }

    return createStageSolution('333-general', solvedState, targetLabel, moves);
  });

  return { method: '333-general', scramble, solutions };
};

export const solveThreeByThreeTwoPhase = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => {
  const scrambleMoves = parseStageScramble(scramble);
  const facelets = applyMoves(SOLVED_FACELETS, scrambleMoves);
  const maxDepth = options.maxDepth ?? DEFAULT_TWO_PHASE_MAX_DEPTH;
  const solution = new SearchWCA().solution(facelets, maxDepth, 100_000, 0, 0);

  if (solution.startsWith('Error')) {
    throw new NoSolverSolutionError('333-two-phase', '3x3x3', maxDepth);
  }

  return {
    method: '333-two-phase',
    scramble,
    solutions: [
      createStageSolution(
        '333-two-phase',
        '333',
        '3x3x3 TwoPhase',
        solution.length === 0 ? [] : solution.split(/\s+/u),
      ),
    ],
  };
};
