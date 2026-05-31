import { describe, expect, it } from 'vitest';
import { solveCross, solveEOFC, solveXCross } from '../../index.js';
import { isCrossSolved, isEOFCAligned, isXCrossSolved } from './target-validation.js';

describe('Cross family solvers', () => {
  it('solves D cross for a simple scramble', () => {
    const result = solveCross('F', { targets: ['D'] });
    const solution = result.solutions[0];

    expect(solution.target).toBe('D');
    expect(isCrossSolved('F', solution)).toBe(true);
  });

  it('solves XCross with a structured result', () => {
    const result = solveXCross("R U R'", { targets: ['D'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('xcross');
    expect(isXCrossSolved("R U R'", solution)).toBe(true);
  });

  it('solves EOFC for a line target', () => {
    const result = solveEOFC("R U F'", { targets: ['D(FB)'] });
    const solution = result.solutions[0];

    expect(solution.target).toBe('D(FB)');
    expect(isEOFCAligned("R U F'", solution)).toBe(true);
  });
});
