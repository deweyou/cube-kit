import { FullCube } from '../full/threephase/full-cube.js';
import { Search } from '../full/threephase/search.js';

export interface FourByFourState {
  readonly edgePermutation: readonly number[];
  readonly centerColors: readonly number[];
  readonly cornerPermutation: readonly number[];
  readonly cornerOrientation: readonly number[];
}

export const createSolvedFourByFourState = (): FourByFourState => new FullCube().toState();

export const getFourByFourStateFromScramble = (scramble: string): FourByFourState =>
  FullCube.fromMoves(expandRotations(scramble)).toState();

export const scrambleFourByFourState = (state: FourByFourState): string => {
  const search = new Search();
  search.withRotation = true;
  return search.solveState(state).trim();
};

const expandRotations = (algorithm: string): string =>
  algorithm
    .trim()
    .split(/\s+/)
    .flatMap((token) => {
      const match = token.match(/^([xyz])(2|')?$/);
      if (match === null) return [token];

      const [, axis, suffix = ''] = match;
      const [positiveFace, negativeFace] =
        axis === 'x' ? ['Rw', 'Lw'] : axis === 'y' ? ['Uw', 'Dw'] : ['Fw', 'Bw'];
      if (suffix === '2') return [`${positiveFace}2`, `${negativeFace}2`];
      if (suffix === "'") return [`${positiveFace}'`, negativeFace];
      return [positiveFace, `${negativeFace}'`];
    })
    .join(' ');
