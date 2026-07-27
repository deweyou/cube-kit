import { splitAlgorithm } from '@cubegin/scramble-puzzle';

const ERROR_PREFIX = '@cubegin/solver';
const AXIS_COUNT = 3;
const AXIS_ORDER = 5;
const MAX_SOLUTION_LENGTH = 20;
const EDGE_ORIENTATION_COUNT = 32;
const CORNER_ORIENTATION_COUNT = 243;

export interface MegaminxLsllState {
  readonly edgePermutation: readonly number[];
  readonly edgeOrientation: readonly number[];
  readonly cornerPermutation: readonly number[];
  readonly cornerOrientation: readonly number[];
}

interface Coordinates {
  readonly edge: number;
  readonly corner: number;
}

interface Tables {
  readonly edgeMoves: readonly Uint16Array[];
  readonly cornerMoves: readonly Uint32Array[];
  readonly edgePruning: Int8Array;
  readonly cornerPruning: Int8Array;
}

interface MacroMove {
  readonly axis: number;
  readonly power: number;
}

const enumeratePermutations = (values: readonly number[]): readonly (readonly number[])[] => {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    enumeratePermutations(values.filter((_, candidateIndex) => candidateIndex !== index)).map(
      (suffix) => [value, ...suffix],
    ),
  );
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

const EVEN_PERMUTATIONS = enumeratePermutations([0, 1, 2, 3, 4, 5]).filter(
  (permutation) => permutationParity(permutation) === 0,
);
const PERMUTATION_INDEX = new Map(
  EVEN_PERMUTATIONS.map((permutation, index) => [permutation.join(','), index]),
);

let cachedTables: Tables | undefined;

export class MegaminxLsllSolver {
  scramble(state: MegaminxLsllState): string {
    const coordinates = stateToCoordinates(state);
    const solution = solveCoordinates(coordinates);
    const scramble = [...solution]
      .reverse()
      .map(({ axis, power }) => ({ axis, power: AXIS_ORDER - power }))
      .map(formatMacro)
      .join(' ');

    return scramble;
  }

  solve(state: MegaminxLsllState): string {
    return solveCoordinates(stateToCoordinates(state)).map(formatMacro).join(' ');
  }

  stateFromScramble(scramble: string): MegaminxLsllState {
    let coordinates: Coordinates = { edge: 0, corner: 0 };
    for (const move of parseMacros(scramble)) {
      coordinates = applyCoordinateMove(coordinates, move.axis, move.power);
    }
    return coordinatesToState(coordinates);
  }

  applyMacro(state: MegaminxLsllState, axis: number, power: number): MegaminxLsllState {
    validateAxisAndPower(axis, power);
    return coordinatesToState(applyCoordinateMove(stateToCoordinates(state), axis, power));
  }
}

const stateToCoordinates = (state: MegaminxLsllState): Coordinates => {
  validatePermutation('edgePermutation', state.edgePermutation);
  validatePermutation('cornerPermutation', state.cornerPermutation);
  validateOrientation('edgeOrientation', state.edgeOrientation, 2);
  validateOrientation('cornerOrientation', state.cornerOrientation, 3);

  const edgePermutation = PERMUTATION_INDEX.get(state.edgePermutation.join(','));
  const cornerPermutation = PERMUTATION_INDEX.get(state.cornerPermutation.join(','));
  if (edgePermutation === undefined || cornerPermutation === undefined) {
    throw new RangeError(`${ERROR_PREFIX}: Megaminx LSLL permutations must be even`);
  }

  return {
    edge: edgePermutation * EDGE_ORIENTATION_COUNT + packOrientation(state.edgeOrientation, 2),
    corner:
      cornerPermutation * CORNER_ORIENTATION_COUNT + packOrientation(state.cornerOrientation, 3),
  };
};

