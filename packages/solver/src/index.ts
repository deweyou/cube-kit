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
  PuzzleFullEngine,
  PuzzleFullEventId,
  PuzzleFullOptions,
  PuzzleFullResult,
  PyraminxAssistMethod,
  SkewbAssistMethod,
  SquareOneAssistMethod,
  ThreeByThreeAssistMethod,
  ThreeByThreeAssistMetric,
  ThreeByThreeAssistOptions,
  ThreeByThreeAssistResult,
  ThreeByThreeAssistSolution,
  TwoByTwoAssistMethod,
} from './types.js';
export type { RandomSource } from './random-source.js';
export { solvePuzzleFull } from './full/facade.js';
export { ClockSolver } from './full/clock-solver.js';
export type { ClockSolverSolution } from './full/clock-solver.js';
export { SearchWCA } from './full/min2phase/search-wca.js';
export { Search as Min2PhaseSearch } from './full/min2phase/search.js';
export { randomCube, randomState as randomThreeByThreeState } from './full/min2phase/tools.js';
export {
  axisForRestriction,
  INVERSE_SOLUTION as MIN2PHASE_INVERSE_SOLUTION,
  splitAlgorithm as splitMin2PhaseAlgorithm,
} from './full/min2phase/util.js';
export { PyraminxSolver } from './full/pyraminx-solver.js';
export type { PyraminxSolverState } from './full/pyraminx-solver.js';
export { SkewbSolver } from './full/skewb-solver.js';
export type { SkewbSolverState } from './full/skewb-solver.js';
export { FullCube as SquareOneFullCube } from './full/sq12phase/full-cube.js';
export {
  INVERSE_SOLUTION as SQUARE_ONE_INVERSE_SOLUTION,
  Search as SquareOneSearch,
  solveSquareOneStateIn,
} from './full/sq12phase/search.js';
export { Search as FourByFourThreephaseSearch } from './full/threephase/search.js';
export { TwoByTwoSolver } from './full/two-by-two-solver.js';
export type { TwoByTwoState } from './full/two-by-two-solver.js';
import { solvePuzzleAssist as solvePuzzleAssistImpl } from './assist/facade.js';
import { solvePyraminxV as solvePyraminxVImpl } from './assist/pyraminx/v.js';
import { solveSkewbFace as solveSkewbFaceImpl } from './assist/skewb/face.js';
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
  solveBlock222 as solveBlock222Impl,
  solveCfopF2L as solveCfopF2LImpl,
  solveEODR as solveEODRImpl,
  solvePetrusS2 as solvePetrusS2Impl,
  solveRouxS2 as solveRouxS2Impl,
  solveThreeByThreeGeneral as solveThreeByThreeGeneralImpl,
  solveThreeByThreeTwoPhase as solveThreeByThreeTwoPhaseImpl,
  solveZZF2L as solveZZF2LImpl,
} from './assist/three-by-three/stage-mask.js';
import {
  solveTwoByTwoFace as solveTwoByTwoFaceImpl,
  solveTwoByTwoLayer as solveTwoByTwoLayerImpl,
} from './assist/two-by-two/face-layer.js';
import type {
  PuzzleAssistEventId,
  PuzzleAssistMethod,
  PuzzleAssistOptions,
  PuzzleAssistResult,
  SkewbAssistMethod,
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

export const solveCfopF2L = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveCfopF2LImpl(scramble, options);

export const solveRouxS2 = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveRouxS2Impl(scramble, options);

export const solvePetrusS2 = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solvePetrusS2Impl(scramble, options);

export const solveZZF2L = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveZZF2LImpl(scramble, options);

export const solveBlock222 = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveBlock222Impl(scramble, options);

export const solveEODR = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveEODRImpl(scramble, options);

export const solveThreeByThreeTwoPhase = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveThreeByThreeTwoPhaseImpl(scramble, options);

export const solveThreeByThreeGeneral = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveThreeByThreeGeneralImpl(scramble, options);

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

export const solveSkewbFace = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<SkewbAssistMethod> => solveSkewbFaceImpl(scramble, options);

export const solvePuzzleAssist = (
  eventId: PuzzleAssistEventId,
  methods: readonly PuzzleAssistMethod[],
  scramble: string,
  options: PuzzleAssistOptions = {},
): readonly PuzzleAssistResult[] => solvePuzzleAssistImpl(eventId, methods, scramble, options);
