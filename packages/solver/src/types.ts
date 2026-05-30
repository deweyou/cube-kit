export type ThreeByThreeAssistMethod =
  | 'cross'
  | 'xcross'
  | 'eoline'
  | 'eofc'
  | 'roux-s1'
  | 'petrus-s1';

export interface ThreeByThreeAssistOptions {
  readonly targets?: readonly string[];
  readonly maxDepth?: number;
  readonly maxSolutionsPerTarget?: number;
}

export interface ThreeByThreeAssistMetric {
  readonly ftm: number;
  readonly qtm: number;
}

export interface ThreeByThreeAssistSolution {
  readonly method: ThreeByThreeAssistMethod;
  readonly target: string;
  readonly targetLabel: string;
  readonly setupRotation: string;
  readonly solution: string;
  readonly depth: number;
  readonly metric: ThreeByThreeAssistMetric;
}

export interface ThreeByThreeAssistResult {
  readonly method: ThreeByThreeAssistMethod;
  readonly scramble: string;
  readonly solutions: readonly ThreeByThreeAssistSolution[];
}
