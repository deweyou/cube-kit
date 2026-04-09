import { describe, expect, it } from 'vitest';
import { generateSkewb } from '../../src/generators/skewb';

// Skewb uses R, L, U, B, F with optional '
const TOKEN_RE = /^[RLUBF]'?$/;

describe('generateSkewb', () => {
  it('returns a non-empty string', () => {
    expect(generateSkewb().length).toBeGreaterThan(0);
  });

  it('all tokens match Skewb notation', () => {
    for (const t of generateSkewb().split(' ')) {
      expect(t).toMatch(TOKEN_RE);
    }
  });

  it('length is between 7 and 20 moves', () => {
    const len = generateSkewb().split(' ').length;
    expect(len).toBeGreaterThanOrEqual(7);
    expect(len).toBeLessThanOrEqual(20);
  });

  it('no two consecutive moves on the same face', () => {
    const tokens = generateSkewb().split(' ');
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i][0]).not.toBe(tokens[i - 1][0]);
    }
  });

  it('produces varied results', () => {
    const results = new Set(Array.from({ length: 100 }, () => generateSkewb()));
    expect(results.size).toBeGreaterThan(20);
  });
});
