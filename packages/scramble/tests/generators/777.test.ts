import { describe, expect, it } from 'vitest';
import { generate777 } from '../../src/generators/777';

const TOKEN_RE = /^[UDFBLR]w?[2']?$/;

describe('generate777', () => {
  it('has exactly 100 tokens', () => {
    expect(generate777().split(' ')).toHaveLength(100);
  });

  it('all tokens are valid 7x7 notation', () => {
    for (const t of generate777().split(' ')) expect(t).toMatch(TOKEN_RE);
  });

  it('no two consecutive tokens share the same face', () => {
    const tokens = generate777().split(' ');
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i][0]).not.toBe(tokens[i - 1][0]);
    }
  });

  it('produces varied results', () => {
    const results = new Set(Array.from({ length: 100 }, () => generate777()));
    expect(results.size).toBeGreaterThan(50);
  });
});
