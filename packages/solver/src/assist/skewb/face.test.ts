import { describe, expect, it } from 'vitest';
import { UnknownSolverTargetError, solveSkewbFace } from '../../index.js';
import { isSkewbFaceSolved } from './face.js';

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

  it('rejects unknown Skewb face targets', () => {
    expect(() => solveSkewbFace('R', { targets: ['bad-target'] })).toThrow(
      UnknownSolverTargetError,
    );
  });
});
