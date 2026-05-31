import { describe, expect, it } from 'vitest';
import { countFaceTurnMetric, countQuarterTurnMetric } from './metrics.js';

describe('solver metrics', () => {
  it('counts FTM and QTM', () => {
    const algorithm = "R U2 F'";

    expect(countFaceTurnMetric(algorithm)).toBe(3);
    expect(countQuarterTurnMetric(algorithm)).toBe(4);
  });
});
