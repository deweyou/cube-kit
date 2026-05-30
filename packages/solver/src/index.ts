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
import {
  solveCross as solveCrossImpl,
  solveEOFC as solveEOFCImpl,
  solveXCross as solveXCrossImpl,
} from './three-by-three/cross.js';
import { solveEOLine as solveEOLineImpl } from './three-by-three/eoline.js';
import { solveThreeByThreeAssist as solveThreeByThreeAssistImpl } from './three-by-three/facade.js';
import { solvePetrusS1 as solvePetrusS1Impl } from './three-by-three/petrus.js';
import { solveRouxS1 as solveRouxS1Impl } from './three-by-three/roux.js';
import type {
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
