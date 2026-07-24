import { describe, expect, it } from 'vitest';
import { UnknownSolverTargetError, solveSkewbFace } from '../../index.js';
import { hasSameCyclicOrder, isSkewbFaceSolved } from './face.js';

describe('hasSameCyclicOrder', () => {
  it('accepts rotations but rejects reversed corner order', () => {
    const solvedOrder = [1, 2, 3, 4];

    expect(hasSameCyclicOrder([3, 4, 1, 2], solvedOrder)).toBe(true);
    expect(hasSameCyclicOrder([1, 4, 3, 2], solvedOrder)).toBe(false);
  });
});

describe('solveSkewbFace', () => {
  it('finds a face solution for a selected Skewb target', () => {
    const result = solveSkewbFace("R U'", { targets: ['D'] });
    const solution = result.solutions[0];

    expect(result.method).toBe('skewb-face');
    expect(solution?.target).toBe('D');
    expect(solution?.targetLabel).toBe('D face');
    expect(solution?.solution.length).toBeGreaterThan(0);
    expect(solution && isSkewbFaceSolved("R U'", solution)).toBe(true);
  });

  it('returns all six face targets by default', () => {
    const result = solveSkewbFace('R');

    expect(result.solutions.map((solution) => solution.target)).toEqual([
      'U',
      'R',
      'F',
      'D',
      'L',
      'B',
    ]);
  });

  it('accepts a solved face without requiring its adjacent centers', () => {
    expect(
      isSkewbFaceSolved("R U' L' U", {
        target: 'U',
        solution: '',
      }),
    ).toBe(true);
  });

  it('rejects a monochrome face whose corners have the wrong relative order', () => {
    const scramble = "R U R' U R' U R";
    const unsolvedFace = { target: 'L', solution: '' };

    expect(isSkewbFaceSolved(scramble, unsolvedFace)).toBe(false);

    const solution = solveSkewbFace(scramble, { targets: ['L'] }).solutions[0];

    expect(solution?.solution).not.toBe('');
    expect(solution && isSkewbFaceSolved(scramble, solution)).toBe(true);
  });

  it('rejects unknown Skewb face targets', () => {
    expect(() => solveSkewbFace('R', { targets: ['bad-target'] })).toThrow(
      UnknownSolverTargetError,
    );
  });
});
