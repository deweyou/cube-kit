import { describe, expect, it } from 'vitest';
import { generateMinx } from '../../src/generators/minx';

/**
 * WCA Megaminx format: 7 rows, each row is 5 alternating R±±/D±± pairs + U/U'.
 * Example: "R-- D++ R++ D-- R++ D-- R-- D++ R-- D++ U"
 */

describe('generateMinx', () => {
  it('has exactly 7 rows', () => {
    const rows = generateMinx().split('\n');
    expect(rows).toHaveLength(7);
  });

  it('each row has 11 tokens: 5×(R±± D±±) + U/U\'', () => {
    for (const row of generateMinx().split('\n')) {
      const tokens = row.trim().split(/\s+/);
      expect(tokens).toHaveLength(11);
      // First 10 tokens: alternating R±± and D±±
      for (let i = 0; i < 10; i++) {
        const expected = i % 2 === 0 ? /^R[+-]{2}$/ : /^D[+-]{2}$/;
        expect(tokens[i]).toMatch(expected);
      }
      // Last token: U or U'
      expect(tokens[10]).toMatch(/^U'?$/);
    }
  });

  it('produces varied results', () => {
    const results = new Set(Array.from({ length: 100 }, () => generateMinx()));
    expect(results.size).toBeGreaterThan(50);
  });
});
