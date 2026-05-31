import {
  parseSquareOneAlgorithm,
  splitAlgorithm,
  type SquareOneMove,
} from '@cubekit/scramble-puzzle';
import {
  InvalidSolverScrambleError,
  NoSolverSolutionError,
  UnknownSolverTargetError,
} from '../errors.js';
import type {
  PuzzleAssistOptions,
  PuzzleAssistResult,
  PuzzleAssistSolution,
  SquareOneAssistMethod,
} from '../types.js';

const HALF_LAYER = [
  0x15, 0x17, 0x1b, 0x1d, 0x1f, 0x2b, 0x2d, 0x2f, 0x35, 0x37, 0x3b, 0x3d, 0x3f,
] as const;
const SHAPE_COUNT = 3678;
const SOLVED_SHAPE = 7191405;
const TARGET = 'shape';
const DEFAULT_FACE_TURN_MAX_DEPTH = 14;
const DEFAULT_TWIST_MAX_DEPTH = 12;

let shapeIndexes: readonly number[] | undefined;
let faceTurnPruning: readonly number[] | undefined;
let twistPruning: readonly number[] | undefined;

const bitCount = (value: number): number => {
  let count = 0;
  let remaining = value;

  while (remaining !== 0) {
    remaining &= remaining - 1;
    count += 1;
  }

  return count;
};

const createShapeIndexes = (): readonly number[] => {
  const indexes: number[] = [];

  for (let value = 0; value < 28561; value += 1) {
    const dr = HALF_LAYER[value % 13];
    const dl = HALF_LAYER[Math.floor(value / 13) % 13];
    const ur = HALF_LAYER[Math.floor(value / 13 / 13) % 13];
    const ul = HALF_LAYER[Math.floor(value / 13 / 13 / 13)];
    const shape = (ul << 18) | (ur << 12) | (dl << 6) | dr;

    if (bitCount(shape) === 16) indexes.push(shape);
  }

  indexes.sort((left, right) => left - right);

  return indexes;
};

const getShapeIndexes = (): readonly number[] => {
  shapeIndexes ??= createShapeIndexes();

  return shapeIndexes;
};

const binarySearch = (items: readonly number[], value: number): number => {
  let low = 0;
  let high = items.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = items[middle];
    if (candidate === value) return middle;
    if (candidate < value) low = middle + 1;
    else high = middle - 1;
  }

  return -1;
};

const getShapeIndex = (shape: number): number => binarySearch(getShapeIndexes(), shape);

const rotate = (layer: number): number => ((layer << 1) & 0xffe) | ((layer >> 11) & 1);

const getTop = (shape: number): number => shape & 0xfff;

const getBottom = (shape: number): number => (shape >> 12) & 0xfff;

const rotateTop = (shape: number): number => (getBottom(shape) << 12) | rotate(getTop(shape));

const rotateBottom = (shape: number): number => (rotate(getBottom(shape)) << 12) | getTop(shape);

const twist = (shape: number): number => {
  const newTop = (getTop(shape) & 0xf80) | (getBottom(shape) & 0x7f);
  const newBottom = (getBottom(shape) & 0xf80) | (getTop(shape) & 0x7f);

  return (newBottom << 12) | newTop;
};

const canTwist = (shape: number): boolean => {
  const top = getTop(shape);
  const bottom = getBottom(shape);

  return (
    (top & 1) !== 0 && (top & (1 << 6)) !== 0 && (bottom & 1) !== 0 && (bottom & (1 << 6)) !== 0
  );
};

const rotateRepeated = (
  shape: number,
  rotateLayer: (value: number) => number,
  turns: number,
): number => {
  let next = shape;

  for (let index = 0; index < turns + 12; index += 1) {
    next = rotateLayer(next);
  }

  return next;
};

const applyMoveToShape = (shape: number, move: SquareOneMove): number => {
  if (move.type === 'slash') return twist(shape);

  return rotateRepeated(rotateRepeated(shape, rotateTop, move.top), rotateBottom, move.bottom);
};

const parseShapeAlgorithm = (algorithm: string): readonly SquareOneMove[] => {
  try {
    return parseSquareOneAlgorithm(algorithm);
  } catch (error) {
    throw new InvalidSolverScrambleError(algorithm, error);
  }
};

const applyShapeAlgorithm = (algorithm: string): number =>
  parseShapeAlgorithm(algorithm).reduce(
    (shape, move) => applyMoveToShape(shape, move),
    SOLVED_SHAPE,
  );

