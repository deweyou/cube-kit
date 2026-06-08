import { solve } from './engine.js';
import { initCoordCube } from './coord-cube.js';
import { CubieCube } from './cubie-cube.js';
import { INVERSE_SOLUTION, OPTIMAL_SOLUTION, invertAlgorithm } from './util.js';

export { APPEND_LENGTH, INVERSE_SOLUTION, OPTIMAL_SOLUTION, USE_SEPARATOR } from './util.js';

export class Search {
  static init(): void {
    initCoordCube();
  }

  solution(
    facelets: string,
    maxDepth: number,
    _probeMax: number,
    _probeMin: number,
    verbose: number,
  ): string {
    if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) return 'Error 7';

    initCoordCube();

    const cube = CubieCube.fromFaceCube(facelets);
    if (cube === null) return 'Error 1';

    const verification = cube.verify();
    if (verification !== 0) return `Error ${Math.abs(verification)}`;

    const solution = solve(cube).trim();
    // TODO(Task 16 P2): thread probeMax/probeMin into the mechanical engine
    // port or add an interruptible bounded-search guard around solve().
    if (solution.startsWith('Error')) return solution;

    const tokens = solution.length === 0 ? [] : solution.split(/\s+/);
    if (tokens.length > maxDepth) return 'Error 7';

    if ((verbose & OPTIMAL_SOLUTION) !== 0) {
      return 'Error 7';
    }

    return (verbose & INVERSE_SOLUTION) === 0 ? invertAlgorithm(solution) : solution;
  }
}
