import {
  applySkewbMove,
  createSolvedSkewbState,
  parseSkewbAlgorithm,
  SKEWB_AXES,
  SKEWB_FACES,
  type SkewbAxis,
  type SkewbFace,
  type SkewbMove,
  type SkewbState,
} from '@cubegin/scramble-puzzle';
import {
  InvalidSolverScrambleError,
  NoSolverSolutionError,
  UnknownSolverTargetError,
} from '../../errors.js';
import type { PuzzleAssistOptions, PuzzleAssistResult, PuzzleAssistSolution } from '../../types.js';
import { countFaceTurnMetric, countQuarterTurnMetric } from '../three-by-three/metrics.js';

const TARGETS = SKEWB_FACES;
const DEFAULT_MAX_DEPTH = 7;

type SkewbFaceTarget = (typeof TARGETS)[number];
type SkewbCorner = 'UBL' | 'UBR' | 'UFR' | 'UFL' | 'DFL' | 'DFR' | 'DBR' | 'DBL';
type SkewbCornerSticker = Readonly<{
  face: SkewbFace;
  sticker: 1 | 2 | 3 | 4;
}>;
type SearchMove = Readonly<{
  face: SkewbAxis;
  amount: 1 | 2;
  token: string;
}>;

const CORNER_STICKERS: Readonly<Record<SkewbCorner, readonly SkewbCornerSticker[]>> = {
  UBL: [
    { face: 'U', sticker: 1 },
    { face: 'L', sticker: 1 },
    { face: 'B', sticker: 2 },
  ],
  UBR: [
    { face: 'U', sticker: 2 },
    { face: 'R', sticker: 2 },
    { face: 'B', sticker: 1 },
  ],
  UFR: [
    { face: 'U', sticker: 4 },
    { face: 'F', sticker: 2 },
    { face: 'R', sticker: 1 },
  ],
  UFL: [
    { face: 'U', sticker: 3 },
    { face: 'F', sticker: 1 },
    { face: 'L', sticker: 2 },
  ],
  DFL: [
    { face: 'D', sticker: 1 },
    { face: 'F', sticker: 3 },
    { face: 'L', sticker: 4 },
  ],
  DFR: [
    { face: 'D', sticker: 2 },
    { face: 'F', sticker: 4 },
    { face: 'R', sticker: 3 },
  ],
  DBR: [
    { face: 'D', sticker: 4 },
    { face: 'R', sticker: 4 },
    { face: 'B', sticker: 3 },
  ],
  DBL: [
    { face: 'D', sticker: 3 },
    { face: 'L', sticker: 3 },
    { face: 'B', sticker: 4 },
  ],
};

const FACE_CORNER_ORDER: Readonly<Record<SkewbFaceTarget, readonly SkewbCorner[]>> = {
  U: ['UBL', 'UBR', 'UFR', 'UFL'],
  R: ['UFR', 'UBR', 'DBR', 'DFR'],
  F: ['UFL', 'UFR', 'DFR', 'DFL'],
  D: ['DFL', 'DFR', 'DBR', 'DBL'],
  L: ['UBL', 'UFL', 'DFL', 'DBL'],
  B: ['UBR', 'UBL', 'DBL', 'DBR'],
};

const SEARCH_MOVES: readonly SearchMove[] = SKEWB_AXES.flatMap((face) => [
  { face, amount: 1, token: face },
  { face, amount: 2, token: `${face}'` },
]);

const SOLVED_STATE = createSolvedSkewbState();

const isKnownTarget = (target: string): target is SkewbFaceTarget =>
  TARGETS.includes(target as SkewbFaceTarget);

const targetIndex = (target: SkewbFace): number => TARGETS.indexOf(target);

const cornerColorMask = (state: SkewbState, corner: SkewbCorner): number =>
  CORNER_STICKERS[corner].reduce(
    (mask, coordinate) =>
      mask | (1 << state.image[targetIndex(coordinate.face)][coordinate.sticker]),
    0,
  );

const cornerOrder = (state: SkewbState, target: SkewbFaceTarget): readonly number[] =>
  FACE_CORNER_ORDER[target].map((corner) => cornerColorMask(state, corner));

