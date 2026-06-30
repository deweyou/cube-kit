import { describe, expect, it } from 'vitest';
import { createFtoDefinition } from '@cubegin/scramble-puzzle';
import { FTO_SCRAMBLE_FACES, generateFtoScramble } from './fto.js';
import type { RandomSource } from '../random-source.js';

const cyclingRandom = (): RandomSource => {
  let n = 0;

  return {
    nextInt(maxExclusive) {
      const value = n % maxExclusive;
      n += 1;

      return value;
    },
  };
};

const zeroRandom: RandomSource = {
  nextInt() {
    return 0;
  },
};

describe('generateFtoScramble', () => {
  it('generates legal FTO notation at the default length', () => {
    const scramble = generateFtoScramble({ random: cyclingRandom() });
    const definition = createFtoDefinition();

    expect(scramble.split(/\s+/)).toHaveLength(30);
    expect(() => definition.applyAlgorithm(definition.createSolvedState(), scramble)).not.toThrow();
  });

  it('avoids immediate repeats of the same FTO face', () => {
    const scramble = generateFtoScramble({ random: cyclingRandom(), length: 40 });
    const faces = scramble.split(/\s+/).map((move) => move.replace("'", ''));

    for (let index = 1; index < faces.length; index += 1) {
      expect(faces[index]).not.toBe(faces[index - 1]);
    }
  });

  it('uses only the supported FTO face set', () => {
    const scramble = generateFtoScramble({ random: zeroRandom, length: 80 });
    const faces = new Set(scramble.split(/\s+/).map((move) => move.replace("'", '')));

    expect([...faces].sort()).toEqual([...FTO_SCRAMBLE_FACES].sort());
  });
});
