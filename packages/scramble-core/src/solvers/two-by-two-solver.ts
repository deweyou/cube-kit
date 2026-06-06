import type { RandomSource } from '../random-source.js';

// Ported from TNoodle v0.19.2 TwoByTwoSolver: BLD corner fixed, U/R/F search only.
const ERROR_PREFIX = '@cubegin/scramble-core';

const N_PERM = 5040;
const N_ORIENT = 729;
const N_MOVES = 9;
const MAX_LENGTH = 20;

const MOVE_TO_STRING = ['U', 'U2', "U'", 'R', 'R2', "R'", 'F', 'F2', "F'"] as const;
const INVERSE_MOVE_TO_STRING = ["U'", 'U2', 'U', "R'", 'R2', 'R', "F'", 'F2', 'F'] as const;
const FACT = [1, 1, 2, 6, 24, 120, 720] as const;

const COST_U = 8;
const COST_U_LOW = 20;
const COST_U2 = 10;
const COST_U3 = 7;
const COST_R = 6;
const COST_R2 = 10;
const COST_R3 = 6;
const COST_F = 10;
const COST_F2 = 30;
const COST_F3 = 19;
const COST_REGRIP = 20;

export interface TwoByTwoState {
  permutation: number;
  orientation: number;
}

interface Tables {
  movePerm: readonly Uint16Array[];
  moveOrient: readonly Uint16Array[];
  prunPerm: Int8Array;
  prunOrient: Int8Array;
}

let cachedTables: Tables | undefined;

const packPerm = (cubies: readonly number[]): number => {
  let index = 0;
  let value = 0x6543210;

  for (let position = 0; position < 6; position += 1) {
    const shiftedCubie = (cubies[position] & 0x7) << 2;
    index = (7 - position) * index + ((value >> shiftedCubie) & 0x7);
    value -= 0x1111110 << shiftedCubie;
  }

  return index;
};

const unpackPerm = (permutation: number, cubies: number[]): void => {
  let remaining = permutation;
  let value = 0x6543210;

  for (let position = 0; position < 6; position += 1) {
    const divisor = FACT[6 - position];
    let cubie = Math.floor(remaining / divisor);
    remaining -= cubie * divisor;
    cubie <<= 2;
    cubies[position] = (value >> cubie) & 0x7;
    const mask = (1 << cubie) - 1;
    value = (value & mask) + ((value >> 4) & ~mask);
  }

  cubies[6] = value;
};

const packOrient = (cubies: readonly number[]): number => {
  let orientation = 0;

  for (let position = 0; position < 6; position += 1) {
    orientation = 3 * orientation + (cubies[position] >> 3);
  }

  return orientation;
};

const unpackOrient = (orientation: number, cubies: number[]): void => {
  let remaining = orientation;
  let orientationSum = 0;

  for (let position = 5; position >= 0; position -= 1) {
    const cubieOrientation = remaining % 3;
    cubies[position] = cubieOrientation << 3;
    orientationSum += cubieOrientation;
    remaining = Math.floor(remaining / 3);
  }

  cubies[6] = ((42424242 - orientationSum) % 3) << 3;
};

const cycle = (
  cubies: number[],
  first: number,
  second: number,
  third: number,
  fourth: number,
  times: number,
): void => {
  for (let count = 0; count < times; count += 1) {
    const previousFourth = cubies[fourth];
    cubies[fourth] = cubies[third];
    cubies[third] = cubies[second];
    cubies[second] = cubies[first];
    cubies[first] = previousFourth;
  }
};

const cycleAndOrient = (
  cubies: number[],
  first: number,
  second: number,
  third: number,
  fourth: number,
  times: number,
): void => {
  for (let count = 0; count < times; count += 1) {
    const previousFourth = cubies[fourth];
    cubies[fourth] = (cubies[third] + 8) % 24;
    cubies[third] = (cubies[second] + 16) % 24;
    cubies[second] = (cubies[first] + 8) % 24;
    cubies[first] = (previousFourth + 16) % 24;
  }
};

const moveCubies = (cubies: number[], move: number): void => {
  const face = Math.floor(move / 3);
  const times = (move % 3) + 1;

  switch (face) {
    case 0:
      cycle(cubies, 1, 3, 2, 0, times);
      break;
    case 1:
      cycleAndOrient(cubies, 0, 2, 6, 4, times);
      break;
    case 2:
      cycleAndOrient(cubies, 1, 0, 4, 5, times);
      break;
  }
};

