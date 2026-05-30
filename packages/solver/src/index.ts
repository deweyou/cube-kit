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
import { solveEOLine as solveEOLineImpl } from './three-by-three/eoline.js';
import { solvePetrusS1 as solvePetrusS1Impl } from './three-by-three/petrus.js';
import { solveRouxS1 as solveRouxS1Impl } from './three-by-three/roux.js';
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
  _scramble: string,
  _methods: readonly ThreeByThreeAssistMethod[],
  _options: ThreeByThreeAssistOptions = {},
): readonly ThreeByThreeAssistResult[] => notImplemented();
