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
type SearchMove = Readonly<{
  face: SkewbAxis;
  amount: 1 | 2;
  token: string;
}>;

const SEARCH_MOVES: readonly SearchMove[] = SKEWB_AXES.flatMap((face) => [
  { face, amount: 1, token: face },
  { face, amount: 2, token: `${face}'` },
]);

const SOLVED_STATE = createSolvedSkewbState();

const isKnownTarget = (target: string): target is SkewbFaceTarget =>
  TARGETS.includes(target as SkewbFaceTarget);

const targetIndex = (target: SkewbFace): number => TARGETS.indexOf(target);

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

  return state.image[face].every(
    (sticker, stickerIndex) => sticker === SOLVED_STATE.image[face][stickerIndex],
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
