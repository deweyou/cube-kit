import {
  createFtoDefinition,
  parseFtoAlgorithm,
  type FtoMove,
  type FtoState,
} from '@cubegin/scramble-puzzle';

const formatInverseMove = (move: FtoMove): string => `${move.face}${move.amount === 1 ? "'" : ''}`;

export class FtoSolver {
  stateFromScramble(scramble: string): FtoState {
    const fto = createFtoDefinition();

    return fto.applyAlgorithm(fto.createSolvedState(), scramble);
  }

  solve(scramble: string): string {
    return parseFtoAlgorithm(scramble).slice().reverse().map(formatInverseMove).join(' ');
  }
}
