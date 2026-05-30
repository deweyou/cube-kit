import { UnknownSolverMethodError } from '../errors.js';
import type {
  ThreeByThreeAssistMethod,
  ThreeByThreeAssistOptions,
  ThreeByThreeAssistResult,
} from '../types.js';
import { solveCross, solveEOFC, solveXCross } from './cross.js';
import { solveEOLine } from './eoline.js';
import { solvePetrusS1 } from './petrus.js';
import { solveRouxS1 } from './roux.js';

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
  'petrus-s1': solvePetrusS1,
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
