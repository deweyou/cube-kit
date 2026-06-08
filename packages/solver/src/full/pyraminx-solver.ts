import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/solver';

const N_EDGE_PERM = 720;
const N_EDGE_ORIENT = 32;
const N_CORNER_ORIENT = 81;
const N_ORIENT = N_EDGE_ORIENT * N_CORNER_ORIENT;
const N_TIPS = 81;
const N_MOVES = 8;
const MAX_LENGTH = 20;
const MAX_EDGE_PERM_ATTEMPTS = 100;

const MOVE_TO_STRING = ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'"] as const;
const INVERSE_MOVE_TO_STRING = ["U'", 'U', "L'", 'L', "R'", 'R', "B'", 'B'] as const;
const TIP_TO_STRING = ['u', "u'", 'l', "l'", 'r', "r'", 'b', "b'"] as const;
const INVERSE_TIP_TO_STRING = ["u'", 'u', "l'", 'l', "r'", 'r', "b'", 'b'] as const;
const FACT = [1, 1, 2, 6, 24, 120, 720] as const;

export interface PyraminxSolverState {
  readonly edgePerm: number;
  readonly edgeOrient: number;
  readonly cornerOrient: number;
  readonly tips: number;
}

interface Tables {
  moveEdgePerm: readonly Uint16Array[];
  moveEdgeOrient: readonly Uint8Array[];
  moveCornerOrient: readonly Uint8Array[];
  prunPerm: Int8Array;
  prunOrient: Int8Array;
}

interface SearchOptions {
  edgePerm: number;
  edgeOrient: number;
  cornerOrient: number;
  depth: number;
  length: number;
  lastMove: number;
  solution: number[];
  random: RandomSource;
  tables: Tables;
}

let cachedTables: Tables | undefined;

const packEdgePerm = (edges: readonly number[]): number => {
  let index = 0;
  let value = 0x543210;

  for (let position = 0; position < 5; position += 1) {
    const shiftedEdge = (edges[position] & 0x7) << 2;
    index = (6 - position) * index + ((value >> shiftedEdge) & 0x7);
    value -= 0x111110 << shiftedEdge;
  }

  return index;
};

const unpackEdgePerm = (permutation: number, edges: number[]): void => {
  let remaining = permutation;
  let value = 0x543210;

  for (let position = 0; position < 5; position += 1) {
    const divisor = FACT[5 - position];
    let edge = Math.floor(remaining / divisor);
    remaining -= edge * divisor;
    edge <<= 2;
    edges[position] = (value >> edge) & 0x7;
    const mask = (1 << edge) - 1;
    value = (value & mask) + ((value >> 4) & ~mask);
  }

  edges[5] = value;
};

const packEdgeOrient = (edges: readonly number[]): number => {
  let orientation = 0;

  for (let position = 0; position < 5; position += 1) {
    orientation = 2 * orientation + (edges[position] >> 3);
  }

  return orientation;
};

const unpackEdgeOrient = (orientation: number, edges: number[]): void => {
  let remaining = orientation;
  let orientationSum = 0;

  for (let position = 4; position >= 0; position -= 1) {
    const edgeOrientation = remaining & 1;
    edges[position] = edgeOrientation << 3;
    orientationSum ^= edgeOrientation;
    remaining >>= 1;
  }

  edges[5] = orientationSum << 3;
};

const packCornerOrient = (corners: readonly number[]): number => {
  let orientation = 0;

  for (let position = 0; position < 4; position += 1) {
    orientation = 3 * orientation + corners[position];
  }

  return orientation;
};

const unpackCornerOrient = (orientation: number, corners: number[]): void => {
  let remaining = orientation;

  for (let position = 3; position >= 0; position -= 1) {
    corners[position] = remaining % 3;
    remaining = Math.floor(remaining / 3);
  }
};

const cycleAndOrient = (
  edges: number[],
  first: number,
  second: number,
  third: number,
  times: number,
): void => {
  for (let count = 0; count < times; count += 1) {
    const savedThird = edges[third];
    edges[third] = (edges[second] + 8) % 16;
    edges[second] = (edges[first] + 8) % 16;
    edges[first] = savedThird;
  }
};

const moveEdges = (edges: number[], move: number): void => {
  const face = Math.floor(move / 2);
  const times = (move % 2) + 1;

  switch (face) {
    case 0:
      cycleAndOrient(edges, 5, 3, 1, times);
      break;
    case 1:
      cycleAndOrient(edges, 2, 1, 0, times);
      break;
    case 2:
      cycleAndOrient(edges, 0, 3, 4, times);
      break;
    case 3:
      cycleAndOrient(edges, 2, 4, 5, times);
      break;
  }
};

const moveCorners = (corners: number[], move: number): void => {
  const face = Math.floor(move / 2);
  const times = (move % 2) + 1;

  corners[face] = (corners[face] + times) % 3;
};

const copyCubies = (source: readonly number[], target: number[]): void => {
  for (let index = 0; index < source.length; index += 1) {
    target[index] = source[index];
  }
};

