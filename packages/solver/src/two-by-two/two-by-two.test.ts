import { describe, expect, it } from 'vitest';
import { solveTwoByTwoFace, solveTwoByTwoLayer } from '../index.js';
import { isTwoByTwoFaceSolved, isTwoByTwoLayerSolved } from './two-by-two.js';

describe('2x2 auxiliary solvers', () => {
  it('solves a D face target', () => {
    const result = solveTwoByTwoFace('R U', { targets: ['D'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('222-face');
    expect(solution.target).toBe('D');
    expect(isTwoByTwoFaceSolved('R U', solution)).toBe(true);
  });

  it('solves a D first-layer target', () => {
    const result = solveTwoByTwoLayer('R U F', { targets: ['D'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('222-layer');
    expect(solution.target).toBe('D');
    expect(isTwoByTwoLayerSolved('R U F', solution)).toBe(true);
  });
});
