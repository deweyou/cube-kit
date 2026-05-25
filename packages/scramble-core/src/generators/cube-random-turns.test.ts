import { describe, expect, it } from 'vitest';
import { parseCubeAlgorithm } from '@cubekit/scramble-puzzle';
import { generateCubeRandomTurnScramble } from './cube-random-turns.js';
import type { RandomSource } from '../random-source.js';

const axisByFace = new Map([
  ['R', 0],
  ['L', 0],
  ['U', 1],
  ['D', 1],
  ['F', 2],
  ['B', 2],
]);

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

const sequenceRandom = (values: readonly number[]): RandomSource => {
  let index = 0;
  return {
    nextInt(maxExclusive) {
      const next = values[index % values.length] ?? 0;
      index += 1;
      return next % maxExclusive;
    },
  };
};

const constantRandom = (maxCalls = 400): RandomSource => {
  let calls = 0;
  return {
    nextInt() {
      calls += 1;
      if (calls > maxCalls) {
        throw new Error('constant random source was called too many times');
      }
      return 0;
    },
  };
};

describe('generateCubeRandomTurnScramble', () => {
  it('generates TNoodle-length random-turn scrambles', () => {
    const fiveByFive = generateCubeRandomTurnScramble({
      size: 5,
      length: 60,
      random: cyclingRandom(),
    });
    const sixBySix = generateCubeRandomTurnScramble({
      size: 6,
      length: 80,
      random: sequenceRandom([0, 2, 0]),
    });
    const sevenBySeven = generateCubeRandomTurnScramble({
      size: 7,
      length: 100,
      random: sequenceRandom([0, 2, 0]),
    });

    expect(fiveByFive.split(/\s+/)).toHaveLength(60);
    expect(sixBySix.split(/\s+/)).toHaveLength(80);
    expect(sevenBySeven.split(/\s+/)).toHaveLength(100);
  });

  it('produces parseable cube moves', () => {
    const scramble = generateCubeRandomTurnScramble({
      size: 7,
      length: 100,
      random: cyclingRandom(),
    });
    expect(parseCubeAlgorithm(scramble)).toHaveLength(100);
  });

  it('does not emit consecutive moves on the same axis', () => {
    const scramble = generateCubeRandomTurnScramble({
      size: 7,
      length: 100,
      random: cyclingRandom(),
    });
    const moves = parseCubeAlgorithm(scramble);

    for (let index = 1; index < moves.length; index += 1) {
      expect(axisByFace.get(moves[index]?.face)).not.toBe(
        axisByFace.get(moves[index - 1]?.face),
      );
    }
  });

  it('limits 5x5 wide moves to width 2 notation', () => {
    const scramble = generateCubeRandomTurnScramble({
      size: 5,
      length: 60,
      random: cyclingRandom(),
    });
    const moves = parseCubeAlgorithm(scramble);

    expect(moves.every((move) => move.width <= 2)).toBe(true);
    expect(scramble).toContain('w');
    expect(scramble).not.toMatch(/\b3[RUFLDB]w/);
  });

  it('can emit width 3 notation for 6x6 and 7x7', () => {
    const sixBySix = generateCubeRandomTurnScramble({
      size: 6,
      length: 80,
      random: sequenceRandom([0, 2, 0]),
    });
    const sevenBySeven = generateCubeRandomTurnScramble({
      size: 7,
      length: 100,
      random: sequenceRandom([0, 2, 0]),
    });

    expect(sixBySix).toMatch(/\b3[RUFLDB]w/);
    expect(sevenBySeven).toMatch(/\b3[RUFLDB]w/);
  });

  it.each([4, 8, 5.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid cube size %s',
    (size) => {
      expect(() =>
        generateCubeRandomTurnScramble({
          size,
          length: 60,
          random: cyclingRandom(),
        }),
      ).toThrow(
        '@cubekit/scramble-core: cube random-turn size must be 5, 6, or 7',
      );
    },
  );

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid scramble length %s',
    (length) => {
      expect(() =>
        generateCubeRandomTurnScramble({
          size: 5,
          length,
          random: cyclingRandom(),
        }),
      ).toThrow(
        '@cubekit/scramble-core: cube random-turn length must be a non-negative safe integer',
      );
    },
  );

  it('allows zero-length scrambles', () => {
    expect(
      generateCubeRandomTurnScramble({
        size: 5,
        length: 0,
        random: cyclingRandom(),
      }),
    ).toBe('');
  });

  it('does not hang with a constant random source', () => {
    const scramble = generateCubeRandomTurnScramble({
      size: 7,
      length: 100,
      random: constantRandom(),
    });

    expect(parseCubeAlgorithm(scramble)).toHaveLength(100);
  });
});
