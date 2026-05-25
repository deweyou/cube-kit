import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubekit/scramble-core';

const N_MOVES = 4;
const N_PERM = 4320;
const N_TWIST = 2187;
const MAX_SOLUTION_LENGTH = 12;
const MAX_TWIST_ATTEMPTS = 100;

const FACT = [1, 1, 1, 3, 12, 60, 360] as const;
const CORNER_PERM_MOVES = [
  [6, 5, 10, 1],
  [9, 7, 4, 2],
  [3, 11, 8, 0],
  [10, 1, 6, 5],
  [0, 8, 11, 3],
  [7, 9, 2, 4],
  [4, 2, 9, 7],
  [11, 3, 0, 8],
  [1, 10, 5, 6],
  [8, 0, 3, 11],
  [2, 4, 7, 9],
  [5, 6, 1, 10],
] as const;
const ORIENTATION_BY_CORNER = [0, 1, 2, 0, 2, 1, 1, 2, 0, 2, 1, 0] as const;
const SOLUTION_MOVES = ['L', 'R', 'B', 'U'] as const;

export interface SkewbSolverState {
  readonly perm: number;
  readonly twst: number;
}

interface Tables {
  movePerm: readonly Uint16Array[];
  moveTwist: readonly Uint16Array[];
  prunPerm: Int8Array;
  prunTwist: Int8Array;
}

interface SearchOptions {
  perm: number;
  twst: number;
  depth: number;
  length: number;
  lastMove: number;
  solution: number[];
  random: RandomSource;
  tables: Tables;
}

let cachedTables: Tables | undefined;

const createAvailableCenters = (): number[] => [0, 1, 2, 3, 4, 5];

const unpackCenterPerm = (centerIndex: number): number[] => {
  let remaining = centerIndex;
  let parity = 0;
  const available = createAvailableCenters();
  const centerPerm = Array.from({ length: 6 }, () => 0);

  for (let position = 0; position < 5; position += 1) {
    const divisor = FACT[5 - position];
    const selectedIndex = Math.floor(remaining / divisor);
    remaining -= selectedIndex * divisor;
    parity ^= selectedIndex;
    centerPerm[position] = available.splice(selectedIndex, 1)[0];
  }

  if ((parity & 1) === 0) {
    centerPerm[5] = available[0];
  } else {
    centerPerm[5] = centerPerm[4];
    centerPerm[4] = available[0];
  }

  return centerPerm;
};

const packCenterPerm = (centerPerm: readonly number[]): number => {
  const available = createAvailableCenters();
  let centerIndex = 0;

  for (let position = 0; position < 4; position += 1) {
    const selectedIndex = available.indexOf(centerPerm[position]);
    centerIndex *= 6 - position;
    centerIndex += selectedIndex;
    available.splice(selectedIndex, 1);
  }

  return centerIndex;
};

const moveCenterPerm = (centerPerm: number[], move: number): void => {
  let savedCenter: number;

  switch (move) {
    case 0:
      savedCenter = centerPerm[0];
      centerPerm[0] = centerPerm[1];
      centerPerm[1] = centerPerm[3];
      centerPerm[3] = savedCenter;
      break;
    case 1:
      savedCenter = centerPerm[0];
      centerPerm[0] = centerPerm[4];
      centerPerm[4] = centerPerm[2];
      centerPerm[2] = savedCenter;
      break;
    case 2:
      savedCenter = centerPerm[1];
      centerPerm[1] = centerPerm[2];
      centerPerm[2] = centerPerm[5];
      centerPerm[5] = savedCenter;
      break;
    case 3:
      savedCenter = centerPerm[3];
      centerPerm[3] = centerPerm[5];
      centerPerm[5] = centerPerm[4];
      centerPerm[4] = savedCenter;
      break;
  }
};

const getPermMove = (index: number, move: number): number => {
  const centerPerm = unpackCenterPerm(Math.floor(index / 12));
  const cornerIndex = index % 12;

  moveCenterPerm(centerPerm, move);

  return packCenterPerm(centerPerm) * 12 + CORNER_PERM_MOVES[cornerIndex][move];
};

