import {
  applyCubeMove,
  createSolvedCubeState,
  parseCubeAlgorithm,
  splitAlgorithm,
  type CubeFace,
  type CubeMove,
  type CubeState,
} from '@cubegin/scramble-puzzle';
import {
  InvalidSolverScrambleError,
  NoSolverSolutionError,
  UnknownSolverTargetError,
  UnsupportedSolverMoveError,
} from '../../errors.js';
import type {
  PuzzleAssistOptions,
  PuzzleAssistResult,
  PuzzleAssistSolution,
  TwoByTwoAssistMethod,
} from '../../types.js';
import { countFaceTurnMetric, countQuarterTurnMetric } from '../three-by-three/metrics.js';

const TARGETS = ['D', 'U', 'L', 'R', 'F', 'B'] as const;
const FACE_ORDER = ['R', 'U', 'F', 'L', 'D', 'B'] as const satisfies readonly CubeFace[];
const SEARCH_FACES = ['U', 'R', 'F'] as const satisfies readonly CubeFace[];
const SEARCH_FACE_SET = new Set<CubeFace>(SEARCH_FACES);
const SUFFIXES = ['', '2', "'"] as const;
const DEFAULT_MAX_DEPTH = 7;

type TwoByTwoTarget = (typeof TARGETS)[number];
type StickerCoordinate = readonly [face: CubeFace, row: number, column: number];
type SearchMove = Readonly<{
  face: CubeFace;
  amount: 1 | 2 | 3;
  token: string;
}>;

const SEARCH_MOVES: readonly SearchMove[] = SEARCH_FACES.flatMap((face) =>
  ([1, 2, 3] as const).map((amount) => ({
    face,
    amount,
    token: `${face}${SUFFIXES[amount - 1]}`,
  })),
);

const SOLVED_STATE = createSolvedCubeState(2);

const faceIndex = (face: CubeFace): number => FACE_ORDER.indexOf(face);

const moveToString = (move: CubeMove): string => {
  if (move.isRotation) return move.face;

  return `${move.face}${SUFFIXES[move.amount - 1]}`;
};

const parseTwoByTwoSolverAlgorithm = (algorithm: string): readonly CubeMove[] => {
  try {
    const tokens = splitAlgorithm(algorithm);
    const moves = tokens.map(parseCubeAlgorithm).flat();

    for (const [index, move] of moves.entries()) {
      if (move.isRotation || move.width !== 1 || !SEARCH_FACE_SET.has(move.face)) {
        throw new UnsupportedSolverMoveError(tokens[index] ?? moveToString(move));
      }
    }

    return moves;
  } catch (error) {
    if (error instanceof UnsupportedSolverMoveError) throw error;

    throw new InvalidSolverScrambleError(algorithm, error);
  }
};

const applyAlgorithm = (algorithm: string): CubeState => {
  const moves = parseTwoByTwoSolverAlgorithm(algorithm);

  return moves.reduce((state, move) => applyCubeMove(state, move), SOLVED_STATE);
};

const applySearchMove = (state: CubeState, move: SearchMove): CubeState =>
  applyCubeMove(state, {
    face: move.face,
    amount: move.amount,
    width: 1,
    isRotation: false,
  });

const stringifyMoves = (moves: readonly SearchMove[]): string =>
  moves.map((move) => move.token).join(' ');

const stateKey = (state: CubeState): string =>
  state.image.map((face) => face.map((row) => row.join('')).join('')).join('|');

const isKnownTarget = (target: string): target is TwoByTwoTarget =>
  TARGETS.includes(target as TwoByTwoTarget);

const resolveTargets = (
  method: TwoByTwoAssistMethod,
  targets: readonly string[] | undefined,
): readonly TwoByTwoTarget[] => {
  if (targets === undefined) return TARGETS;

  return targets.map((target) => {
    if (!isKnownTarget(target)) throw new UnknownSolverTargetError(method, target);

    return target;
  });
};

const isStickerSolved = (state: CubeState, [face, row, column]: StickerCoordinate): boolean =>
  state.image[faceIndex(face)][row][column] === SOLVED_STATE.image[faceIndex(face)][row][column];

const faceCoordinates = (face: CubeFace): readonly StickerCoordinate[] => [
  [face, 0, 0],
  [face, 0, 1],
  [face, 1, 0],
  [face, 1, 1],
];