const createMoveTables = (): Pick<
  Tables,
  'moveEdgePerm' | 'moveEdgeOrient' | 'moveCornerOrient'
> => {
  const moveEdgePerm = Array.from({ length: N_EDGE_PERM }, () => new Uint16Array(N_MOVES));
  const moveEdgeOrient = Array.from({ length: N_EDGE_ORIENT }, () => new Uint8Array(N_MOVES));
  const moveCornerOrient = Array.from({ length: N_CORNER_ORIENT }, () => new Uint8Array(N_MOVES));
  const edges = Array.from({ length: 6 }, () => 0);
  const movedEdges = Array.from({ length: 6 }, () => 0);
  const corners = Array.from({ length: 4 }, () => 0);
  const movedCorners = Array.from({ length: 4 }, () => 0);

  for (let permutation = 0; permutation < N_EDGE_PERM; permutation += 1) {
    unpackEdgePerm(permutation, edges);
    for (let move = 0; move < N_MOVES; move += 1) {
      copyCubies(edges, movedEdges);
      moveEdges(movedEdges, move);
      moveEdgePerm[permutation][move] = packEdgePerm(movedEdges);
    }
  }

  for (let orientation = 0; orientation < N_EDGE_ORIENT; orientation += 1) {
    unpackEdgeOrient(orientation, edges);
    for (let move = 0; move < N_MOVES; move += 1) {
      copyCubies(edges, movedEdges);
      moveEdges(movedEdges, move);
      moveEdgeOrient[orientation][move] = packEdgeOrient(movedEdges);
    }
  }

  for (let orientation = 0; orientation < N_CORNER_ORIENT; orientation += 1) {
    unpackCornerOrient(orientation, corners);
    for (let move = 0; move < N_MOVES; move += 1) {
      copyCubies(corners, movedCorners);
      moveCorners(movedCorners, move);
      moveCornerOrient[orientation][move] = packCornerOrient(movedCorners);
    }
  }

  return { moveEdgePerm, moveEdgeOrient, moveCornerOrient };
};

const createPermutationPruningTable = (moveEdgePerm: readonly Uint16Array[]): Int8Array => {
  const pruning = new Int8Array(N_EDGE_PERM);
  pruning.fill(-1);
  pruning[0] = 0;

  let done = 1;
  for (let length = 0; done < N_EDGE_PERM / 2; length += 1) {
    for (let permutation = 0; permutation < N_EDGE_PERM; permutation += 1) {
      if (pruning[permutation] !== length) continue;

      for (let move = 0; move < N_MOVES; move += 1) {
        const nextPermutation = moveEdgePerm[permutation][move];
        if (pruning[nextPermutation] !== -1) continue;

        pruning[nextPermutation] = length + 1;
        done += 1;
      }
    }
  }

  return pruning;
};

const createOrientationPruningTable = (
  moveEdgeOrient: readonly Uint8Array[],
  moveCornerOrient: readonly Uint8Array[],
): Int8Array => {
  const pruning = new Int8Array(N_ORIENT);
  pruning.fill(-1);
  pruning[0] = 0;

  let done = 1;
  for (let length = 0; done < N_ORIENT; length += 1) {
    for (let orientation = 0; orientation < N_ORIENT; orientation += 1) {
      if (pruning[orientation] !== length) continue;

      for (let move = 0; move < N_MOVES; move += 1) {
        const nextEdgeOrient = moveEdgeOrient[orientation % N_EDGE_ORIENT][move];
        const nextCornerOrient = moveCornerOrient[Math.floor(orientation / N_EDGE_ORIENT)][move];
        const nextOrientation = nextCornerOrient * N_EDGE_ORIENT + nextEdgeOrient;
        if (pruning[nextOrientation] !== -1) continue;

        pruning[nextOrientation] = length + 1;
        done += 1;
      }
    }
  }

  return pruning;
};

const createTables = (): Tables => {
  const { moveEdgePerm, moveEdgeOrient, moveCornerOrient } = createMoveTables();

  return {
    moveEdgePerm,
    moveEdgeOrient,
    moveCornerOrient,
    prunPerm: createPermutationPruningTable(moveEdgePerm),
    prunOrient: createOrientationPruningTable(moveEdgeOrient, moveCornerOrient),
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
      `${ERROR_PREFIX}: Pyraminx ${coordinateName} must be an integer from 0 to ${maxExclusive - 1}`,
    );
  }
};

const validateState = (state: PyraminxSolverState): void => {
  validateCoordinate('edgePerm', state.edgePerm, N_EDGE_PERM);
  validateCoordinate('edgeOrient', state.edgeOrient, N_EDGE_ORIENT);
  validateCoordinate('cornerOrient', state.cornerOrient, N_CORNER_ORIENT);
  validateCoordinate('tips', state.tips, N_TIPS);
};