export const isSquareOneShapeSolved = (scramble: string, solution = ''): boolean =>
  applyShapeAlgorithm([scramble.trim(), solution.trim()].filter(Boolean).join(' ')) ===
  SOLVED_SHAPE;

const initFaceTurnPruning = (): readonly number[] => {
  if (faceTurnPruning !== undefined) return faceTurnPruning;

  const table = Array<number>(SHAPE_COUNT).fill(-1);
  table[getShapeIndex(SOLVED_SHAPE)] = 0;

  for (let depth = 0; depth < DEFAULT_FACE_TURN_MAX_DEPTH; depth += 1) {
    for (let shapeIndex = 0; shapeIndex < SHAPE_COUNT; shapeIndex += 1) {
      if (table[shapeIndex] !== depth) continue;

      const shape = getShapeIndexes()[shapeIndex];
      if (canTwist(shape)) {
        const nextIndex = getShapeIndex(twist(shape));
        if (table[nextIndex] === -1) table[nextIndex] = depth + 1;
      }

      let nextTop = shape;
      for (let turn = 0; turn < 11; turn += 1) {
        nextTop = rotateTop(nextTop);
        if (canTwist(nextTop)) {
          const nextIndex = getShapeIndex(nextTop);
          if (table[nextIndex] === -1) table[nextIndex] = depth + 1;
        }
      }

      let nextBottom = shape;
      for (let turn = 0; turn < 11; turn += 1) {
        nextBottom = rotateBottom(nextBottom);
        if (canTwist(nextBottom)) {
          const nextIndex = getShapeIndex(nextBottom);
          if (table[nextIndex] === -1) table[nextIndex] = depth + 1;
        }
      }
    }
  }

  faceTurnPruning = table;

  return table;
};

const initTwistPruning = (): readonly number[] => {
  if (twistPruning !== undefined) return twistPruning;

  const table = Array<number>(SHAPE_COUNT).fill(-1);
  table[1170] = 0;
  table[1192] = 0;
  table[2640] = 0;
  table[2662] = 0;

  for (let depth = 0; depth < 7; depth += 1) {
    for (let shapeIndex = 0; shapeIndex < SHAPE_COUNT; shapeIndex += 1) {
      if (table[shapeIndex] !== depth) continue;

      let next = twist(getShapeIndexes()[shapeIndex]);
      const nextIndex = getShapeIndex(next);
      if (table[nextIndex] !== -1) continue;

      table[nextIndex] = depth + 1;

      for (let top = 0; top < 13; top += 1) {
        for (let bottom = 0; bottom < 13; bottom += 1) {
          if (canTwist(next)) {
            const rotatedIndex = getShapeIndex(next);
            if (table[rotatedIndex] === -1) table[rotatedIndex] = depth + 1;
          }
          next = rotateBottom(next);
        }
        next = rotateTop(next);
      }
    }
  }

  twistPruning = table;

  return table;
};

const normalizeTurn = (turn: number): number => {
  if (turn > 6) return turn - 12;
  if (turn < -6) return -12 - turn;

  return turn;
};

const shapeIndexOrThrow = (shape: number, scramble: string): number => {
  const index = getShapeIndex(shape);
  if (index < 0) throw new InvalidSolverScrambleError(scramble);

  return index;
};

const solveFaceTurnMetric = (shape: number, scramble: string, maxDepth: number): string => {
  const pruning = initFaceTurnPruning();
  let state = shape;
  const moves: string[] = [];

  while (pruning[shapeIndexOrThrow(state, scramble)] > 0) {
    if (moves.length > maxDepth) {
      throw new NoSolverSolutionError('sq1-shape-ftm', TARGET, maxDepth);
    }

    const currentDepth = pruning[shapeIndexOrThrow(state, scramble)];

    if (canTwist(state)) {
      const next = twist(state);
      if (pruning[shapeIndexOrThrow(next, scramble)] === currentDepth - 1) {
        moves.push('/');
        state = next;
      }
    }

    let top = 0;
    let nextTop = state;
    for (let turn = 0; turn < 12; turn += 1) {
      const index = getShapeIndex(nextTop);
      if (index >= 0 && pruning[index] === pruning[shapeIndexOrThrow(state, scramble)] - 1) {
        top = turn;
        state = nextTop;
        break;
      }
      nextTop = rotateTop(nextTop);
    }

    let bottom = 0;
    let nextBottom = state;
    for (let turn = 0; turn < 12; turn += 1) {
      const index = getShapeIndex(nextBottom);
      if (index >= 0 && pruning[index] === pruning[shapeIndexOrThrow(state, scramble)] - 1) {
        bottom = turn;
        state = nextBottom;
        break;
      }
      nextBottom = rotateBottom(nextBottom);
    }

    if (top !== 0 || bottom !== 0) {
      moves.push(`(${normalizeTurn(top)},${normalizeTurn(bottom)})`);
    }
  }

  return moves.join(' ');
};

