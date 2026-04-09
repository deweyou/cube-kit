import { describe, expect, it } from 'vitest';
import { generate666 } from '../../src/generators/666';

const TOKEN_RE = /^[UDFBLR]w?[2']?$/;

describe('generate666', () => {
  it('has exactly 80 tokens', () => {
    expect(generate666().split(' ')).toHaveLength(80);
  });

  it('all tokens are valid 6x6 notation', () => {
    for (const t of generate666().split(' ')) expect(t).toMatch(TOKEN_RE);
  });

  it('no two consecutive tokens share the same face', () => {
    const tokens = generate666().split(' ');
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i][0]).not.toBe(tokens[i - 1][0]);
    }
  });

  it('produces varied results', () => {
    const results = new Set(Array.from({ length: 100 }, () => generate666()));
    expect(results.size).toBeGreaterThan(50);
  });
});
