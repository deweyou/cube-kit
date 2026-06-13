import { describe, expect, it } from 'vitest';
import {
  areSquareOneStatesEqual,
  applySquareOneMove,
  createSolvedSquareOneState,
  parseSquareOneAlgorithm,
} from '@cubegin/scramble-puzzle';

import { FullCube } from './full-cube.js';
import { INVERSE_SOLUTION, Search, solveSquareOneStateIn } from './search.js';

const applySquareOneAlgorithm = (algorithm: string) =>
  parseSquareOneAlgorithm(algorithm).reduce(
    (state, move) => applySquareOneMove(state, move),
    createSolvedSquareOneState(),
  );

const applySquareOneAlgorithmToState = (state: ReturnType<typeof createSolvedSquareOneState>, algorithm: string) =>
  parseSquareOneAlgorithm(algorithm).reduce((nextState, move) => applySquareOneMove(nextState, move), state);

describe('Square-1 two-phase search', () => {
  it('returns an empty solution for solved cubes', () => {
    const cube = new FullCube();

    expect(new Search().solution(cube)).toBe('');
    expect(new Search().solutionOpt(cube, 0)).toBe('');
  });

  it('solves a simple full-cube state in forward and inverse notation', () => {
    const scrambled = applySquareOneAlgorithm('(3,0) /');
    const cube = FullCube.fromSquareOneState(scrambled);
    const solution = new Search().solution(cube);
    const inverseSolution = new Search().solution(cube, INVERSE_SOLUTION);

    expect(solution).toBe(' / (-3,0)');
    expect(inverseSolution).toBe('(3,0) / ');
    expect(areSquareOneStatesEqual(applySquareOneAlgorithmToState(scrambled, solution!), createSolvedSquareOneState())).toBe(true);
  });

  it('validates optimal solve lengths', () => {
    const cube = new FullCube();

    for (const maxLength of [-1, 1.5, 32, Number.NaN]) {
      expect(() => new Search().solutionOpt(cube, maxLength)).toThrow(
        '@cubegin/solver: Square-1 solve length must be an integer from 0 to 31',
      );
      expect(() => solveSquareOneStateIn(createSolvedSquareOneState(), maxLength)).toThrow(
        '@cubegin/solver: Square-1 solve length must be an integer from 0 to 31',
      );
    }
  });

  it('returns null when the requested optimal depth is too shallow', () => {
    expect(solveSquareOneStateIn(applySquareOneAlgorithm('(3,0) /'), 0)).toBeNull();
  });

  it('prepends a slashability move for states that cannot slash immediately', () => {
    const unslashable = applySquareOneAlgorithm('(-1,0)');
    const solution = solveSquareOneStateIn(unslashable, 3);

    expect(solution).toBe('(1,0)');
    expect(areSquareOneStatesEqual(applySquareOneAlgorithmToState(unslashable, solution!), createSolvedSquareOneState())).toBe(true);
  });
});
