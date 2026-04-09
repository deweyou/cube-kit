import { describe, expect, it } from 'vitest';
import { generate333 } from '../../src/generators/333';

const TOKEN_RE = /^[UDFBLR][2']?$/;

describe('generate333', () => {
  it('returns a non-empty string', () => {
    expect(generate333().length).toBeGreaterThan(0);
  });

  it('has 18-26 tokens', () => {
    const len = generate333().split(' ').length;
    expect(len).toBeGreaterThanOrEqual(18);
    expect(len).toBeLessThanOrEqual(26);
  });

  it('all tokens match WCA 3x3 notation', () => {
    for (const t of generate333().split(' ')) {
      expect(t).toMatch(TOKEN_RE);
    }
  });

  it('no two consecutive tokens on same face', () => {
    const tokens = generate333().split(' ');
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i][0]).not.toBe(tokens[i - 1][0]);
    }
  });

  it('produces varied results', () => {
    const results = new Set(Array.from({ length: 20 }, () => generate333()));
    expect(results.size).toBeGreaterThan(10);
  });
});
