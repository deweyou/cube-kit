import { describe, expect, it } from 'vitest';
import { solveRouxS1 } from '../index.js';
import { isRouxS1Solved } from './target-validation.js';

describe('Roux S1 solver', () => {
  it('solves a requested 1x2x3 block target', () => {
    const result = solveRouxS1("R U F'", { targets: ['LU'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('roux-s1');
    expect(solution.target).toBe('LU');
    expect(isRouxS1Solved("R U F'", solution)).toBe(true);
  });
});
