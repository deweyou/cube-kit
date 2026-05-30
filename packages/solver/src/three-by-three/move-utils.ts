import { parseCubeAlgorithm, type CubeMove } from '@cubekit/scramble-puzzle';
import { InvalidSolverScrambleError, UnsupportedSolverMoveError } from '../errors.js';

const moveToToken = (move: CubeMove): string => {
  if (move.isRotation) {
    if (move.face === 'R') return 'x';
    if (move.face === 'U') return 'y';
    return 'z';
  }

  return move.face;
};

export const parseThreeByThreeSolverAlgorithm = (algorithm: string): readonly CubeMove[] => {
  try {
    const moves = parseCubeAlgorithm(algorithm);

    for (const move of moves) {
      if (!move.isRotation && move.width !== 1) {
        throw new UnsupportedSolverMoveError(moveToToken(move));
      }
    }

    return moves;
  } catch (error) {
    if (error instanceof UnsupportedSolverMoveError) throw error;

    throw new InvalidSolverScrambleError(algorithm, error);
  }
};
