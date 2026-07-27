import { parseSkewbAlgorithm } from '@cubegin/scramble-puzzle';
import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/solver';

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

export interface SkewbCubieState {
  readonly centerPermutation: readonly number[];
  readonly cornerPermutation: readonly number[];
  readonly fixedCornerOrientation: readonly number[];
  readonly cornerOrientation: readonly number[];
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

const unpackCornerPerm = (cornerIndex: number): number[] => unpackEvenPermutation(cornerIndex, 4);

const unpackEvenPermutation = (coordinate: number, length: number): number[] => {
  let remaining = coordinate;
  let parity = 0;
  const available = Array.from({ length }, (_, index) => index);
  const permutation = Array.from({ length }, () => 0);

  for (let position = 0; position < length - 1; position += 1) {
    const divisor = FACT[length - 1 - position] as number;
    const selectedIndex = Math.floor(remaining / divisor);
    remaining -= selectedIndex * divisor;
    parity ^= selectedIndex;
    permutation[position] = available.splice(selectedIndex, 1)[0] as number;
  }

  if ((parity & 1) === 0) {
    permutation[length - 1] = available[0] as number;
  } else {
    permutation[length - 1] = permutation[length - 2] as number;
    permutation[length - 2] = available[0] as number;
  }

  return permutation;
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

const packCornerPerm = (cornerPerm: readonly number[]): number => packEvenPermutation(cornerPerm);

const packEvenPermutation = (permutation: readonly number[]): number => {
  const available = Array.from({ length: permutation.length }, (_, index) => index);
  let coordinate = 0;

  for (let position = 0; position < permutation.length - 2; position += 1) {
    const selectedIndex = available.indexOf(permutation[position] as number);
    coordinate *= permutation.length - position;
    coordinate += selectedIndex;
    available.splice(selectedIndex, 1);
  }

  return coordinate;
};

const unpackTwist = (
  twistCoordinate: number,
): Pick<SkewbCubieState, 'fixedCornerOrientation' | 'cornerOrientation'> => {
  let remaining = twistCoordinate;
  const fixedCornerOrientation = Array.from({ length: 4 }, () => 0);
  const cornerOrientation = Array.from({ length: 4 }, () => 0);

  for (let position = 0; position < 4; position += 1) {
    fixedCornerOrientation[position] = remaining % 3;
    remaining = Math.floor(remaining / 3);
  }
  for (let position = 0; position < 3; position += 1) {
    cornerOrientation[position] = remaining % 3;
    remaining = Math.floor(remaining / 3);
  }
  cornerOrientation[3] =
    (6 -
      (cornerOrientation[0] as number) -
      (cornerOrientation[1] as number) -
      (cornerOrientation[2] as number)) %
    3;

  return { fixedCornerOrientation, cornerOrientation };
};

const packTwist = ({
  fixedCornerOrientation,
  cornerOrientation,
}: Pick<SkewbCubieState, 'fixedCornerOrientation' | 'cornerOrientation'>): number => {
  let coordinate = 0;
  for (let position = 2; position >= 0; position -= 1) {
    coordinate = coordinate * 3 + (cornerOrientation[position] as number);
  }
  for (let position = 3; position >= 0; position -= 1) {
    coordinate = coordinate * 3 + (fixedCornerOrientation[position] as number);
  }
  return coordinate;
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
  const moveTwist = Array.from({ length: N_TWIST }, () => new Uint16Array(N_MOVES));

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

const createPermutationPruningTable = (movePerm: readonly Uint16Array[]): Int8Array => {
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

const createTwistPruningTable = (moveTwist: readonly Uint16Array[]): Int8Array => {
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
  if (!Number.isSafeInteger(coordinate) || coordinate < 0 || coordinate >= maxExclusive) {
    throw new RangeError(
      `${ERROR_PREFIX}: Skewb ${coordinateName} must be an integer from 0 to ${maxExclusive - 1}`,
    );
  }
};

const validateState = (state: SkewbSolverState): void => {
  validateCoordinate('perm', state.perm, N_PERM);
  validateCoordinate('twst', state.twst, N_TWIST);
};

const validateEvenPermutation = (
  name: string,
  permutation: readonly number[],
  length: number,
): void => {
  if (
    permutation.length !== length ||
    new Set(permutation).size !== length ||
    permutation.some((piece) => !Number.isSafeInteger(piece) || piece < 0 || piece >= length) ||
    permutationParity(permutation) !== 0
  ) {
    throw new RangeError(`${ERROR_PREFIX}: ${name} must be an even permutation`);
  }
};

const validateOrientation = (
  name: string,
  orientation: readonly number[],
  requireZeroSum: boolean,
): void => {
  if (
    orientation.length !== 4 ||
    orientation.some((value) => !Number.isSafeInteger(value) || value < 0 || value >= 3) ||
    (requireZeroSum && orientation.reduce((sum, value) => sum + value, 0) % 3 !== 0)
  ) {
    throw new RangeError(`${ERROR_PREFIX}: invalid ${name}`);
  }
};

const permutationParity = (permutation: readonly number[]): number => {
  let parity = 0;
  for (let left = 0; left < permutation.length; left += 1) {
    for (let right = left + 1; right < permutation.length; right += 1) {
      if ((permutation[left] as number) > (permutation[right] as number)) parity ^= 1;
    }
  }
  return parity;
};

const validateLength = (length: number): void => {
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_SOLUTION_LENGTH) {
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

const moveIndexFromFace = (moveNames: readonly string[], face: string): number => {
  const moveIndex = moveNames.indexOf(face);
  if (moveIndex === -1) {
    throw new Error(`${ERROR_PREFIX}: unsupported Skewb move face ${face}`);
  }

  return moveIndex;
};

const formatSolution = (solution: readonly number[], solutionLength: number): string => {
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
  stateFromCubies(cubies: SkewbCubieState): SkewbSolverState {
    validateEvenPermutation('Skewb center permutation', cubies.centerPermutation, 6);
    validateEvenPermutation('Skewb corner permutation', cubies.cornerPermutation, 4);
    validateOrientation('Skewb fixed-corner orientation', cubies.fixedCornerOrientation, false);
    validateOrientation('Skewb corner orientation', cubies.cornerOrientation, true);

    const state = {
      perm:
        packCenterPerm(cubies.centerPermutation) * 12 + packCornerPerm(cubies.cornerPermutation),
      twst: packTwist(cubies),
    };
    validateState(state);
    if (!isSolvable(state)) {
      throw new RangeError(`${ERROR_PREFIX}: Skewb cubie state is not reachable`);
    }
    return state;
  }

  cubiesFromState(state: SkewbSolverState): SkewbCubieState {
    validateState(state);
    return {
      centerPermutation: unpackCenterPerm(Math.floor(state.perm / 12)),
      cornerPermutation: unpackCornerPerm(state.perm % 12),
      ...unpackTwist(state.twst),
    };
  }

  isNoBarState(state: SkewbSolverState): boolean {
    const cubies = this.cubiesFromState(state);
    const fixedCornerFacelets = [
      [4, 16, 7],
      [1, 11, 22],
      [26, 14, 8],
      [29, 19, 23],
    ] as const;
    const cornerFacelets = [
      [3, 6, 12],
      [2, 21, 17],
      [27, 9, 18],
      [28, 24, 13],
    ] as const;
    const facelets = Array.from({ length: 30 }, () => -1);
    cubies.centerPermutation.forEach((piece, position) => {
      facelets[position * 5] = piece;
    });
    fillCornerFacelets(fixedCornerFacelets, facelets, [0, 1, 2, 3], cubies.fixedCornerOrientation);
    fillCornerFacelets(
      cornerFacelets,
      facelets,
      cubies.cornerPermutation,
      cubies.cornerOrientation,
    );

    for (let face = 0; face < 6; face += 1) {
      const offset = face * 5;
      for (let sticker = 1; sticker < 5; sticker += 1) {
        if (facelets[offset] === facelets[offset + sticker]) return false;
      }
    }
    return true;
  }

  stateFromScramble(scramble: string): SkewbSolverState {
    const tables = getTables();
    const moveNames = [...SOLUTION_MOVES];
    let perm = 0;
    let twst = 0;

    for (const move of parseSkewbAlgorithm(scramble)) {
      const moveIndex = moveIndexFromFace(moveNames, move.face);

      for (let amount = 0; amount < move.amount; amount += 1) {
        perm = tables.movePerm[perm][moveIndex];
        twst = tables.moveTwist[twst][moveIndex];
      }

      if (moveIndex === 2) {
        for (let amount = 0; amount < move.amount; amount += 1) {
          swapMoveNames(moveNames);
        }
      }
    }

    const state = { perm, twst };
    validateState(state);

    return state;
  }

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

  solveIn(state: SkewbSolverState, length: number, random: RandomSource): string | null {
    return this.solve(state, length, false, random);
  }

  generateExactly(state: SkewbSolverState, length: number, random: RandomSource): string {
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

const fillCornerFacelets = (
  pieceFacelets: readonly (readonly number[])[],
  facelets: number[],
  permutation: readonly number[],
  orientation: readonly number[],
): void => {
  for (let position = 0; position < pieceFacelets.length; position += 1) {
    const piece = permutation[position] as number;
    const pieceOrientation = orientation[position] as number;
    for (let sticker = 0; sticker < 3; sticker += 1) {
      const target = pieceFacelets[position][(sticker + pieceOrientation) % 3] as number;
      const source = pieceFacelets[piece][sticker] as number;
      facelets[target] = Math.floor(source / 5);
    }
  }
};
