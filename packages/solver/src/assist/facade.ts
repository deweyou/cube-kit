import { UnknownSolverMethodError } from '../errors.js';
import { solvePyraminxV } from './pyraminx/v.js';
import { solveSkewbFace } from './skewb/face.js';
import {
  solveSquareOneShapeFaceTurnMetric,
  solveSquareOneShapeTwistMetric,
} from './square1/shape.js';
import { solveThreeByThreeAssist } from './three-by-three/facade.js';
import { solveTwoByTwoFace, solveTwoByTwoLayer } from './two-by-two/face-layer.js';
import type {
  PuzzleAssistEventId,
  PuzzleAssistMethod,
  PuzzleAssistOptions,
  PuzzleAssistResult,
  SkewbAssistMethod,
  SquareOneAssistMethod,
  ThreeByThreeAssistMethod,
  TwoByTwoAssistMethod,
} from '../types.js';

type MethodSolver<Method extends PuzzleAssistMethod> = (
  scramble: string,
  options?: PuzzleAssistOptions,
) => PuzzleAssistResult<Method>;

const TWO_BY_TWO_SOLVERS = {
  '222-face': solveTwoByTwoFace,
  '222-layer': solveTwoByTwoLayer,
} satisfies Record<TwoByTwoAssistMethod, MethodSolver<TwoByTwoAssistMethod>>;

const SQUARE_ONE_SOLVERS = {
  'sq1-shape-ftm': solveSquareOneShapeFaceTurnMetric,
  'sq1-shape-twist': solveSquareOneShapeTwistMetric,
} satisfies Record<SquareOneAssistMethod, MethodSolver<SquareOneAssistMethod>>;

const SKEWB_SOLVERS = {
  'skewb-face': solveSkewbFace,
} satisfies Record<SkewbAssistMethod, MethodSolver<SkewbAssistMethod>>;

const isThreeByThreeMethod = (method: PuzzleAssistMethod): method is ThreeByThreeAssistMethod =>
  method === 'cross' ||
  method === 'xcross' ||
  method === 'eoline' ||
  method === 'eofc' ||
  method === 'roux-s1' ||
  method === 'roux-s2' ||
  method === 'petrus-s1' ||
  method === 'petrus-s2' ||
  method === 'cfop-f2l' ||
  method === 'zz-f2l' ||
  method === 'block-222' ||
  method === 'eo-dr' ||
  method === '333-two-phase' ||
  method === '333-general';

const isTwoByTwoMethod = (method: PuzzleAssistMethod): method is TwoByTwoAssistMethod =>
  method in TWO_BY_TWO_SOLVERS;

const isSquareOneMethod = (method: PuzzleAssistMethod): method is SquareOneAssistMethod =>
  method in SQUARE_ONE_SOLVERS;

const isSkewbMethod = (method: PuzzleAssistMethod): method is SkewbAssistMethod =>
  method in SKEWB_SOLVERS;

const assertEventMethod = (eventId: PuzzleAssistEventId, method: PuzzleAssistMethod): void => {
  if (eventId === '333' && isThreeByThreeMethod(method)) return;
  if (eventId === '222' && isTwoByTwoMethod(method)) return;
  if (eventId === 'sq1' && isSquareOneMethod(method)) return;
  if (eventId === 'pyram' && method === 'pyraminx-v') return;
  if (eventId === 'skewb' && isSkewbMethod(method)) return;

  throw new UnknownSolverMethodError(method);
};

export const solvePuzzleAssist = (
  eventId: PuzzleAssistEventId,
  methods: readonly PuzzleAssistMethod[],
  scramble: string,
  options: PuzzleAssistOptions = {},
): readonly PuzzleAssistResult[] => {
  for (const method of methods) {
    assertEventMethod(eventId, method);
  }

  if (eventId === '333') {
    return solveThreeByThreeAssist(
      scramble,
      methods as readonly ThreeByThreeAssistMethod[],
      options,
    );
  }

  if (eventId === '222') {
    return (methods as readonly TwoByTwoAssistMethod[]).map((method) =>
      TWO_BY_TWO_SOLVERS[method](scramble, options),
    );
  }

  if (eventId === 'sq1') {
    return (methods as readonly SquareOneAssistMethod[]).map((method) =>
      SQUARE_ONE_SOLVERS[method](scramble, options),
    );
  }

  if (eventId === 'pyram') {
    return methods.map(() => solvePyraminxV(scramble, options));
  }

  if (eventId === 'skewb') {
    return (methods as readonly SkewbAssistMethod[]).map((method) =>
      SKEWB_SOLVERS[method](scramble, options),
    );
  }

  throw new UnknownSolverMethodError(eventId);
};
