import { describe, expect, it } from 'vitest';
import { generateSq1 } from '../../src/generators/sq1';

describe('generateSq1', () => {
  it('returns a non-empty string', () => {
    expect(generateSq1().length).toBeGreaterThan(0);
  });

  it('tokens match Square-1 notation (x,y) separated by /', () => {
    const s = generateSq1();
    // Split by / giving "(x,y)" tokens (last may be empty)
    const parts = s.split('/').filter((p) => p.trim().length > 0);
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) {
      expect(part.trim()).toMatch(/^\(-?\d+,-?\d+\)$/);
    }
  });

  it('contains at least one / separator', () => {
    expect(generateSq1()).toContain('/');
  });

  it('produces varied results', () => {
    const results = new Set(Array.from({ length: 50 }, () => generateSq1()));
    expect(results.size).toBeGreaterThan(10);
  });
});
