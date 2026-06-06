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
import { binomial, cycleFour, cycleFourWithOrientation } from './coordinate-utils.js';
import { countFaceTurnMetric, countQuarterTurnMetric } from './metrics.js';
import { getPetrusTables } from './petrus.js';
import { parseThreeByThreeSolverAlgorithm } from './move-utils.js';

const TURN_NAMES = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
const SUFFIXES = ['', '2', "'"] as const;
const ROUX_TARGETS = ['LU', 'LD', 'FU', 'FD', 'RU', 'RD', 'BU', 'BD'] as const;
const ROUX_MOVE_STRINGS = [
  ['UDLRFB', 'DULRBF', 'BFLRUD', 'FBLRDU'],
  ['UDFBRL', 'DUFBLR', 'LRFBUD', 'RLFBDU'],
  ['DURLFB', 'UDRLBF', 'BFRLDU', 'FBRLUD'],
  ['UDBFLR', 'DUBFRL', 'RLBFUD', 'LRBFDU'],
] as const;
const ROUX_ROTATIONS = ['', 'y', 'z2', "y'"] as const;
const ROUX_ORIENTATION_ROTATIONS = ['', 'x2', "x'", 'x'] as const;
const SOLVED_CP = [50, 7, 49, 12] as const;
const SOLVED_CO = [225, 27, 221, 61] as const;
const SOLVED_EP = [72, 518, 580, 575] as const;
const SOLVED_EO = [96, 688, 768, 760] as const;
const ORIENTATION_INDEXES = [
  [1, 0, 2, 3],
  [0, 1, 3, 2],
] as const;
const ROUX_TARGET_CP = 50;
const ROUX_TARGET_CO = 225;
const ROUX_TARGET_EP = 72;
const ROUX_TARGET_EO = 96;

interface FaceTurn {
  readonly face: CubeFace;
  readonly amount: 1 | 2 | 3;
}

interface RouxTables {
  readonly cpm: readonly (readonly number[])[];
  readonly com: readonly (readonly number[])[];
  readonly ed: readonly number[];
  readonly cd: readonly number[];
}

interface RouxState {
  readonly cp: readonly number[];
  readonly co: readonly number[];
  readonly ep: readonly number[];
  readonly eo: readonly number[];
}

let rouxTables: RouxTables | undefined;

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

const getCorner = (combination: number, permutationAndOrientation: number): number[] => {
  const corners = Array<number>(8).fill(-3);
  const selected = [
    permutationAndOrientation % 2,
    1 - (permutationAndOrientation % 2),
    Math.floor(permutationAndOrientation / 3),
    permutationAndOrientation % 3,
  ];
  let remaining = 2;

  for (let position = 7; position >= 0; position -= 1) {
    if (combination >= binomial(position, remaining)) {
      combination -= binomial(position, remaining);
      remaining -= 1;
      corners[position] = (selected[remaining] << 3) | selected[remaining + 2];
    }
  }

  return corners;
};

const cornerMove = (
  combination: number,
  permutationAndOrientation: number,
  move: number,
): number => {
  const corners = getCorner(combination, permutationAndOrientation);

  if (move === 0) cycleFour(corners, 0, 3, 2, 1);
  else if (move === 1) cycleFour(corners, 4, 5, 6, 7);
  else if (move === 2) cycleFourWithOrientation(corners, 0, 4, 7, 3, [2, 1, 2, 1]);
  else if (move === 3) cycleFourWithOrientation(corners, 1, 2, 6, 5, [1, 2, 1, 2]);
  else if (move === 4) cycleFourWithOrientation(corners, 2, 3, 7, 6, [1, 2, 1, 2]);
  else cycleFourWithOrientation(corners, 0, 1, 5, 4, [1, 2, 1, 2]);

  let nextCombination = 0;
  const selected = Array<number>(4).fill(0);
  let remaining = 2;

  for (let position = 7; position >= 0; position -= 1) {
    if (corners[position] >= 0) {
      nextCombination += binomial(position, remaining);
      remaining -= 1;
      selected[remaining] = corners[position] >> 3;
      selected[remaining + 2] = (corners[position] & 7) % 3;
    }
  }

  return (nextCombination * 2 + selected[0]) * 9 + selected[2] * 3 + selected[3];
};

const createFilledTable = (rows: number, columns: number): number[][] =>
  Array.from({ length: rows }, () => Array<number>(columns).fill(0));