const coordinatesToState = ({ edge, corner }: Coordinates): MegaminxLsllState => {
  const edgePermutation = EVEN_PERMUTATIONS[Math.floor(edge / EDGE_ORIENTATION_COUNT)];
  const cornerPermutation = EVEN_PERMUTATIONS[Math.floor(corner / CORNER_ORIENTATION_COUNT)];
  if (edgePermutation === undefined || cornerPermutation === undefined) {
    throw new RangeError(`${ERROR_PREFIX}: invalid Megaminx LSLL coordinate`);
  }
  return {
    edgePermutation: [...edgePermutation],
    edgeOrientation: unpackOrientation(edge % EDGE_ORIENTATION_COUNT, 6, 2),
    cornerPermutation: [...cornerPermutation],
    cornerOrientation: unpackOrientation(corner % CORNER_ORIENTATION_COUNT, 6, 3),
  };
};

const validatePermutation = (name: string, permutation: readonly number[]): void => {
  if (
    permutation.length !== 6 ||
    new Set(permutation).size !== 6 ||
    permutation.some((piece) => !Number.isSafeInteger(piece) || piece < 0 || piece >= 6)
  ) {
    throw new RangeError(`${ERROR_PREFIX}: Megaminx LSLL ${name} must contain 0 through 5 once`);
  }
};

const validateOrientation = (
  name: string,
  orientation: readonly number[],
  modulus: number,
): void => {
  if (
    orientation.length !== 6 ||
    orientation.some((value) => !Number.isSafeInteger(value) || value < 0 || value >= modulus) ||
    orientation.reduce((sum, value) => sum + value, 0) % modulus !== 0
  ) {
    throw new RangeError(`${ERROR_PREFIX}: invalid Megaminx LSLL ${name}`);
  }
};

const packOrientation = (orientation: readonly number[], modulus: number): number => {
  let coordinate = 0;
  for (let index = 0; index < 5; index += 1) {
    coordinate = coordinate * modulus + (orientation[index] as number);
  }
  return coordinate;
};

const unpackOrientation = (
  coordinate: number,
  length: number,
  modulus: number,
): readonly number[] => {
  let remaining = coordinate;
  let sum = 0;
  const orientation = Array.from({ length }, () => 0);
  for (let index = length - 2; index >= 0; index -= 1) {
    orientation[index] = remaining % modulus;
    sum += orientation[index] as number;
    remaining = Math.floor(remaining / modulus);
  }
  orientation[length - 1] = (modulus - (sum % modulus)) % modulus;
  return orientation;
};

const getTables = (): Tables => {
  cachedTables ??= createTables();
  return cachedTables;
};

const createTables = (): Tables => {
  const edgeSize = EVEN_PERMUTATIONS.length * EDGE_ORIENTATION_COUNT;
  const cornerSize = EVEN_PERMUTATIONS.length * CORNER_ORIENTATION_COUNT;
  const edgeMoves = Array.from({ length: AXIS_COUNT }, () => new Uint16Array(edgeSize));
  const cornerMoves = Array.from({ length: AXIS_COUNT }, () => new Uint32Array(cornerSize));

  for (let coordinate = 0; coordinate < edgeSize; coordinate += 1) {
    for (let axis = 0; axis < AXIS_COUNT; axis += 1) {
      edgeMoves[axis][coordinate] = moveEdgeCoordinate(coordinate, axis);
    }
  }
  for (let coordinate = 0; coordinate < cornerSize; coordinate += 1) {
    for (let axis = 0; axis < AXIS_COUNT; axis += 1) {
      cornerMoves[axis][coordinate] = moveCornerCoordinate(coordinate, axis);
    }
  }

  return {
    edgeMoves,
    cornerMoves,
    edgePruning: createPruning(edgeSize, edgeMoves),
    cornerPruning: createPruning(cornerSize, cornerMoves),
  };
};

