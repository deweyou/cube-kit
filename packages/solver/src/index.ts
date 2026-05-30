export {
  InvalidSolverScrambleError,
  NoSolverSolutionError,
  SolverError,
  UnknownSolverMethodError,
  UnknownSolverTargetError,
  UnsupportedSolverMoveError,
} from './errors.js';
export type {
  ThreeByThreeAssistMethod,
  ThreeByThreeAssistMetric,
  ThreeByThreeAssistOptions,
  ThreeByThreeAssistResult,
  ThreeByThreeAssistSolution,
} from './types.js';
import { SolverError } from './errors.js';
import {
  solveCross as solveCrossImpl,
  solveEOFC as solveEOFCImpl,
  solveXCross as solveXCrossImpl,
} from './three-by-three/cross.js';
import type {
  ThreeByThreeAssistMethod,
  ThreeByThreeAssistOptions,
  ThreeByThreeAssistResult,
} from './types.js';

const notImplemented = (): never => {
  throw new SolverError('not implemented');
};

export const solveCross = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveCrossImpl(scramble, options);

export const solveXCross = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveXCrossImpl(scramble, options);

export const solveEOLine = (
  _scramble: string,
  _options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => notImplemented();

export const solveEOFC = (
  scramble: string,
  options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => solveEOFCImpl(scramble, options);

export const solveRouxS1 = (
  _scramble: string,
  _options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => notImplemented();

export const solvePetrusS1 = (
  _scramble: string,
  _options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => notImplemented();

export const solveThreeByThreeAssist = (
  _scramble: string,
  _methods: readonly ThreeByThreeAssistMethod[],
  _options: ThreeByThreeAssistOptions = {},
): readonly ThreeByThreeAssistResult[] => notImplemented();
