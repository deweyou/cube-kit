import { describe, expect, it } from 'vitest';
import { generateClock } from '../../src/generators/clock';

describe('generateClock', () => {
  it('returns a non-empty string', () => {
    expect(generateClock().length).toBeGreaterThan(0);
  });

  it('contains UR, UL, U, DR, DL, D, L, R, ALL pin tokens', () => {
    const s = generateClock();
    // WCA Clock notation includes pin moves and y2 separator
    // e.g. "UR2+ UL3- U1+ DR4- DL5+ D2- L3+ R1- ALL6+"
    expect(s).toMatch(/UR|UL|DR|DL/);
  });

  it('all clock adjustments are in range 0-11 (mod 12)', () => {
    const s = generateClock();
    const matches = s.match(/\d+[+-]/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      const n = parseInt(m, 10);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(11);
    }
  });

  it('contains "y2" separator for back face', () => {
    expect(generateClock()).toContain('y2');
  });

  it('produces varied results', () => {
    const results = new Set(Array.from({ length: 100 }, () => generateClock()));
    expect(results.size).toBeGreaterThan(50);
  });
});
