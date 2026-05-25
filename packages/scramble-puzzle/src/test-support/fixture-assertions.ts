import type { PuzzleDefinition } from '../puzzle-definition.js';

export const expectScrambleApplies = <State, Move>(
  definition: Pick<
    PuzzleDefinition<State, Move>,
    'applyMove' | 'createSolvedState' | 'parseAlgorithm'
  >,
  scramble: string,
): State => {
  const solvedState = definition.createSolvedState();
  const moves = definition.parseAlgorithm(scramble);

  return moves.reduce((nextState, move) => definition.applyMove(nextState, move), solvedState);
};
