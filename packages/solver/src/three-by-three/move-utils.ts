import { parseCubeMove, splitAlgorithm, type CubeMove } from '@cubekit/scramble-puzzle';
import { InvalidSolverScrambleError, UnsupportedSolverMoveError } from '../errors.js';

export const parseThreeByThreeSolverAlgorithm = (algorithm: string): readonly CubeMove[] => {
  try {
    const tokens = splitAlgorithm(algorithm);
    const moves = tokens.map(parseCubeMove);

    for (const [index, move] of moves.entries()) {
      if (!move.isRotation && move.width !== 1) {
        throw new UnsupportedSolverMoveError(tokens[index]);
      }
    }

    return moves;
  } catch (error) {
    if (error instanceof UnsupportedSolverMoveError) throw error;

    throw new InvalidSolverScrambleError(algorithm, error);
  }
};
