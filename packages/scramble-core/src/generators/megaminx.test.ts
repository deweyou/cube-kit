import { describe, expect, it } from 'vitest';
import { generateMegaminxScramble } from './megaminx.js';
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

describe('generateMegaminxScramble', () => {
  it('generates TNoodle-shaped Megaminx scrambles', () => {
    const random = cyclingRandom();
    const scramble = generateMegaminxScramble({ random });

    expect(scramble.split('\n')).toHaveLength(7);
    expect(scramble.split(/\s+/)).toHaveLength(77);
  });

  it('emits 10 alternating R and D moves plus U per row', () => {
    const scramble = generateMegaminxScramble({ random: cyclingRandom() });

    expect(scramble.split('\n')[0]).toBe(
      "R++ D-- R++ D-- R++ D-- R++ D-- R++ D-- U'",
    );
  });

  it('maps the final row U direction from the last R/D random direction', () => {
    const random: RandomSource = {
      nextInt() {
        return 0;
      },
    };

    expect(generateMegaminxScramble({ random }).split('\n')[0].endsWith(' U')).toBe(true);
  });
});
