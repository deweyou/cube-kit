import {
  applyClockMove,
  applySquareOneMove,
  createSolvedClockState,
  createSolvedSquareOneState,
  parseClockMove,
  parseCubeMove,
  parseSquareOneAlgorithm,
  splitAlgorithm,
  type ClockMove,
} from '@cubegin/scramble-puzzle';
import { NoSolverSolutionError, SolverError, UnsupportedSolverMoveError } from '../errors.js';
import { SearchWCA } from './min2phase/search-wca.js';
import { fromScramble } from './min2phase/tools.js';
import { PyraminxSolver } from './pyraminx-solver.js';
import { solveSquareOneStateIn } from './sq12phase/search.js';
import { SkewbSolver } from './skewb-solver.js';
import { Search as FourByFourThreephaseSearch } from './threephase/search.js';
import { TwoByTwoSolver } from './two-by-two-solver.js';
import type { PuzzleFullEventId, PuzzleFullOptions, PuzzleFullResult } from '../types.js';

const THREE_BY_THREE_MAX_DEPTH = 21;
const THREE_BY_THREE_PROBE_MAX = 100_000;
const THREE_BY_THREE_PROBE_MIN = 0;
const TWO_BY_TWO_MAX_DEPTH = 20;
const PYRAMINX_MAX_DEPTH = 20;
const SKEWB_MAX_DEPTH = 12;
const SQUARE_ONE_MAX_DEPTH = 31;
const ZERO_RANDOM = { nextInt: () => 0 };
const FOUR_BY_FOUR_MOVE_PATTERN = /^([URFDLB])w?(2|')?$/;

export const solvePuzzleFull = <EventId extends PuzzleFullEventId>(
  eventId: EventId,
  scramble: string,
  options: PuzzleFullOptions = {},
): PuzzleFullResult<EventId> => {
  switch (eventId) {
    case '333':
      return createResult(eventId, scramble, solveThreeByThree(scramble, options), 'min2phase');
    case '444':
      return createResult(eventId, scramble, solveFourByFour(scramble), 'threephase');
    case '222':
      return createResult(
        eventId,
        scramble,
        solveTwoByTwo(scramble, options),
        'two-by-two-coordinate',
      );
    case 'pyram':
      return createResult(
        eventId,
        scramble,
        solvePyraminx(scramble, options),
        'pyraminx-coordinate',
      );
    case 'skewb':
      return createResult(eventId, scramble, solveSkewb(scramble, options), 'skewb-coordinate');
    case 'sq1':
      return createResult(
        eventId,
        scramble,
        solveSquareOne(scramble, options),
        'square-one-two-phase',
      );
    case 'clock':
      return createResult(eventId, scramble, solveClock(scramble), 'clock-inverse');
    default:
      throw new SolverError(`unsupported full solver event: ${String(eventId)}`);
  }
};

const solveThreeByThree = (scramble: string, options: PuzzleFullOptions): string => {
  validateThreeByThreeScramble(scramble);

  const solution = new SearchWCA()
    .solution(
      fromScramble(scramble),
      options.maxDepth ?? THREE_BY_THREE_MAX_DEPTH,
      THREE_BY_THREE_PROBE_MAX,
      THREE_BY_THREE_PROBE_MIN,
      0,
    )
    .trim();
  if (solution.startsWith('Error')) {
    throw new NoSolverSolutionError(
      '333-full',
      'cube',
      options.maxDepth ?? THREE_BY_THREE_MAX_DEPTH,
    );
  }

  return solution;
};

const solveFourByFour = (scramble: string): string => {
  validateFourByFourScramble(scramble);

  const search = new FourByFourThreephaseSearch();
  search.inverseSolution = false;

  return search.solve(scramble).trim();
};

const solveTwoByTwo = (scramble: string, options: PuzzleFullOptions): string => {
  const solver = new TwoByTwoSolver();
  const solution = solver.solveIn(
    solver.stateFromScramble(scramble),
    options.maxDepth ?? TWO_BY_TWO_MAX_DEPTH,
  );
  if (solution === null) {
    throw new NoSolverSolutionError('222-full', 'cube', options.maxDepth ?? TWO_BY_TWO_MAX_DEPTH);
  }

  return solution;
};

const solvePyraminx = (scramble: string, options: PuzzleFullOptions): string => {
  const solver = new PyraminxSolver();
  const solution = solver.solveIn(
    solver.stateFromScramble(scramble),
    options.maxDepth ?? PYRAMINX_MAX_DEPTH,
    true,
    ZERO_RANDOM,
  );
  if (solution === null) {
    throw new NoSolverSolutionError(
      'pyraminx-full',
      'pyraminx',
      options.maxDepth ?? PYRAMINX_MAX_DEPTH,
    );
  }

  return solution;
};

const solveSkewb = (scramble: string, options: PuzzleFullOptions): string => {
  const solver = new SkewbSolver();
  const solution = solver.solveIn(
    solver.stateFromScramble(scramble),
    options.maxDepth ?? SKEWB_MAX_DEPTH,
    ZERO_RANDOM,
  );
  if (solution === null) {
    throw new NoSolverSolutionError('skewb-full', 'skewb', options.maxDepth ?? SKEWB_MAX_DEPTH);
  }

  return solution;
};

const solveSquareOne = (scramble: string, options: PuzzleFullOptions): string => {
  const state = parseSquareOneAlgorithm(scramble).reduce(
    (nextState, move) => applySquareOneMove(nextState, move),
    createSolvedSquareOneState(),
  );
  const solution = solveSquareOneStateIn(state, options.maxDepth ?? SQUARE_ONE_MAX_DEPTH);
  if (solution === null) {
    throw new NoSolverSolutionError(
      'sq1-full',
      'square-one',
      options.maxDepth ?? SQUARE_ONE_MAX_DEPTH,
    );
  }

  return solution;
};

const solveClock = (scramble: string): string => {
  const moves = splitAlgorithm(scramble).map(parseClockMove);
  moves.reduce((state, move) => applyClockMove(state, move), createSolvedClockState());

  return moves
    .slice()
    .reverse()
    .flatMap((move) => formatInverseClockMove(move))
    .join(' ');
};

const validateThreeByThreeScramble = (scramble: string): void => {
  for (const token of splitAlgorithm(scramble)) {
    const move = parseCubeMove(token);
    if (move.isRotation || move.width !== 1) throw new UnsupportedSolverMoveError(token);
  }
};

const validateFourByFourScramble = (scramble: string): void => {
  for (const token of splitAlgorithm(scramble)) {
    if (!FOUR_BY_FOUR_MOVE_PATTERN.test(token)) throw new UnsupportedSolverMoveError(token);
  }
};

const formatInverseClockMove = (move: ClockMove): readonly string[] => {
  if (move.type === 'rotation') return ['y2'];
  if (move.amount === 0) return [];
  if (move.amount === 6) return [`${move.name}6+`];

  return [`${move.name}${move.amount}${move.direction === '+' ? '-' : '+'}`];
};

const createResult = <EventId extends PuzzleFullEventId>(
  eventId: EventId,
  scramble: string,
  solution: string,
  engine: PuzzleFullResult<EventId>['engine'],
): PuzzleFullResult<EventId> => ({
  eventId,
  scramble,
  solution,
  moveCount: countMoves(solution),
  engine,
});

const countMoves = (algorithm: string): number =>
  splitAlgorithm(algorithm).filter((token) => token !== 'y2').length;
