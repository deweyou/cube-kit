export {
  InvalidSolverScrambleError,
  NoSolverSolutionError,
  SolverError,
  UnknownSolverMethodError,
  UnknownSolverTargetError,
  UnsupportedSolverMoveError,
} from './errors.js';
export type {
  PuzzleAssistEventId,
  PuzzleAssistMethod,
  PuzzleAssistMetric,
  PuzzleAssistOptions,
  PuzzleAssistResult,
  PuzzleAssistSolution,
  PyraminxAssistMethod,
  SquareOneAssistMethod,
  ThreeByThreeAssistMethod,
  ThreeByThreeAssistMetric,
  ThreeByThreeAssistOptions,
  ThreeByThreeAssistResult,
  ThreeByThreeAssistSolution,
  TwoByTwoAssistMethod,
} from './types.js';
import { solvePuzzleAssist as solvePuzzleAssistImpl } from './assist/facade.js';
import { solvePyraminxV as solvePyraminxVImpl } from './assist/pyraminx/v.js';
import {
  solveSquareOneShapeFaceTurnMetric as solveSquareOneShapeFaceTurnMetricImpl,
  solveSquareOneShapeTwistMetric as solveSquareOneShapeTwistMetricImpl,
} from './assist/square1/shape.js';
import {
  solveCross as solveCrossImpl,
  solveEOFC as solveEOFCImpl,
  solveXCross as solveXCrossImpl,
} from './assist/three-by-three/cross.js';
import { solveEOLine as solveEOLineImpl } from './assist/three-by-three/eoline.js';
import { solveThreeByThreeAssist as solveThreeByThreeAssistImpl } from './assist/three-by-three/facade.js';
import { solvePetrusS1 as solvePetrusS1Impl } from './assist/three-by-three/petrus.js';
import { solveRouxS1 as solveRouxS1Impl } from './assist/three-by-three/roux.js';
import {
  solveTwoByTwoFace as solveTwoByTwoFaceImpl,
  solveTwoByTwoLayer as solveTwoByTwoLayerImpl,
} from './assist/two-by-two/face-layer.js';
import type {
  PuzzleAssistEventId,
  PuzzleAssistMethod,
  PuzzleAssistOptions,
  PuzzleAssistResult,
  ThreeByThreeAssistMethod,
  ThreeByThreeAssistOptions,
  ThreeByThreeAssistResult,
} from './types.js';

export const solveCross = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveCrossImpl(scramble, options);

export const solveXCross = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveXCrossImpl(scramble, options);

export const solveEOLine = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveEOLineImpl(scramble, options);

export const solveEOFC = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveEOFCImpl(scramble, options);

export const solveRouxS1 = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveRouxS1Impl(scramble, options);

export const solvePetrusS1 = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solvePetrusS1Impl(scramble, options);

export const solveThreeByThreeAssist = (
  scramble: string,
  methods: readonly ThreeByThreeAssistMethod[],
  options: ThreeByThreeAssistOptions = {},
): readonly ThreeByThreeAssistResult[] => solveThreeByThreeAssistImpl(scramble, methods, options);

export const solveTwoByTwoFace = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'222-face'> => solveTwoByTwoFaceImpl(scramble, options);

export const solveTwoByTwoLayer = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'222-layer'> => solveTwoByTwoLayerImpl(scramble, options);

export const solveSquareOneShapeFaceTurnMetric = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'sq1-shape-ftm'> => solveSquareOneShapeFaceTurnMetricImpl(scramble, options);

export const solveSquareOneShapeTwistMetric = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'sq1-shape-twist'> => solveSquareOneShapeTwistMetricImpl(scramble, options);

export const solvePyraminxV = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'pyraminx-v'> => solvePyraminxVImpl(scramble, options);

export const solvePuzzleAssist = (
  eventId: PuzzleAssistEventId,
  methods: readonly PuzzleAssistMethod[],
  scramble: string,
  options: PuzzleAssistOptions = {},
): readonly PuzzleAssistResult[] => solvePuzzleAssistImpl(eventId, methods, scramble, options);
