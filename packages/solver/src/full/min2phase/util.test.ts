import { describe, expect, it } from 'vitest';

import {
  axisForRestriction,
  drawRandomInt,
  INVERSE_SOLUTION,
  invertAlgorithm,
  isAxisRestriction,
  MOVE_TOKENS,
  OPTIMAL_SOLUTION,
  SOLVED_FACE_CUBE,
  splitAlgorithm,
  USE_SEPARATOR,
} from './util.js';

describe('min2phase util helpers', () => {
  it('maps face restrictions to axis ids', () => {
    expect(axisForRestriction(undefined)).toBeUndefined();
    expect(axisForRestriction('U')).toBe(0);
    expect(axisForRestriction('D')).toBe(0);
    expect(axisForRestriction('R')).toBe(1);
    expect(axisForRestriction('L')).toBe(1);
    expect(axisForRestriction('F')).toBe(2);
    expect(axisForRestriction('B')).toBe(2);
    expect(axisForRestriction('x')).toBeUndefined();
    expect(isAxisRestriction('U')).toBe(true);
    expect(isAxisRestriction('x')).toBe(false);
  });

  it('splits and inverts algorithms without normalizing move names', () => {
    expect(splitAlgorithm("  R   U2  F'  ")).toEqual(['R', 'U2', "F'"]);
    expect(splitAlgorithm('')).toEqual([]);
    expect(invertAlgorithm("R U2 F'")).toBe("F U2 R'");
  });

  it('validates random integer bounds', () => {
    expect(drawRandomInt({ nextInt: () => 2 }, 3)).toBe(2);
    expect(() => drawRandomInt({ nextInt: () => 0 }, 0)).toThrow(
      '@cubegin/solver: random maxExclusive must be a positive safe integer',
    );
    expect(() => drawRandomInt({ nextInt: () => 3 }, 3)).toThrow(
      '@cubegin/solver: random source returned 3 for max 3',
    );
  });

  it('exports min2phase constants used by public search wrappers', () => {
    expect(USE_SEPARATOR | INVERSE_SOLUTION | OPTIMAL_SOLUTION).toBe(11);
    expect(MOVE_TOKENS).toHaveLength(18);
    expect(SOLVED_FACE_CUBE).toHaveLength(54);
  });
});