const SOLVED_CORNER_ORDERS = {
  U: cornerOrder(SOLVED_STATE, 'U'),
  R: cornerOrder(SOLVED_STATE, 'R'),
  F: cornerOrder(SOLVED_STATE, 'F'),
  D: cornerOrder(SOLVED_STATE, 'D'),
  L: cornerOrder(SOLVED_STATE, 'L'),
  B: cornerOrder(SOLVED_STATE, 'B'),
} satisfies Readonly<Record<SkewbFaceTarget, readonly number[]>>;

export const hasSameCyclicOrder = (
  actual: readonly number[],
  expected: readonly number[],
): boolean => {
  if (actual.length !== expected.length) return false;
  if (actual.length === 0) return true;

  return expected.some((_, offset) =>
    actual.every(
      (cornerIdentity, index) => cornerIdentity === expected[(index + offset) % expected.length],
    ),
  );
};

const parseSkewbSolverAlgorithm = (algorithm: string): readonly SkewbMove[] => {
  try {
    return parseSkewbAlgorithm(algorithm);
  } catch (error) {
    throw new InvalidSolverScrambleError(algorithm, error);
  }
};

const applyAlgorithm = (algorithm: string): SkewbState =>
  parseSkewbSolverAlgorithm(algorithm).reduce(
    (state, move) => applySkewbMove(state, move),
    SOLVED_STATE,
  );

const applySearchMove = (state: SkewbState, move: SearchMove): SkewbState =>
  applySkewbMove(state, {
    face: move.face,
    amount: move.amount,
  });

const stateKey = (state: SkewbState): string => state.image.map((face) => face.join('')).join('|');

const isFaceTargetSolved = (state: SkewbState, target: SkewbFaceTarget): boolean => {
  const face = targetIndex(target);

  const isTargetFaceMonochrome = state.image[face].every(
    (sticker, stickerIndex) => sticker === SOLVED_STATE.image[face][stickerIndex],
  );

  return (
    isTargetFaceMonochrome &&
    hasSameCyclicOrder(cornerOrder(state, target), SOLVED_CORNER_ORDERS[target])
  );
};

const resolveTargets = (targets: readonly string[] | undefined): readonly SkewbFaceTarget[] => {
  if (targets === undefined) return TARGETS;

  return targets.map((target) => {
    if (!isKnownTarget(target)) throw new UnknownSolverTargetError('skewb-face', target);

    return target;
  });
};

const stringifyMoves = (moves: readonly SearchMove[]): string =>
  moves.map((move) => move.token).join(' ');

const search = (
  state: SkewbState,
  target: SkewbFaceTarget,
  maxDepth: number,
): readonly SearchMove[] | undefined => {
  if (isFaceTargetSolved(state, target)) return [];

  type QueueEntry = Readonly<{
    state: SkewbState;
    moves: readonly SearchMove[];
    lastFace: SkewbAxis | undefined;
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

      if (isFaceTargetSolved(nextState, target)) return nextMoves;

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

const composeAlgorithm = (scramble: string, solution: string): string =>
  [scramble.trim(), solution.trim()].filter(Boolean).join(' ');

export const isSkewbFaceSolved = (
  scramble: string,
  solution: Pick<PuzzleAssistSolution<'skewb-face'>, 'solution' | 'target'>,
): boolean => {
  if (!isKnownTarget(solution.target)) return false;

  return isFaceTargetSolved(
    applyAlgorithm(composeAlgorithm(scramble, solution.solution)),
    solution.target,
  );
};

const createSolution = (
  target: SkewbFaceTarget,
  moves: readonly SearchMove[],
): PuzzleAssistSolution<'skewb-face'> => {
  const solution = stringifyMoves(moves);

  return {
    method: 'skewb-face',
    target,
    targetLabel: `${target} face`,
    setupRotation: '',
    solution,
    depth: moves.length,
    metric: {
      ftm: countFaceTurnMetric(solution),
      qtm: countQuarterTurnMetric(solution),
    },
  };
};

export const solveSkewbFace = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'skewb-face'> => {
  const state = applyAlgorithm(scramble);
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const solutions = resolveTargets(options.targets).map((target) => {
    const moves = search(state, target, maxDepth);
    if (!moves) throw new NoSolverSolutionError('skewb-face', target, maxDepth);

    return createSolution(target, moves);
  });

  return { method: 'skewb-face', scramble, solutions };
};
