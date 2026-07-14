import { describe, expect, it } from 'vitest';
import { calculateSolveAverage } from './solve-average';

describe('calculateSolveAverage', () => {
  it('trims one best and one worst valid time before calculating the average', () => {
    expect(calculateSolveAverage([900, 1100, 1200, 1300, 1400], true)).toEqual({
      standardDeviationMs: 82,
      valueMs: 1200,
    });
  });

  it('only returns DNF when DNF solves exceed half the input', () => {
    expect(calculateSolveAverage([null, null, 1200, 1300, 1400], true)).toEqual({
      standardDeviationMs: 0,
      valueMs: 1300,
    });
    expect(calculateSolveAverage([null, null, null, 1300, 1400], true)).toEqual({
      standardDeviationMs: null,
      valueMs: null,
    });
  });
});
