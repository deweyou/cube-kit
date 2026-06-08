import { UnknownSolverMethodError } from '../../errors.js';
import type {
  ThreeByThreeAssistMethod,
  ThreeByThreeAssistOptions,
  ThreeByThreeAssistResult,
} from '../../types.js';
import { solveCross, solveEOFC, solveXCross } from './cross.js';
import { solveEOLine } from './eoline.js';
import { solvePetrusS1 } from './petrus.js';
import { solveRouxS1 } from './roux.js';
import {
  solveBlock222,
  solveCfopF2L,
  solveEODR,
  solvePetrusS2,
  solveRouxS2,
  solveThreeByThreeGeneral,
  solveThreeByThreeTwoPhase,
  solveZZF2L,
} from './stage-mask.js';

type MethodSolver = (
  scramble: string,
  options?: ThreeByThreeAssistOptions,
) => ThreeByThreeAssistResult;

const METHOD_SOLVERS = {
  cross: solveCross,
  xcross: solveXCross,
  eoline: solveEOLine,
  eofc: solveEOFC,
  'roux-s1': solveRouxS1,
  'roux-s2': solveRouxS2,
  'petrus-s1': solvePetrusS1,
  'petrus-s2': solvePetrusS2,
  'cfop-f2l': solveCfopF2L,
  'zz-f2l': solveZZF2L,
  'block-222': solveBlock222,
  'eo-dr': solveEODR,
  '333-two-phase': solveThreeByThreeTwoPhase,
  '333-general': solveThreeByThreeGeneral,
} satisfies Record<ThreeByThreeAssistMethod, MethodSolver>;

const isThreeByThreeAssistMethod = (method: string): method is ThreeByThreeAssistMethod =>
  method in METHOD_SOLVERS;

export const solveThreeByThreeAssist = (
  scramble: string,
  methods: readonly ThreeByThreeAssistMethod[],
  options: ThreeByThreeAssistOptions = {},
): readonly ThreeByThreeAssistResult[] =>
  methods.map((method) => {
    if (!isThreeByThreeAssistMethod(method)) {
      throw new UnknownSolverMethodError(String(method));
    }

    return METHOD_SOLVERS[method](scramble, options);
  });
