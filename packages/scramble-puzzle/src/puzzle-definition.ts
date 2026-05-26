import type { WcaEventId } from './events.js';

export interface PuzzleDefinition<State, Move> {
  readonly id: string;
  readonly eventIds: readonly WcaEventId[];
  createSolvedState(): State;
  parseAlgorithm(algorithm: string): readonly Move[];
  applyMove(state: State, move: Move): State;
  applyAlgorithm(state: State, algorithm: string): State;
  isSolved(state: State): boolean;
  normalizeState?(state: State): State;
}

export interface AppliedPuzzleState<State> {
  readonly puzzleId: string;
  readonly state: State;
}