const copyCubies = (source: readonly number[], target: number[]): void => {
  for (let index = 0; index < source.length; index += 1) {
    target[index] = source[index];
  }
};

const createMoveTables = (): Pick<Tables, 'movePerm' | 'moveOrient'> => {
  const movePerm = Array.from({ length: N_PERM }, () => new Uint16Array(N_MOVES));
  const moveOrient = Array.from({ length: N_ORIENT }, () => new Uint16Array(N_MOVES));
  const cubies = Array.from({ length: 7 }, () => 0);
  const movedCubies = Array.from({ length: 7 }, () => 0);

  for (let permutation = 0; permutation < N_PERM; permutation += 1) {
    unpackPerm(permutation, cubies);
    for (let move = 0; move < N_MOVES; move += 1) {
      copyCubies(cubies, movedCubies);
      moveCubies(movedCubies, move);
      movePerm[permutation][move] = packPerm(movedCubies);
    }
  }

  for (let orientation = 0; orientation < N_ORIENT; orientation += 1) {
    unpackOrient(orientation, cubies);
    for (let move = 0; move < N_MOVES; move += 1) {
      copyCubies(cubies, movedCubies);
      moveCubies(movedCubies, move);
      moveOrient[orientation][move] = packOrient(movedCubies);
    }
  }

  return { movePerm, moveOrient };
};

const createPruningTable = (size: number, moves: readonly Uint16Array[]): Int8Array => {
  const pruning = new Int8Array(size);
  pruning.fill(-1);
  pruning[0] = 0;

  let done = 1;
  for (let length = 0; done < size; length += 1) {
    for (let coordinate = 0; coordinate < size; coordinate += 1) {
      if (pruning[coordinate] !== length) continue;

      for (let move = 0; move < N_MOVES; move += 1) {
        const nextCoordinate = moves[coordinate][move];
        if (pruning[nextCoordinate] !== -1) continue;

        pruning[nextCoordinate] = length + 1;
        done += 1;
      }
    }
  }

  return pruning;
};

const createTables = (): Tables => {
  const { movePerm, moveOrient } = createMoveTables();

  return {
    movePerm,
    moveOrient,
    prunPerm: createPruningTable(N_PERM, movePerm),
    prunOrient: createPruningTable(N_ORIENT, moveOrient),
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
  if (!Number.isSafeInteger(coordinate) || coordinate < 0 || coordinate >= maxExclusive) {
    throw new RangeError(
      `${ERROR_PREFIX}: 2x2 ${coordinateName} must be an integer from 0 to ${maxExclusive - 1}`,
    );
  }
};

const validateState = (state: TwoByTwoState): void => {
  validateCoordinate('permutation', state.permutation, N_PERM);
  validateCoordinate('orientation', state.orientation, N_ORIENT);
};

const validateLength = (length: number): void => {
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_LENGTH) {
    throw new RangeError(
      `${ERROR_PREFIX}: 2x2 solve length must be an integer from 0 to ${MAX_LENGTH}`,
    );
  }
};

const computeCost = (
  solution: readonly number[],
  index: number,
  currentCost: number,
  grip: number,
): number => {
  if (index < 0) return currentCost;

  switch (solution[index]) {
    case 0:
      return computeCost(solution, index - 1, currentCost + COST_U3, grip);
    case 1:
      return computeCost(solution, index - 1, currentCost + COST_U2, grip);
    case 2:
      if (grip === 0) {
        return computeCost(solution, index - 1, currentCost + COST_U, 0);
      }
      if (grip === -1) {
        return Math.min(
          computeCost(solution, index - 1, currentCost + COST_REGRIP + COST_U, 0),
          computeCost(solution, index - 1, currentCost + COST_U_LOW, grip),
        );
      }
      return computeCost(solution, index - 1, currentCost + COST_REGRIP + COST_U, 0);
    case 3:
      if (grip > -1) {
        return computeCost(solution, index - 1, currentCost + COST_R3, grip - 1);
      }
      return computeCost(solution, index - 1, currentCost + COST_REGRIP + COST_R3, -1);
    case 4:
      if (grip !== 0) {
        return computeCost(solution, index - 1, currentCost + COST_R2, -grip);
      }
      return Math.min(
        computeCost(solution, index - 1, currentCost + COST_REGRIP + COST_R2, -1),
        computeCost(solution, index - 1, currentCost + COST_REGRIP + COST_R2, 1),
      );
    case 5:
      if (grip < 1) {
        return computeCost(solution, index - 1, currentCost + COST_R, grip + 1);
      }
      return computeCost(solution, index - 1, currentCost + COST_REGRIP + COST_R, 1);
    case 6:
      if (grip !== 0) {
        return computeCost(solution, index - 1, currentCost + COST_F3, grip);
      }
      return Math.min(
        computeCost(solution, index - 1, currentCost + COST_REGRIP + COST_F3, -1),
        computeCost(solution, index - 1, currentCost + COST_REGRIP + COST_F3, 1),
      );
    case 7:
      if (grip === -1) {
        return computeCost(solution, index - 1, currentCost + COST_F2, -1);
      }
      return computeCost(solution, index - 1, currentCost + COST_REGRIP + COST_F2, -1);
    case 8:
      if (grip === -1) {
        return computeCost(solution, index - 1, currentCost + COST_F, -1);
      }
      return computeCost(solution, index - 1, currentCost + COST_REGRIP + COST_F, -1);
    default:
      return -1;
  }
};