const validateLength = (length: number): void => {
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_LENGTH) {
    throw new RangeError(
      `${ERROR_PREFIX}: Pyraminx solve length must be an integer from 0 to ${MAX_LENGTH}`,
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

const unsolvedTips = (tips: number): number => {
  let count = 0;
  let remainingTips = tips;

  while (remainingTips !== 0) {
    if (remainingTips % 3 > 0) count += 1;
    remainingTips = Math.floor(remainingTips / 3);
  }

  return count;
};

const search = ({
  edgePerm,
  edgeOrient,
  cornerOrient,
  depth,
  length,
  lastMove,
  solution,
  random,
  tables,
}: SearchOptions): boolean => {
  if (length === 0) {
    return edgePerm === 0 && edgeOrient === 0 && cornerOrient === 0;
  }

  if (
    tables.prunPerm[edgePerm] > length ||
    tables.prunOrient[cornerOrient * N_EDGE_ORIENT + edgeOrient] > length
  ) {
    return false;
  }

  const randomOffset = nextCoordinate(random, 'searchMoveOffset', N_MOVES);
  for (let move = 0; move < N_MOVES; move += 1) {
    const randomMove = (move + randomOffset) % N_MOVES;
    if (Math.floor(randomMove / 2) === Math.floor(lastMove / 2)) continue;

    if (
      search({
        edgePerm: tables.moveEdgePerm[edgePerm][randomMove],
        edgeOrient: tables.moveEdgeOrient[edgeOrient][randomMove],
        cornerOrient: tables.moveCornerOrient[cornerOrient][randomMove],
        depth: depth + 1,
        length: length - 1,
        lastMove: randomMove,
        solution,
        random,
        tables,
      })
    ) {
      solution[depth] = randomMove;
      return true;
    }
  }

  return false;
};

const formatSolution = (
  state: PyraminxSolverState,
  solution: readonly number[],
  length: number,
  inverse: boolean,
): string => {
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

  const tips = Array.from({ length: 4 }, () => 0);
  unpackCornerOrient(state.tips, tips);
  for (let tip = 0; tip < 4; tip += 1) {
    const direction = tips[tip];
    if (direction === 0) continue;

    const tipMove = tip * 2 + direction - 1;
    moves.push(inverse ? TIP_TO_STRING[tipMove] : INVERSE_TIP_TO_STRING[tipMove]);
  }

  return moves.join(' ');
};

export class PyraminxSolver {
  randomState(random: RandomSource): PyraminxSolverState {
    const tables = getTables();
    let edgePerm: number | undefined;

    for (let attempt = 0; attempt < MAX_EDGE_PERM_ATTEMPTS; attempt += 1) {
      const sampledEdgePerm = nextCoordinate(random, 'edgePerm', N_EDGE_PERM);
      if (tables.prunPerm[sampledEdgePerm] === -1) continue;

      edgePerm = sampledEdgePerm;
      break;
    }

    if (edgePerm === undefined) {
      throw new Error(
        `${ERROR_PREFIX}: could not sample a reachable Pyraminx edge permutation after ${MAX_EDGE_PERM_ATTEMPTS} attempts`,
      );
    }

    const state = {
      edgePerm,
      edgeOrient: nextCoordinate(random, 'edgeOrient', N_EDGE_ORIENT),
      cornerOrient: nextCoordinate(random, 'cornerOrient', N_CORNER_ORIENT),
      tips: nextCoordinate(random, 'tips', N_TIPS),
    };
    validateState(state);

    return state;
  }

  solveIn(
    state: PyraminxSolverState,
    maxLength: number,
    includingTips: boolean,
    random: RandomSource,
  ): string | null {
    return this.solve(state, maxLength, false, false, includingTips, random);
  }

  generateExactly(
    state: PyraminxSolverState,
    length: number,
    includingTips: boolean,
    random: RandomSource,
  ): string {
    const scramble = this.solve(state, length, true, true, includingTips, random);
    if (scramble === null) {
      throw new Error(
        `${ERROR_PREFIX}: could not generate a Pyraminx scramble exactly ${length} moves long`,
      );
    }

    return scramble;
  }

  private solve(
    state: PyraminxSolverState,
    desiredLength: number,
    exactLength: boolean,
    inverse: boolean,
    includingTips: boolean,
    random: RandomSource,
  ): string | null {
    validateState(state);
    validateLength(desiredLength);

    const mainMoveDesiredLength = includingTips
      ? desiredLength - unsolvedTips(state.tips)
      : desiredLength;
    if (mainMoveDesiredLength < 0) return null;

    const tables = getTables();
    const solution = Array.from({ length: MAX_LENGTH }, () => 0);
    let length = exactLength ? mainMoveDesiredLength : 0;

    while (length <= mainMoveDesiredLength) {
      if (
        search({
          edgePerm: state.edgePerm,
          edgeOrient: state.edgeOrient,
          cornerOrient: state.cornerOrient,
          depth: 0,
          length,
          lastMove: 42,
          solution,
          random,
          tables,
        })
      ) {
        return formatSolution(state, solution, length, inverse);
      }

      length += 1;
    }

    return null;
  }
}
