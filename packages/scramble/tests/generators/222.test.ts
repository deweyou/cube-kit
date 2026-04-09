import { describe, expect, it } from 'vitest';
import { generate222 } from '../../src/generators/222';

const TOKEN_RE = /^[UDFBLR][2']?$/;

describe('generate222', () => {
  it('returns a non-empty string', () => {
    expect(generate222().length).toBeGreaterThan(0);
  });

  it('all tokens match 2x2 notation', () => {
    for (const t of generate222().split(' ')) {
      expect(t).toMatch(TOKEN_RE);
    }
  });

  it('length is 7-20 moves', () => {
    const len = generate222().split(' ').length;
    expect(len).toBeGreaterThanOrEqual(7);
    expect(len).toBeLessThanOrEqual(20);
  });

  it('no two consecutive moves on the same face', () => {
    const tokens = generate222().split(' ');
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i][0]).not.toBe(tokens[i - 1][0]);
    }
  });

  it('produces varied results', () => {
    const results = new Set(Array.from({ length: 100 }, () => generate222()));
    expect(results.size).toBeGreaterThan(20);
  });
});
