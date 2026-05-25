import { describe, expect, it } from 'vitest';
import { parseClockAlgorithm } from '@cubekit/scramble-puzzle';
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
  it('generates TNoodle-shaped Clock scrambles', () => {
    const random = cyclingRandom();

    expect(generateClockScramble({ random })).toMatch(/^UR\d[+-] DR\d[+-] DL\d[+-] UL\d[+-]/);
  });

  it('emits 9 moves, y2, and 5 moves', () => {
    const scramble = generateClockScramble({ random: cyclingRandom() });

    expect(scramble.split(/\s+/)).toHaveLength(15);
    expect(scramble.split(/\s+/)[9]).toBe('y2');
    expect(parseClockAlgorithm(scramble)).toHaveLength(15);
  });

  it('maps TNoodle random turn values to signed absolute notation', () => {
    const scramble = generateClockScramble({ random: cyclingRandom() });

    expect(scramble).toBe('UR5- DR4- DL3- UL2- U1- R0+ D1+ L2+ ALL3+ y2 U4+ R5+ D6+ L5- ALL4-');
  });
});