const getTwistMove = (index: number, move: number): number => {
  const fixedTwist = Array.from({ length: 4 }, () => 0);
  const twist = Array.from({ length: 4 }, () => 0);
  let remaining = index;

  for (let position = 0; position < 4; position += 1) {
    fixedTwist[position] = remaining % 3;
    remaining = Math.floor(remaining / 3);
  }

  for (let position = 0; position < 3; position += 1) {
    twist[position] = remaining % 3;
    remaining = Math.floor(remaining / 3);
  }

  twist[3] = (6 - twist[0] - twist[1] - twist[2]) % 3;
  fixedTwist[move] = (fixedTwist[move] + 1) % 3;

  let savedTwist: number;
  switch (move) {
    case 0:
      savedTwist = twist[0];
      twist[0] = twist[2] + 2;
      twist[2] = twist[1] + 2;
      twist[1] = savedTwist + 2;
      break;
    case 1:
      savedTwist = twist[0];
      twist[0] = twist[1] + 2;
      twist[1] = twist[3] + 2;
      twist[3] = savedTwist + 2;
      break;
    case 2:
      savedTwist = twist[0];
      twist[0] = twist[3] + 2;
      twist[3] = twist[2] + 2;
      twist[2] = savedTwist + 2;
      break;
    case 3:
      savedTwist = twist[1];
      twist[1] = twist[2] + 2;
      twist[2] = twist[3] + 2;
      twist[3] = savedTwist + 2;
      break;
  }

  for (let position = 2; position >= 0; position -= 1) {
    remaining = remaining * 3 + (twist[position] % 3);
  }

  for (let position = 3; position >= 0; position -= 1) {
    remaining = remaining * 3 + fixedTwist[position];
  }

  return remaining;
};

const createMoveTables = (): Pick<Tables, 'movePerm' | 'moveTwist'> => {
  const movePerm = Array.from({ length: N_PERM }, () => new Uint16Array(N_MOVES));
  const moveTwist = Array.from(
    { length: N_TWIST },
    () => new Uint16Array(N_MOVES),
  );

  for (let permutation = 0; permutation < N_PERM; permutation += 1) {
    for (let move = 0; move < N_MOVES; move += 1) {
      movePerm[permutation][move] = getPermMove(permutation, move);
    }
  }

  for (let twist = 0; twist < N_TWIST; twist += 1) {
    for (let move = 0; move < N_MOVES; move += 1) {
      moveTwist[twist][move] = getTwistMove(twist, move);
    }
  }

  return { movePerm, moveTwist };
};

const createPermutationPruningTable = (
  movePerm: readonly Uint16Array[],
): Int8Array => {
  const pruning = new Int8Array(N_PERM);
  pruning.fill(-1);
  pruning[0] = 0;

  for (let length = 0; length < 6; length += 1) {
    for (let permutation = 0; permutation < N_PERM; permutation += 1) {
      if (pruning[permutation] !== length) continue;

      for (let move = 0; move < N_MOVES; move += 1) {
        let nextPermutation = permutation;
        for (let count = 0; count < 2; count += 1) {
          nextPermutation = movePerm[nextPermutation][move];
          if (pruning[nextPermutation] !== -1) continue;

          pruning[nextPermutation] = length + 1;
        }
      }
    }
  }

  return pruning;
};

const createTwistPruningTable = (
  moveTwist: readonly Uint16Array[],
): Int8Array => {
  const pruning = new Int8Array(N_TWIST);
  pruning.fill(-1);
  pruning[0] = 0;

  for (let length = 0; length < 6; length += 1) {
    for (let twist = 0; twist < N_TWIST; twist += 1) {
      if (pruning[twist] !== length) continue;

      for (let move = 0; move < N_MOVES; move += 1) {
        let nextTwist = twist;
        for (let count = 0; count < 2; count += 1) {
          nextTwist = moveTwist[nextTwist][move];
          if (pruning[nextTwist] !== -1) continue;

          pruning[nextTwist] = length + 1;
        }
      }
    }
  }

  return pruning;
};

const createTables = (): Tables => {
  const { movePerm, moveTwist } = createMoveTables();

  return {
    movePerm,
    moveTwist,
    prunPerm: createPermutationPruningTable(movePerm),
    prunTwist: createTwistPruningTable(moveTwist),
  };
};

const getTables = (): Tables => {
  cachedTables ??= createTables();
  return cachedTables;
};

const validateCoordinate = (
  coordinateName: string,
  coordinate: number,
  maxExclusive: number,
): void => {
  if (
    !Number.isSafeInteger(coordinate) ||
    coordinate < 0 ||
    coordinate >= maxExclusive
  ) {
    throw new RangeError(
      `${ERROR_PREFIX}: Skewb ${coordinateName} must be an integer from 0 to ${maxExclusive - 1}`,
    );
  }
};

const validateState = (state: SkewbSolverState): void => {
  validateCoordinate('perm', state.perm, N_PERM);
  validateCoordinate('twst', state.twst, N_TWIST);
};

const validateLength = (length: number): void => {
  if (
    !Number.isSafeInteger(length) ||
    length < 0 ||
    length > MAX_SOLUTION_LENGTH
  ) {
    throw new RangeError(
      `${ERROR_PREFIX}: Skewb solve length must be an integer from 0 to ${MAX_SOLUTION_LENGTH}`,
    );
  }
};

