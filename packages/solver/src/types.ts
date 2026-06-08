export type ThreeByThreeAssistMethod =
  | 'cross'
  | 'xcross'
  | 'eoline'
  | 'eofc'
  | 'roux-s1'
  | 'roux-s2'
  | 'petrus-s1'
  | 'petrus-s2'
  | 'cfop-f2l'
  | 'zz-f2l'
  | 'block-222'
  | 'eo-dr'
  | '333-two-phase'
  | '333-general';

export type TwoByTwoAssistMethod = '222-face' | '222-layer';

export type SquareOneAssistMethod = 'sq1-shape-ftm' | 'sq1-shape-twist';

export type PyraminxAssistMethod = 'pyraminx-v';

export type SkewbAssistMethod = 'skewb-face';

export type PuzzleAssistMethod =
  | ThreeByThreeAssistMethod
  | TwoByTwoAssistMethod
  | SquareOneAssistMethod
  | PyraminxAssistMethod
  | SkewbAssistMethod;

export type PuzzleAssistEventId = '333' | '222' | 'sq1' | 'pyram' | 'skewb';

export interface PuzzleAssistOptions {
  readonly targets?: readonly string[];
  readonly maxDepth?: number;
  readonly maxSolutionsPerTarget?: number;
}

export type ThreeByThreeAssistOptions = PuzzleAssistOptions;

export interface PuzzleAssistMetric {
  readonly ftm: number;
  readonly qtm: number;
}

export type ThreeByThreeAssistMetric = PuzzleAssistMetric;

export interface PuzzleAssistSolution<Method extends PuzzleAssistMethod = PuzzleAssistMethod> {
  readonly method: Method;
  readonly target: string;
  readonly targetLabel: string;
  readonly setupRotation: string;
  readonly solution: string;
  readonly depth: number;
  readonly metric: PuzzleAssistMetric;
}

export type ThreeByThreeAssistSolution = PuzzleAssistSolution<ThreeByThreeAssistMethod>;

export interface PuzzleAssistResult<Method extends PuzzleAssistMethod = PuzzleAssistMethod> {
  readonly method: Method;
  readonly scramble: string;
  readonly solutions: readonly PuzzleAssistSolution<Method>[];
}

export type ThreeByThreeAssistResult = PuzzleAssistResult<ThreeByThreeAssistMethod>;