interface SearchOptions {
  permutation: number;
  orientation: number;
  depth: number;
  length: number;
  lastMove: number;
  solution: number[];
  bestSolution: number[];
  tables: Tables;
}

const search = ({
  permutation,
  orientation,
  depth,
  length,
  lastMove,
  solution,
  bestSolution,
  tables,
}: SearchOptions): boolean => {
  if (length === 0) {
    if (permutation !== 0 || orientation !== 0) return false;

    const cost = computeCost(solution, depth, 0, 0);
    if (cost < bestSolution[depth]) {
      for (let index = 0; index < depth; index += 1) {
        bestSolution[index] = solution[index];
      }
      bestSolution[depth] = cost;
    }
    return true;
  }

  if (tables.prunPerm[permutation] > length || tables.prunOrient[orientation] > length) {
    return false;
  }

  let solutionFound = false;

  for (let move = 0; move < N_MOVES; move += 1) {
    if (Math.floor(move / 3) === Math.floor(lastMove / 3)) continue;

    solution[depth] = move;
    solutionFound =
      search({
        permutation: tables.movePerm[permutation][move],
        orientation: tables.moveOrient[orientation][move],
        depth: depth + 1,
        length: length - 1,
        lastMove: move,
        solution,
        bestSolution,
        tables,
      }) || solutionFound;
  }

  return solutionFound;
};

const formatSolution = (solution: readonly number[], length: number, inverse: boolean): string => {
  if (length === 0) return '';

  const moves: string[] = [];

  if (inverse) {
    for (let index = length - 1; index >= 0; index -= 1) {
      moves.push(INVERSE_MOVE_TO_STRING[solution[index]]);
    }
  } else {
    for (let index = 0; index < length; index += 1) {
      moves.push(MOVE_TO_STRING[solution[index]]);
    }
  }

  return moves.join(' ');
};

export class TwoByTwoSolver {
  randomState(random: RandomSource): TwoByTwoState {
    const state = {
      permutation: random.nextInt(N_PERM),
      orientation: random.nextInt(N_ORIENT),
    };
    validateState(state);

    return state;
  }

  solveIn(state: TwoByTwoState, maxLength: number): string | null {
    return this.solve(state, maxLength, false, false);
  }

  generateExactly(state: TwoByTwoState, length: number): string {
    const scramble = this.solve(state, length, true, true);
    if (scramble === null) {
      throw new Error(
        `${ERROR_PREFIX}: could not generate a 2x2 scramble exactly ${length} moves long`,
      );
    }

    return scramble;
  }

  private solve(
    state: TwoByTwoState,
    desiredLength: number,
    exactLength: boolean,
    inverse: boolean,
  ): string | null {
    validateState(state);
    validateLength(desiredLength);

    const tables = getTables();
    const solution = Array.from({ length: MAX_LENGTH + 1 }, () => 0);
    const bestSolution = Array.from({ length: MAX_LENGTH + 1 }, () => 0);
    let length = exactLength ? desiredLength : 0;

    while (length <= desiredLength) {
      bestSolution[length] = 42424242;
      if (
        search({
          permutation: state.permutation,
          orientation: state.orientation,
          depth: 0,
          length,
          lastMove: 42,
          solution,
          bestSolution,
          tables,
        })
      ) {
        return formatSolution(bestSolution, length, inverse);
      }

      length += 1;
    }

    return null;
  }
}
