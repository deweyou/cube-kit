import { Search, INVERSE_SOLUTION } from './search.js';
import {
  axisForRestriction,
  isAxisRestriction,
  splitAlgorithm,
} from './util.js';

export { INVERSE_SOLUTION };

export class SearchWCA extends Search {
  override solution(
    facelets: string,
    maxDepth: number,
    probeMax: number,
    probeMin: number,
    verbose: number,
    firstAxisRestriction?: string | null,
    lastAxisRestriction?: string | null,
  ): string {
    if (!isValidRestriction(firstAxisRestriction)) return 'Error 9';
    if (!isValidRestriction(lastAxisRestriction)) return 'Error 9';

    const solution = super.solution(
      facelets,
      maxDepth,
      probeMax,
      probeMin,
      verbose,
    );

    if (solution.startsWith('Error')) return solution;

    const moves = splitAlgorithm(solution);
    if (
      violatesAxisRestriction(moves[0], firstAxisRestriction) ||
      violatesAxisRestriction(moves.at(-1), lastAxisRestriction)
    ) {
      return 'Error 7';
    }

    return solution;
  }
}

const isValidRestriction = (restriction: string | null | undefined): boolean =>
  restriction === null ||
  restriction === undefined ||
  isAxisRestriction(restriction);

const violatesAxisRestriction = (
  move: string | undefined,
  restriction: string | null | undefined,
): boolean => {
  if (
    move === undefined ||
    restriction === null ||
    restriction === undefined
  ) {
    return false;
  }

  return axisForRestriction(move[0]) === axisForRestriction(restriction);
};
