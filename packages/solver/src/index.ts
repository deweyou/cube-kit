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
import type {
  ThreeByThreeAssistMethod,
  ThreeByThreeAssistOptions,
  ThreeByThreeAssistResult,
} from './types.js';

const notImplemented = (): never => {
  throw new SolverError('not implemented');
};

export const solveCross = (
  _scramble: string,
  _options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => notImplemented();

export const solveXCross = (
  _scramble: string,
  _options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => notImplemented();

export const solveEOLine = (
  _scramble: string,
  _options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => notImplemented();

export const solveEOFC = (
  _scramble: string,
  _options: ThreeByThreeAssistOptions = {},
): ThreeByThreeAssistResult => notImplemented();

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
