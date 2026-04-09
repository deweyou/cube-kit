import { describe, expect, it } from 'vitest';
import { generatePyram } from '../../src/generators/pyram';

const BODY_RE = /^[ULRB]'?$/;
const TIP_RE = /^[ulrb]'?$/;

describe('generatePyram', () => {
  it('returns a non-empty string', () => {
    expect(generatePyram().length).toBeGreaterThan(0);
  });

  it('body moves use uppercase ULRB with optional prime', () => {
    const tokens = generatePyram().split(' ');
    const bodyMoves = tokens.filter((t) => /^[ULRB]/.test(t));
    for (const t of bodyMoves) expect(t).toMatch(BODY_RE);
    expect(bodyMoves.length).toBeGreaterThanOrEqual(6);
  });

  it('tip moves (if any) use lowercase ulrb with optional prime', () => {
    const tokens = generatePyram().split(' ');
    const tips = tokens.filter((t) => /^[ulrb]/.test(t));
    for (const t of tips) expect(t).toMatch(TIP_RE);
    expect(tips.length).toBeLessThanOrEqual(4);
  });

  it('produces varied results', () => {
    const results = new Set(Array.from({ length: 100 }, () => generatePyram()));
    expect(results.size).toBeGreaterThan(20);
  });
});