const initializeRouxTables = (): RouxTables => {
  if (rouxTables) return rouxTables;

  const petrus = getPetrusTables();
  const cpm = createFilledTable(56, 6);
  const com = createFilledTable(252, 6);

  for (let combination = 0; combination < 28; combination += 1) {
    for (let orientation = 0; orientation < 9; orientation += 1) {
      for (let move = 0; move < 6; move += 1) {
        const next = cornerMove(combination, orientation, move);

        if (orientation < 2) cpm[(combination << 1) | orientation][move] = Math.floor(next / 9);
        com[combination * 9 + orientation][move] = Math.floor(next / 18) * 9 + (next % 9);
      }
    }
  }

  const ed = Array<number>(220 * 48).fill(-1);
  ed[12 * 48] = 0;

  for (let depth = 0; depth < 7; depth += 1) {
    for (let edgePermutation = 0; edgePermutation < 1320; edgePermutation += 1) {
      for (let edgeOrientation = 0; edgeOrientation < 8; edgeOrientation += 1) {
        if (ed[(edgePermutation << 3) | edgeOrientation] !== depth) continue;

        for (let move = 0; move < 6; move += 1) {
          let nextPermutation = edgePermutation;
          let nextOrientation = edgeOrientation;

          for (let turn = 0; turn < 3; turn += 1) {
            nextOrientation =
              petrus.eom[(Math.floor(nextPermutation / 6) << 3) | (nextOrientation & 7)][move] & 7;
            nextPermutation = petrus.epm[nextPermutation][move];

            const index = (nextPermutation << 3) | nextOrientation;
            if (ed[index] < 0) ed[index] = depth + 1;
          }
        }
      }
    }
  }

  const cd = Array<number>(28 * 18).fill(-1);
  cd[25 * 18] = 0;

  for (let depth = 0; depth < 4; depth += 1) {
    for (let cornerPermutation = 0; cornerPermutation < 56; cornerPermutation += 1) {
      for (let cornerOrientation = 0; cornerOrientation < 9; cornerOrientation += 1) {
        if (cd[cornerPermutation * 9 + cornerOrientation] !== depth) continue;

        for (let move = 0; move < 6; move += 1) {
          let nextPermutation = cornerPermutation;
          let nextOrientation = cornerOrientation;

          for (let turn = 0; turn < 3; turn += 1) {
            nextOrientation =
              com[Math.floor(nextPermutation / 2) * 9 + (nextOrientation % 9)][move] % 9;
            nextPermutation = cpm[nextPermutation][move];

            const index = nextPermutation * 9 + nextOrientation;
            if (cd[index] < 0) cd[index] = depth + 1;
          }
        }
      }
    }
  }

  rouxTables = { cpm, com, ed, cd };

  return rouxTables;
};

const createInitialState = (side: number): RouxState => {
  const orientationIndexes = ORIENTATION_INDEXES[side % 2];

  return {
    cp: orientationIndexes.map((index) => SOLVED_CP[index]),
    co: orientationIndexes.map((index) => SOLVED_CO[index]),
    ep: orientationIndexes.map((index) => SOLVED_EP[index]),
    eo: orientationIndexes.map((index) => SOLVED_EO[index]),
  };
};

const applyScramble = (scramble: string, side: number, tables: RouxTables): RouxState => {
  const petrus = getPetrusTables();
  const cp = [...createInitialState(side).cp];
  const co = [...createInitialState(side).co];
  const ep = [...createInitialState(side).ep];
  const eo = [...createInitialState(side).eo];

  for (const turn of parseFaceTurns(scramble)) {
    for (let orientation = 0; orientation < 4; orientation += 1) {
      const move = moveIndex(ROUX_MOVE_STRINGS[Math.floor(side / 2)][orientation], turn);

      for (let amount = 0; amount < turn.amount; amount += 1) {
        cp[orientation] = tables.cpm[cp[orientation]][move];
        co[orientation] = tables.com[co[orientation]][move];
        ep[orientation] = petrus.epm[ep[orientation]][move];
        eo[orientation] = petrus.eom[eo[orientation]][move];
      }
    }
  }

  return { cp, co, ep, eo };
};

const applySolutionToOrientation = (
  state: Pick<RouxState, 'cp' | 'co' | 'ep' | 'eo'>,
  orientation: number,
  solution: string,
  tables: RouxTables,
): { readonly cp: number; readonly co: number; readonly ep: number; readonly eo: number } => {
  const petrus = getPetrusTables();
  let cp = state.cp[orientation];
  let co = state.co[orientation];
  let ep = state.ep[orientation];
  let eo = state.eo[orientation];

  for (const turn of parseFaceTurns(solution)) {
    const move = moveIndex(TURN_NAMES.join(''), turn);

    for (let amount = 0; amount < turn.amount; amount += 1) {
      cp = tables.cpm[cp][move];
      co = tables.com[co][move];
      ep = petrus.epm[ep][move];
      eo = petrus.eom[eo][move];
    }
  }

  return { cp, co, ep, eo };
};