const moveEdgeCoordinate = (coordinate: number, axis: number): number => {
  const permutation = [
    ...(EVEN_PERMUTATIONS[Math.floor(coordinate / EDGE_ORIENTATION_COUNT)] as readonly number[]),
  ];
  const orientation = [...unpackOrientation(coordinate % EDGE_ORIENTATION_COUNT, 6, 2)];
  if (axis === 0) {
    cycle(permutation, [0, 1, 2, 3, 4]);
    cycle(orientation, [0, 1, 2, 3, 4]);
  } else if (axis === 1) {
    cycle(permutation, [0, 1, 2, 3, 5]);
    cycle(orientation, [0, 1, 2, 3, 5]);
  } else {
    cycle(permutation, [1, 2, 3, 4, 5]);
    cycle(orientation, [1, 2, 3, 4, 5], [0, 0, 0, 0, 1, 2]);
  }
  return coordinateFromParts(permutation, orientation, EDGE_ORIENTATION_COUNT, 2);
};

const moveCornerCoordinate = (coordinate: number, axis: number): number => {
  const permutation = [
    ...(EVEN_PERMUTATIONS[Math.floor(coordinate / CORNER_ORIENTATION_COUNT)] as readonly number[]),
  ];
  const orientation = [...unpackOrientation(coordinate % CORNER_ORIENTATION_COUNT, 6, 3)];
  if (axis === 0) {
    cycle(permutation, [0, 1, 2, 3, 4]);
    cycle(orientation, [0, 1, 2, 3, 4]);
  } else if (axis === 1) {
    cycle(permutation, [0, 5, 1, 2, 3]);
    cycle(orientation, [0, 5, 1, 2, 3], [2, 0, 0, 0, 0, 3]);
  } else {
    cycle(permutation, [0, 2, 3, 4, 5]);
    cycle(orientation, [0, 2, 3, 4, 5], [1, 0, 0, 0, 1, 3]);
  }
  return coordinateFromParts(permutation, orientation, CORNER_ORIENTATION_COUNT, 3);
};

const coordinateFromParts = (
  permutation: readonly number[],
  orientation: readonly number[],
  orientationCount: number,
  orientationModulus: number,
): number => {
  const permutationCoordinate = PERMUTATION_INDEX.get(permutation.join(','));
  if (permutationCoordinate === undefined) {
    throw new Error(`${ERROR_PREFIX}: Megaminx LSLL move produced an odd permutation`);
  }
  return (
    permutationCoordinate * orientationCount + packOrientation(orientation, orientationModulus)
  );
};

const cycle = (
  values: number[],
  positions: readonly number[],
  orientationOffsets?: readonly number[],
): void => {
  const previous = positions.map((position) => values[position] as number);
  const modulus = orientationOffsets?.at(-1);
  for (let index = 0; index < positions.length; index += 1) {
    const targetIndex = (index + 1) % positions.length;
    let value = previous[index] as number;
    if (orientationOffsets !== undefined && modulus !== undefined) {
      value =
        (value -
          (orientationOffsets[index] as number) +
          (orientationOffsets[targetIndex] as number) +
          modulus) %
        modulus;
    }
    values[positions[targetIndex] as number] = value;
  }
};

const createPruning = (
  size: number,
  moves: readonly Uint16Array[] | readonly Uint32Array[],
): Int8Array => {
  const pruning = new Int8Array(size);
  pruning.fill(-1);
  pruning[0] = 0;
  const queue = new Uint32Array(size);
  queue[0] = 0;
  let read = 0;
  let write = 1;

  while (read < write) {
    const coordinate = queue[read] as number;
    const depth = pruning[coordinate] as number;
    read += 1;
    for (let axis = 0; axis < AXIS_COUNT; axis += 1) {
      let next = coordinate;
      for (let power = 1; power < AXIS_ORDER; power += 1) {
        next = moves[axis][next] as number;
        if (pruning[next] !== -1) continue;
        pruning[next] = depth + 1;
        queue[write] = next;
        write += 1;
      }
    }
  }
  return pruning;
};

