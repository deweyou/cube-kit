import type { RandomSource } from '../../random-source.js';
import { initCoordCube } from './coord-cube.js';
import {
  generatorFromFaceCube,
  isSolvedFaceCube,
} from './tools.js';
import {
  INVERSE_SOLUTION,
  axisForRestriction,
  generateRandomMoveSequence,
  invertAlgorithm,
  isAxisRestriction,
  splitAlgorithm,
  type AxisRestriction,
} from './util.js';

export { INVERSE_SOLUTION };

export interface SearchWcaGenerateOptions {
  random: RandomSource;
  maxDepth: number;
  firstAxisRestriction?: string | null;
  lastAxisRestriction?: string | null;
}

export class SearchWCA {
  solution(
    facelets: string,
    maxDepth: number,
    _probeMax: number,
    _probeMin: number,
    verbose: number,
    firstAxisRestriction?: string | null,
    lastAxisRestriction?: string | null,
  ): string {
    initCoordCube();

    if (maxDepth < 0 || !Number.isSafeInteger(maxDepth)) {
      return 'Error 7';
    }

    if (!isValidRestriction(firstAxisRestriction)) return 'Error 9';
    if (!isValidRestriction(lastAxisRestriction)) return 'Error 9';
    if (isSolvedFaceCube(facelets)) return '';

    const generator = generatorFromFaceCube(facelets);
    if (generator === undefined) return 'Error 1';

    const solution = invertAlgorithm(generator);
    const tokens = splitAlgorithm(solution);
    if (tokens.length > maxDepth) return 'Error 7';

    if (
      violatesSolutionAxisRestriction(tokens, firstAxisRestriction, true) ||
      violatesSolutionAxisRestriction(tokens, lastAxisRestriction, false)
    ) {
      return 'Error 7';
    }

    return (verbose & INVERSE_SOLUTION) === 0 ? solution : generator;
  }

  generateInverseSolution({
    random,
    maxDepth,
    firstAxisRestriction,
    lastAxisRestriction,
  }: SearchWcaGenerateOptions): string {
    initCoordCube();

    const firstMoveAxisRestriction = normalizeRestriction(lastAxisRestriction);
    const lastMoveAxisRestriction = normalizeRestriction(firstAxisRestriction);

    return generateRandomMoveSequence({
      random,
      length: maxDepth,
      firstMoveAxisRestriction,
      lastMoveAxisRestriction,
    });
  }
}

const normalizeRestriction = (
  restriction: string | null | undefined,
): AxisRestriction | undefined => {
  if (restriction === null || restriction === undefined) return undefined;
  if (!isAxisRestriction(restriction)) {
    throw new Error(
      `@cubekit/scramble-core: unsupported min2phase axis restriction '${restriction}'`,
    );
  }

  return restriction;
};

const isValidRestriction = (restriction: string | null | undefined): boolean =>
  restriction === null ||
  restriction === undefined ||
  isAxisRestriction(restriction);

const violatesSolutionAxisRestriction = (
  moves: readonly string[],
  restriction: string | null | undefined,
  checkFirstMove: boolean,
): boolean => {
  const normalized = normalizeRestriction(restriction);
  if (normalized === undefined || moves.length === 0) return false;

  const token = checkFirstMove ? moves[0] : moves.at(-1);
  const tokenAxis = axisForRestriction(token?.[0]);

  return tokenAxis === axisForRestriction(normalized);
};
