import { describe, expect, it } from 'vitest';
import { parseCubeAlgorithm } from '@cubekit/scramble-puzzle';
import { generateCubeRandomTurnScramble } from './cube-random-turns.js';
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

describe('generateCubeRandomTurnScramble', () => {
  it('generates TNoodle-length random-turn scrambles', () => {
    expect(generateCubeRandomTurnScramble({ size: 5, length: 60, random: cyclingRandom() }).split(/\s+/)).toHaveLength(60);
    expect(generateCubeRandomTurnScramble({ size: 6, length: 80, random: cyclingRandom() }).split(/\s+/)).toHaveLength(80);
    expect(generateCubeRandomTurnScramble({ size: 7, length: 100, random: cyclingRandom() }).split(/\s+/)).toHaveLength(100);
  });

  it('produces parseable cube moves', () => {
    const scramble = generateCubeRandomTurnScramble({ size: 7, length: 100, random: cyclingRandom() });
    expect(parseCubeAlgorithm(scramble)).toHaveLength(100);
  });
});