const solveCoordinates = (coordinates: Coordinates): readonly MacroMove[] => {
  const tables = getTables();
  const minimumDepth = Math.max(
    tables.edgePruning[coordinates.edge] as number,
    tables.cornerPruning[coordinates.corner] as number,
  );
  const solution: MacroMove[] = [];
  for (let depth = minimumDepth; depth <= MAX_SOLUTION_LENGTH; depth += 1) {
    if (search(coordinates.edge, coordinates.corner, depth, -1, solution, tables)) {
      return [...solution];
    }
  }
  throw new Error(`${ERROR_PREFIX}: Megaminx LSLL state has no solution within depth 20`);
};

const search = (
  edge: number,
  corner: number,
  remaining: number,
  lastAxis: number,
  solution: MacroMove[],
  tables: Tables,
): boolean => {
  if (remaining === 0) return edge === 0 && corner === 0;
  if (
    (tables.edgePruning[edge] as number) > remaining ||
    (tables.cornerPruning[corner] as number) > remaining
  ) {
    return false;
  }

  for (let axis = 0; axis < AXIS_COUNT; axis += 1) {
    if (axis === lastAxis) continue;
    let nextEdge = edge;
    let nextCorner = corner;
    for (let power = 1; power < AXIS_ORDER; power += 1) {
      nextEdge = tables.edgeMoves[axis][nextEdge] as number;
      nextCorner = tables.cornerMoves[axis][nextCorner] as number;
      solution.push({ axis, power });
      if (search(nextEdge, nextCorner, remaining - 1, axis, solution, tables)) return true;
      solution.pop();
    }
  }
  return false;
};

const applyCoordinateMove = (
  coordinates: Coordinates,
  axis: number,
  power: number,
): Coordinates => {
  validateAxisAndPower(axis, power);
  const tables = getTables();
  let edge = coordinates.edge;
  let corner = coordinates.corner;
  for (let count = 0; count < power; count += 1) {
    edge = tables.edgeMoves[axis][edge] as number;
    corner = tables.cornerMoves[axis][corner] as number;
  }
  return { edge, corner };
};

const validateAxisAndPower = (axis: number, power: number): void => {
  if (
    !Number.isSafeInteger(axis) ||
    axis < 0 ||
    axis >= AXIS_COUNT ||
    !Number.isSafeInteger(power) ||
    power < 1 ||
    power >= AXIS_ORDER
  ) {
    throw new RangeError(`${ERROR_PREFIX}: invalid Megaminx LSLL macro move`);
  }
};

const formatMacro = ({ axis, power }: MacroMove): string => {
  const suffix = ['', '', '2', "2'", "'"][power] as string;
  if (axis === 0) return `U${suffix}`;
  if (axis === 1) return `R U${suffix} R'`;
  return `F' U${suffix} F`;
};

const parseMacros = (algorithm: string): readonly MacroMove[] => {
  const tokens = splitAlgorithm(algorithm);
  const moves: MacroMove[] = [];
  for (let index = 0; index < tokens.length; ) {
    const token = tokens[index] as string;
    if (token.startsWith('U')) {
      moves.push({ axis: 0, power: parseUPower(token) });
      index += 1;
      continue;
    }
    if (
      token === 'R' &&
      tokens[index + 1]?.startsWith('U') === true &&
      tokens[index + 2] === "R'"
    ) {
      moves.push({ axis: 1, power: parseUPower(tokens[index + 1] as string) });
      index += 3;
      continue;
    }
    if (
      token === "F'" &&
      tokens[index + 1]?.startsWith('U') === true &&
      tokens[index + 2] === 'F'
    ) {
      moves.push({ axis: 2, power: parseUPower(tokens[index + 1] as string) });
      index += 3;
      continue;
    }
    throw new Error(`${ERROR_PREFIX}: unsupported Megaminx LSLL macro at '${token}'`);
  }
  return moves;
};

const parseUPower = (token: string): number => {
  if (token === 'U') return 1;
  if (token === 'U2') return 2;
  if (token === "U2'") return 3;
  if (token === "U'") return 4;
  throw new Error(`${ERROR_PREFIX}: unsupported Megaminx LSLL U move '${token}'`);
};
