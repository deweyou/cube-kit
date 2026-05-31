import { describe, expect, it } from 'vitest';
import { solveEOLine } from '../../index.js';
import { isEOLineSolved } from './target-validation.js';

describe('EOline solver', () => {
  it('solves a requested line target', () => {
    const result = solveEOLine("R U F'", { targets: ['DF DB'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('eoline');
    expect(solution.target).toBe('DF DB');
    expect(isEOLineSolved("R U F'", solution)).toBe(true);
  });

  it('searches all EOline targets by default', () => {
    expect(solveEOLine('').solutions).toHaveLength(12);
  });
});