const layerCoordinates = (target: TwoByTwoTarget): readonly StickerCoordinate[] => {
  switch (target) {
    case 'D':
      return [
        ...faceCoordinates('D'),
        ['F', 1, 0],
        ['F', 1, 1],
        ['R', 1, 0],
        ['R', 1, 1],
        ['B', 1, 0],
        ['B', 1, 1],
        ['L', 1, 0],
        ['L', 1, 1],
      ];
    case 'U':
      return [
        ...faceCoordinates('U'),
        ['F', 0, 0],
        ['F', 0, 1],
        ['R', 0, 0],
        ['R', 0, 1],
        ['B', 0, 0],
        ['B', 0, 1],
        ['L', 0, 0],
        ['L', 0, 1],
      ];
    case 'L':
      return [
        ...faceCoordinates('L'),
        ['U', 0, 0],
        ['U', 1, 0],
        ['F', 0, 0],
        ['F', 1, 0],
        ['D', 0, 0],
        ['D', 1, 0],
        ['B', 0, 1],
        ['B', 1, 1],
      ];
    case 'R':
      return [
        ...faceCoordinates('R'),
        ['U', 0, 1],
        ['U', 1, 1],
        ['F', 0, 1],
        ['F', 1, 1],
        ['D', 0, 1],
        ['D', 1, 1],
        ['B', 0, 0],
        ['B', 1, 0],
      ];
    case 'F':
      return [
        ...faceCoordinates('F'),
        ['U', 1, 0],
        ['U', 1, 1],
        ['R', 0, 0],
        ['R', 1, 0],
        ['D', 0, 0],
        ['D', 0, 1],
        ['L', 0, 1],
        ['L', 1, 1],
      ];
    case 'B':
      return [
        ...faceCoordinates('B'),
        ['U', 0, 0],
        ['U', 0, 1],
        ['R', 0, 1],
        ['R', 1, 1],
        ['D', 1, 0],
        ['D', 1, 1],
        ['L', 0, 0],
        ['L', 1, 0],
      ];
  }
};

const isFaceTargetSolved = (state: CubeState, target: TwoByTwoTarget): boolean =>
  faceCoordinates(target).every((coordinate) => isStickerSolved(state, coordinate));

const isLayerTargetSolved = (state: CubeState, target: TwoByTwoTarget): boolean =>
  layerCoordinates(target).every((coordinate) => isStickerSolved(state, coordinate));

const composeAlgorithm = (scramble: string, solution: string): string =>
  [scramble.trim(), solution.trim()].filter(Boolean).join(' ');

export const isTwoByTwoFaceSolved = (
  scramble: string,
  solution: Pick<PuzzleAssistSolution<'222-face'>, 'solution' | 'target'>,
): boolean => {
  if (!isKnownTarget(solution.target)) return false;

  return isFaceTargetSolved(
    applyAlgorithm(composeAlgorithm(scramble, solution.solution)),
    solution.target,
  );
};

export const isTwoByTwoLayerSolved = (
  scramble: string,
  solution: Pick<PuzzleAssistSolution<'222-layer'>, 'solution' | 'target'>,
): boolean => {
  if (!isKnownTarget(solution.target)) return false;

  return isLayerTargetSolved(
    applyAlgorithm(composeAlgorithm(scramble, solution.solution)),
    solution.target,
  );
};

const search = (
  state: CubeState,
  target: TwoByTwoTarget,
  isTargetSolved: (state: CubeState, target: TwoByTwoTarget) => boolean,
  maxDepth: number,
): readonly SearchMove[] | undefined => {
  if (isTargetSolved(state, target)) return [];

  type QueueEntry = Readonly<{
    state: CubeState;
    moves: readonly SearchMove[];
    lastFace: CubeFace | undefined;
  }>;

  const queue: QueueEntry[] = [{ state, moves: [], lastFace: undefined }];
  const visited = new Set<string>([stateKey(state)]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const entry = queue[cursor];
    if (entry.moves.length >= maxDepth) continue;

    for (const move of SEARCH_MOVES) {
      if (move.face === entry.lastFace) continue;

      const nextState = applySearchMove(entry.state, move);
      const nextMoves = [...entry.moves, move];

      if (isTargetSolved(nextState, target)) return nextMoves;

      const key = stateKey(nextState);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          state: nextState,
          moves: nextMoves,
          lastFace: move.face,
        });
      }
    }
  }

  return undefined;
};

const solveTwoByTwo = (
  method: TwoByTwoAssistMethod,
  scramble: string,
  options: PuzzleAssistOptions,
  isTargetSolved: (state: CubeState, target: TwoByTwoTarget) => boolean,
): PuzzleAssistResult<TwoByTwoAssistMethod> => {
  const scrambleState = applyAlgorithm(scramble);
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const targetIds = resolveTargets(method, options.targets);
  const solutionLimit = options.maxSolutionsPerTarget ?? 1;
  const solutions: PuzzleAssistSolution<TwoByTwoAssistMethod>[] = [];

  for (const target of targetIds) {
    for (let index = 0; index < solutionLimit; index += 1) {
      const found = search(scrambleState, target, isTargetSolved, maxDepth);
      if (found === undefined) throw new NoSolverSolutionError(method, target, maxDepth);

      const solution = stringifyMoves(found);
      solutions.push({
        method,
        target,
        targetLabel: target,
        setupRotation: '',
        solution,
        depth: found.length,
        metric: {
          ftm: countFaceTurnMetric(solution),
          qtm: countQuarterTurnMetric(solution),
        },
      });
      break;
    }
  }

  return { method, scramble, solutions };
};

export const solveTwoByTwoFace = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'222-face'> =>
  solveTwoByTwo(
    '222-face',
    scramble,
    options,
    isFaceTargetSolved,
  ) as PuzzleAssistResult<'222-face'>;

export const solveTwoByTwoLayer = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'222-layer'> =>
  solveTwoByTwo(
    '222-layer',
    scramble,
    options,
    isLayerTargetSolved,
  ) as PuzzleAssistResult<'222-layer'>;
