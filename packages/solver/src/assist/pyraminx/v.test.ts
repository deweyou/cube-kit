import { describe, expect, it } from 'vitest';
import { solvePyraminxV } from '../../index.js';
import { isPyraminxVSolved } from './v.js';

describe('Pyraminx V solver', () => {
  it('solves a D V target while ignoring tip moves', () => {
    const result = solvePyraminxV("U R u'", { targets: ['D'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('pyraminx-v');
    expect(solution.target).toBe('D');
    expect(isPyraminxVSolved("U R u'", solution)).toBe(true);
  });
});