const searchRouxS1 = (
  state: { readonly cp: number; readonly co: number; readonly ep: number; readonly eo: number },
  depth: number,
  lastMove: number,
  tables: RouxTables,
): readonly number[] | undefined => {
  if (depth === 0) {
    return state.cp === ROUX_TARGET_CP &&
      state.co === ROUX_TARGET_CO &&
      state.ep === ROUX_TARGET_EP &&
      state.eo === ROUX_TARGET_EO
      ? []
      : undefined;
  }
  if (tables.ed[(state.ep << 3) | (state.eo & 7)] > depth) return undefined;
  if (tables.cd[state.cp * 9 + (state.co % 9)] > depth) return undefined;

  const petrus = getPetrusTables();

  for (let move = 0; move < 6; move += 1) {
    if (move === lastMove) continue;

    let cp = state.cp;
    let co = state.co;
    let ep = state.ep;
    let eo = state.eo;

    for (let turn = 0; turn < 3; turn += 1) {
      cp = tables.cpm[cp][move];
      co = tables.com[co][move];
      ep = petrus.epm[ep][move];
      eo = petrus.eom[eo][move];

      const rest = searchRouxS1({ cp, co, ep, eo }, depth - 1, move, tables);
      if (rest) return [move * 3 + turn, ...rest];
    }
  }

  return undefined;
};

const pathToAlgorithm = (path: readonly number[]): string =>
  path.map((move) => `${TURN_NAMES[Math.floor(move / 3)]}${SUFFIXES[move % 3]}`).join(' ');

const requestedTargets = (targets: readonly string[] | undefined): readonly number[] => {
  if (!targets) return ROUX_TARGETS.map((_, index) => index);

  return targets.map((target) => {
    const index = ROUX_TARGETS.indexOf(target as (typeof ROUX_TARGETS)[number]);
    if (index < 0) throw new UnknownSolverTargetError('roux-s1', target);

    return index;
  });
};

const setupRotation = (side: number, orientation: number): string =>
  [ROUX_ROTATIONS[Math.floor(side / 2)], ROUX_ORIENTATION_ROTATIONS[orientation]]
    .filter((part) => part.length > 0)
    .join(' ');

const createSolution = (
  side: number,
  orientation: number,
  path: readonly number[],
): ThreeByThreeAssistSolution => {
  const solution = pathToAlgorithm(path);

  return {
    method: 'roux-s1',
    target: ROUX_TARGETS[side],
    targetLabel: ROUX_TARGETS[side],
    setupRotation: setupRotation(side, orientation),
    solution,
    depth: path.length,
    metric: {
      ftm: countFaceTurnMetric(solution),
      qtm: countQuarterTurnMetric(solution),
    },
  };
};

export const solveRouxS1 = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => {
  const tables = initializeRouxTables();
  const maxDepth = options.maxDepth ?? 9;
  const solutions = requestedTargets(options.targets).map((side) => {
    const state = applyScramble(scramble, side, tables);

    for (let depth = 0; depth <= maxDepth; depth += 1) {
      for (let orientation = 0; orientation < 4; orientation += 1) {
        const path = searchRouxS1(
          {
            cp: state.cp[orientation],
            co: state.co[orientation],
            ep: state.ep[orientation],
            eo: state.eo[orientation],
          },
          depth,
          -1,
          tables,
        );
        if (path) return createSolution(side, orientation, path);
      }
    }

    throw new NoSolverSolutionError('roux-s1', ROUX_TARGETS[side], maxDepth);
  });

  return { method: 'roux-s1', scramble, solutions };
};

export const isRouxS1SolutionSolved = (
  scramble: string,
  solution: ThreeByThreeAssistSolution,
): boolean => {
  const side = ROUX_TARGETS.indexOf(solution.target as (typeof ROUX_TARGETS)[number]);
  if (side < 0) return false;

  const tables = initializeRouxTables();
  const state = applyScramble(scramble, side, tables);

  return state.cp.some((_, orientation) => {
    const next = applySolutionToOrientation(state, orientation, solution.solution, tables);

    return (
      next.cp === ROUX_TARGET_CP &&
      next.co === ROUX_TARGET_CO &&
      next.ep === ROUX_TARGET_EP &&
      next.eo === ROUX_TARGET_EO
    );
  });
};
