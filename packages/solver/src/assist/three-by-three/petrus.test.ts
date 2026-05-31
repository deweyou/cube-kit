import { describe, expect, it } from 'vitest';
import { solvePetrusS1 } from '../../index.js';
import { isPetrusS1Solved } from './target-validation.js';

describe('Petrus S1 solver', () => {
  it('solves a requested 2x2x2 block target', () => {
    const result = solvePetrusS1("R U F'", { targets: ['ULF'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('petrus-s1');
    expect(solution.target).toBe('ULF');
    expect(isPetrusS1Solved("R U F'", solution)).toBe(true);
  });
});
