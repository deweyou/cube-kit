import { describe, expect, it } from 'vitest';
import { parseClockAlgorithm } from '@cubegin/scramble-puzzle';
import { generateClockScramble } from './clock.js';
import type { RandomSource } from '../random-source.js';

const cyclingRandom = (): RandomSource => {
  let value = 0;
  return {
    nextInt(maxExclusive) {
      const next = value % maxExclusive;
      value += 1;
      return next;
    },
  };
};

describe('generateClockScramble', () => {
  it('generates parseable random-state Clock scrambles', () => {
    const random = cyclingRandom();
    const scramble = generateClockScramble({ random });

    expect(scramble).toContain('y2');
    expect(parseClockAlgorithm(scramble).length).toBe(scramble.split(/\s+/u).length);
  });

  it('omits zero turns while keeping the y2 side separator', () => {
    const scramble = generateClockScramble({ random: cyclingRandom() });
    const tokens = scramble.split(/\s+/u);

    expect(tokens).toContain('y2');
    expect(tokens.every((token) => !/0[+-]$/u.test(token))).toBe(true);
    expect(parseClockAlgorithm(scramble)).toHaveLength(tokens.length);
  });

  it('maps the deterministic random state to a stable solver solution', () => {
    const scramble = generateClockScramble({ random: cyclingRandom() });

    expect(scramble).toBe('DR1- DL3- U3- R2+ D5- L2+ y2 DR1+ DL1+ UL2- ALL1-');
  });
});
