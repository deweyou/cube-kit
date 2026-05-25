import { InvalidScrambleError } from './errors.js';
import type { PuzzleDefinition } from './puzzle-definition.js';

type AlgorithmApplier<State, Move> = Pick<
  PuzzleDefinition<State, Move>,
  'applyMove' | 'parseAlgorithm'
>;

export function splitAlgorithm(algorithm: string): readonly string[] {
  const trimmedAlgorithm = algorithm.trim();

  if (trimmedAlgorithm.length === 0) {
    return [];
  }

  return trimmedAlgorithm.split(/\s+/u);
}

export function applyAlgorithm<State, Move>(
  definition: AlgorithmApplier<State, Move>,
  state: State,
  algorithm: string,
): State {
  try {
    const moves = definition.parseAlgorithm(algorithm);

    return moves.reduce(
      (nextState, move) => definition.applyMove(nextState, move),
      state,
    );
  } catch (error) {
    if (error instanceof InvalidScrambleError) {
      throw error;
    }

    throw new InvalidScrambleError(algorithm, { cause: error });
  }
}
