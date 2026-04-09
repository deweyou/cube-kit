import { describe, expect, it } from 'vitest';
import { generate444 } from '../../src/generators/444';

// 4x4 notation: outer face moves + wide moves (Rw, Uw, etc.)
const TOKEN_RE = /^[UDFBLR]w?[2']?$/;

describe('generate444', () => {
  it('returns a non-empty string', () => {
    expect(generate444().length).toBeGreaterThan(0);
  });

  it('has 40-60 tokens', () => {
    const len = generate444().split(' ').length;
    expect(len).toBeGreaterThanOrEqual(40);
    expect(len).toBeLessThanOrEqual(60);
  });

  it('all tokens match 4x4 notation (including wide moves)', () => {
    for (const t of generate444().split(' ')) {
      expect(t).toMatch(TOKEN_RE);
    }
  });

  it('includes at least one wide move (Rw, Uw, etc.)', () => {
    expect(generate444()).toMatch(/[UDFBLR]w/);
  });

  it('produces varied results', () => {
    const results = new Set(Array.from({ length: 10 }, () => generate444()));
    expect(results.size).toBeGreaterThan(5);
  });
});