const pathToTwistAlgorithm = (path: readonly number[]): string => {
  const tokens: string[] = [];
  let top = 0;
  let bottom = 0;

  for (const value of path) {
    if (value > 0) {
      top = normalizeTurn(value);
    } else if (value < 0) {
      bottom = normalizeTurn(value);
    } else {
      if (top === 0 && bottom === 0) tokens.push('/');
      else tokens.push(`(${top},${bottom})`, '/');
      top = 0;
      bottom = 0;
    }
  }

  if (top !== 0 || bottom !== 0) tokens.push(`(${top},${bottom})`);

  return tokens.join(' ');
};

const searchTwistMetric = (
  shape: number,
  depth: number,
  lastMoveWasSlash: boolean,
  path: number[],
  pruning: readonly number[],
): boolean => {
  if (depth === 0) return shape === SOLVED_SHAPE;
  if (pruning[getShapeIndex(shape)] > depth) return false;

  let topState = shape;
  for (let top = 0; top < 12; top += 1) {
    if (top !== 0) path.push(top);

    let bottomState = topState;
    for (let bottom = 0; bottom < 12; bottom += 1) {
      if (bottom !== 0) path.push(-bottom);

      if ((!lastMoveWasSlash || top !== 0 || bottom !== 0) && canTwist(bottomState)) {
        path.push(0);
        if (searchTwistMetric(twist(bottomState), depth - 1, true, path, pruning)) return true;
        path.pop();
      }

      if (bottom !== 0) path.pop();
      bottomState = rotateBottom(bottomState);
    }

    if (top !== 0) path.pop();
    topState = rotateTop(topState);
  }

  return false;
};

const solveTwistMetric = (shape: number, maxDepth: number): string => {
  const pruning = initTwistPruning();

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const path: number[] = [];
    if (searchTwistMetric(shape, depth, false, path, pruning)) return pathToTwistAlgorithm(path);
  }

  throw new NoSolverSolutionError('sq1-shape-twist', TARGET, maxDepth);
};

const countSquareOneMoves = (algorithm: string): number => splitAlgorithm(algorithm).length;

const resolveTargets = (
  method: SquareOneAssistMethod,
  targets: readonly string[] | undefined,
): void => {
  if (targets === undefined) return;

  for (const target of targets) {
    if (target !== TARGET) throw new UnknownSolverTargetError(method, target);
  }
};

const createResult = (
  method: SquareOneAssistMethod,
  scramble: string,
  options: PuzzleAssistOptions,
  solve: (shape: number, maxDepth: number) => string,
  defaultMaxDepth: number,
): PuzzleAssistResult<SquareOneAssistMethod> => {
  resolveTargets(method, options.targets);

  const shape = applyShapeAlgorithm(scramble);
  const maxDepth = options.maxDepth ?? defaultMaxDepth;
  const solution = solve(shape, maxDepth);
  const depth = countSquareOneMoves(solution);
  if (depth > maxDepth) throw new NoSolverSolutionError(method, TARGET, maxDepth);

  const results: PuzzleAssistSolution<SquareOneAssistMethod>[] = [
    {
      method,
      target: TARGET,
      targetLabel: 'Shape',
      setupRotation: '',
      solution,
      depth,
      metric: {
        ftm: depth,
        qtm: depth,
      },
    },
  ];

  return { method, scramble, solutions: results };
};

export const solveSquareOneShapeFaceTurnMetric = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'sq1-shape-ftm'> =>
  createResult(
    'sq1-shape-ftm',
    scramble,
    options,
    (shape, maxDepth) => solveFaceTurnMetric(shape, scramble, maxDepth),
    DEFAULT_FACE_TURN_MAX_DEPTH,
  ) as PuzzleAssistResult<'sq1-shape-ftm'>;

export const solveSquareOneShapeTwistMetric = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'sq1-shape-twist'> =>
  createResult(
    'sq1-shape-twist',
    scramble,
    options,
    solveTwistMetric,
    DEFAULT_TWIST_MAX_DEPTH,
  ) as PuzzleAssistResult<'sq1-shape-twist'>;