const nextCoordinate = (
  random: RandomSource,
  coordinateName: string,
  maxExclusive: number,
): number => {
  const coordinate = random.nextInt(maxExclusive);
  validateCoordinate(coordinateName, coordinate, maxExclusive);

  return coordinate;
};

const isSolvable = (state: SkewbSolverState): boolean =>
  ORIENTATION_BY_CORNER[state.perm % 12] ===
  (state.twst +
    Math.floor(state.twst / 3) +
    Math.floor(state.twst / 9) +
    Math.floor(state.twst / 27)) %
    3;

const search = ({
  perm,
  twst,
  depth,
  length,
  lastMove,
  solution,
  random,
  tables,
}: SearchOptions): number => {
  if (length === 0) {
    return perm === 0 && twst === 0 ? depth : -1;
  }

  if (tables.prunPerm[perm] > length || tables.prunTwist[twst] > length) {
    return -1;
  }

  const randomOffset = nextCoordinate(random, 'searchMoveOffset', N_MOVES);
  for (let move = 0; move < N_MOVES; move += 1) {
    const randomMove = (move + randomOffset) % N_MOVES;
    if (randomMove === lastMove) continue;

    let nextPerm = perm;
    let nextTwist = twst;
    for (let amount = 0; amount < 2; amount += 1) {
      nextPerm = tables.movePerm[nextPerm][randomMove];
      nextTwist = tables.moveTwist[nextTwist][randomMove];

      const searchResult = search({
        perm: nextPerm,
        twst: nextTwist,
        depth: depth + 1,
        length: length - 1,
        lastMove: randomMove,
        solution,
        random,
        tables,
      });
      if (searchResult !== -1) {
        solution[depth] = randomMove * 2 + amount;
        return searchResult;
      }
    }
  }

  return -1;
};

const swapMoveNames = (moveNames: string[]): void => {
  const savedMove = moveNames[0];
  moveNames[0] = moveNames[1];
  moveNames[1] = moveNames[3];
  moveNames[3] = savedMove;
};

const formatSolution = (
  solution: readonly number[],
  solutionLength: number,
): string => {
  const moves: string[] = [];
  const moveNames = [...SOLUTION_MOVES];

  for (let index = 0; index < solutionLength; index += 1) {
    const axis = solution[index] >> 1;
    const power = solution[index] & 1;

    if (axis === 2) {
      for (let count = 0; count <= power; count += 1) {
        swapMoveNames(moveNames);
      }
    }

    moves.push(`${moveNames[axis]}${power === 1 ? "'" : ''}`);
  }

  return moves.join(' ');
};

export class SkewbSolver {
  randomState(random: RandomSource): SkewbSolverState {
    const state: SkewbSolverState = {
      perm: nextCoordinate(random, 'perm', N_PERM),
      twst: 0,
    };

    for (let attempt = 0; attempt < MAX_TWIST_ATTEMPTS; attempt += 1) {
      const sampledTwist = nextCoordinate(random, 'twst', N_TWIST);
      const sampledState = { ...state, twst: sampledTwist };
      if (!isSolvable(sampledState)) continue;

      return sampledState;
    }

    throw new Error(
      `${ERROR_PREFIX}: could not sample a solvable Skewb twist after ${MAX_TWIST_ATTEMPTS} attempts`,
    );
  }

  solveIn(
    state: SkewbSolverState,
    length: number,
    random: RandomSource,
  ): string | null {
    return this.solve(state, length, false, random);
  }

  generateExactly(
    state: SkewbSolverState,
    length: number,
    random: RandomSource,
  ): string {
    const scramble = this.solve(state, length, true, random);
    if (scramble === null) {
      throw new Error(
        `${ERROR_PREFIX}: could not generate a Skewb scramble exactly ${length} moves long`,
      );
    }

    return scramble;
  }

  private solve(
    state: SkewbSolverState,
    desiredLength: number,
    exactLength: boolean,
    random: RandomSource,
  ): string | null {
    validateState(state);
    validateLength(desiredLength);

    const solution = Array.from({ length: MAX_SOLUTION_LENGTH }, () => 0);
    const tables = getTables();
    let length = exactLength ? desiredLength : 0;

    while (length <= desiredLength) {
      const solutionLength = search({
        perm: state.perm,
        twst: state.twst,
        depth: 0,
        length,
        lastMove: -1,
        solution,
        random,
        tables,
      });

      if (solutionLength !== -1) {
        return formatSolution(solution, solutionLength);
      }

      length += 1;
    }

    return null;
  }
}
