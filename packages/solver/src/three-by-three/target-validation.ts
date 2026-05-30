import type { ThreeByThreeAssistSolution } from '../types.js';
import {
  isCrossSolutionSolved,
  isEOFCSolutionSolved,
  isXCrossSolutionSolved,
} from './cross.js';

export const isCrossSolved = (
  scramble: string,
  solution: ThreeByThreeAssistSolution,
): boolean => isCrossSolutionSolved(scramble, solution);

export const isXCrossSolved = (
  scramble: string,
  solution: ThreeByThreeAssistSolution,
): boolean => isXCrossSolutionSolved(scramble, solution);

export const isEOFCAligned = (
  scramble: string,
  solution: ThreeByThreeAssistSolution,
): boolean => isEOFCSolutionSolved(scramble, solution);
