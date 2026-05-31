import { describe, expect, it } from 'vitest';
import { solveSquareOneShapeFaceTurnMetric, solveSquareOneShapeTwistMetric } from '../../index.js';
import { isSquareOneShapeSolved } from './shape.js';

describe('Square-1 shape solver', () => {
  it('restores shape in face-turn metric', () => {
    const result = solveSquareOneShapeFaceTurnMetric('(3,0) /');
    const solution = result.solutions[0];

    expect(solution.method).toBe('sq1-shape-ftm');
    expect(solution.target).toBe('shape');
    expect(isSquareOneShapeSolved('(3,0) /', solution.solution)).toBe(true);
  });

  it('restores shape in twist metric', () => {
    const result = solveSquareOneShapeTwistMetric('(3,0) /');
    const solution = result.solutions[0];

    expect(solution.method).toBe('sq1-shape-twist');
    expect(solution.target).toBe('shape');
    expect(isSquareOneShapeSolved('(3,0) /', solution.solution)).toBe(true);
  });
});
