import { describe, expect, it } from 'vitest';
import { generate555 } from '../../src/generators/555';

const FACE_RE = /^[UDFBLR]w?[2']?$/;

describe('generate555', () => {
  it('returns a non-empty string', () => {
    expect(generate555().length).toBeGreaterThan(0);
  });

  it('has exactly 60 tokens', () => {
    const tokens = generate555().split(' ');
    expect(tokens).toHaveLength(60);
  });

  it('all tokens match 5x5 notation', () => {
    const tokens = generate555().split(' ');
    for (const t of tokens) expect(t).toMatch(FACE_RE);
  });

  it('no two consecutive tokens share the same face', () => {
    const tokens = generate555().split(' ');
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i][0]).not.toBe(tokens[i - 1][0]);
    }
  });

  it('produces varied results (randomness)', () => {
    const results = new Set(Array.from({ length: 100 }, () => generate555()));
    expect(results.size).toBeGreaterThan(50);
  });
});
