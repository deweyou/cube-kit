import { describe, expect, it } from 'vitest';
import type { RandomSource } from './random-source.js';
import {
  resolveTrainingOrientation,
  restoreCubeScrambleFromOrientation,
  transformCubeScrambleForOrientation,
} from './training-orientation.js';

const lastChoiceRandom: RandomSource = {
  nextInt(maxExclusive) {
    return maxExclusive - 1;
  },
};

describe('training orientation', () => {
  it('keeps the canonical yellow-bottom green-front orientation unchanged', () => {
    const orientation = resolveTrainingOrientation(
      { bottomColor: 'yellow', frontColor: 'green' },
      lastChoiceRandom,
    );

    expect(orientation).toEqual({ bottomColor: 'yellow', frontColor: 'green' });
    expect(transformCubeScrambleForOrientation("R U2 F' Lw 3Dw2 B", orientation)).toBe(
      "R U2 F' Lw 3Dw2 B",
    );
  });

  it('rotates cube moves into the requested physical color orientation', () => {
    const orientation = resolveTrainingOrientation(
      { bottomColor: 'white', frontColor: 'green' },
      lastChoiceRandom,
    );

    expect(transformCubeScrambleForOrientation("R U2 F' Lw 3Dw2 B", orientation)).toBe(
      "L D2 F' Rw 3Uw2 B",
    );
  });

  it('round-trips outer, wide, rotation, and slice notation', () => {
    const orientation = resolveTrainingOrientation(
      { bottomColor: 'red', frontColor: 'white' },
      lastChoiceRandom,
    );
    const scramble = "R U2 F' Lw 3Dw2 B x y' z2 M E' S2";

    expect(
      restoreCubeScrambleFromOrientation(
        transformCubeScrambleForOrientation(scramble, orientation),
        orientation,
      ),
    ).toBe(scramble);
  });

  it('resolves an omitted front color from the four adjacent colors', () => {
    expect(resolveTrainingOrientation({ bottomColor: 'yellow' }, lastChoiceRandom)).toEqual({
      bottomColor: 'yellow',
      frontColor: 'blue',
    });
  });

  it.each([
    [{ bottomColor: 'white', frontColor: 'white' }, 'must differ'],
    [{ bottomColor: 'white', frontColor: 'yellow' }, 'must be adjacent'],
    [{ bottomColor: 'purple' }, 'unsupported bottom color'],
    [{ bottomColor: 'yellow', frontColor: 'purple' }, 'unsupported front color'],
  ] as const)('rejects invalid orientation %o', (preference, diagnostic) => {
    expect(() => resolveTrainingOrientation(preference as never, lastChoiceRandom)).toThrow(
      diagnostic,
    );
  });
});
