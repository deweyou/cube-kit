import { describe, expect, it } from 'vitest';
import { createDefaultScrambleGenerator, createScrambleGenerator } from './generator.js';
import { createMathRandomSource } from './random-source.js';
import type { RandomSource } from './random-source.js';

const deterministicRandom: RandomSource = {
  nextInt(maxExclusive) {
    return Math.max(0, maxExclusive - 1);
  },
};

describe('createScrambleGenerator', () => {
  it('throws for generators that are not registered', async () => {
    const generator = createScrambleGenerator({ random: deterministicRandom, generators: {} });

    await expect(generator.generate('333')).rejects.toThrow(
      "@cubegin/scramble-core: event '333' has no generator",
    );
  });

  it('uses default random for registered generation', async () => {
    const generator = createScrambleGenerator({
      random: deterministicRandom,
      generators: {
        333({ random }) {
          return { eventId: '333', scramble: `default-${random.nextInt(10)}` };
        },
      },
    });

    await expect(generator.generate('333')).resolves.toEqual({
      eventId: '333',
      scramble: 'default-9',
    });
  });

  it('uses per-call random over the default random', async () => {
    const overrideRandom: RandomSource = {
      nextInt() {
        return 0;
      },
    };
    const generator = createScrambleGenerator({
      random: deterministicRandom,
      generators: {
        333({ random }) {
          return { eventId: '333', scramble: `override-${random.nextInt(10)}` };
        },
      },
    });

    await expect(generator.generate('333', { random: overrideRandom })).resolves.toEqual({
      eventId: '333',
      scramble: 'override-0',
    });
  });

  it('allows async registered generation', async () => {
    const generator = createScrambleGenerator({
      random: deterministicRandom,
      generators: {
        async 333({ random }) {
          return { eventId: '333', scramble: `async-${random.nextInt(10)}` };
        },
      },
    });

    await expect(generator.generate('333')).resolves.toEqual({
      eventId: '333',
      scramble: 'async-9',
    });
  });

  it('returns unique batch scramble strings and retries duplicates', async () => {
    let calls = 0;
    const generator = createScrambleGenerator({
      random: deterministicRandom,
      generators: {
        333() {
          const scrambleIndex = Math.floor(calls / 2);
          calls += 1;
          return { eventId: '333', scramble: `scramble-${scrambleIndex}` };
        },
      },
    });

    await expect(generator.generateBatch('333', 3)).resolves.toEqual([
      { eventId: '333', scramble: 'scramble-0' },
      { eventId: '333', scramble: 'scramble-1' },
      { eventId: '333', scramble: 'scramble-2' },
    ]);
    expect(calls).toBe(5);
  });

  it('throws for invalid batch counts', async () => {
    const generator = createScrambleGenerator({
      random: deterministicRandom,
      generators: {
        333() {
          return { eventId: '333', scramble: 'valid' };
        },
      },
    });

    for (const count of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      await expect(generator.generateBatch('333', count)).rejects.toThrow(
        '@cubegin/scramble-core: batch count must be a non-negative safe integer',
      );
    }
  });

  it('throws when unique batch scrambles cannot be generated within the attempt limit', async () => {
    let calls = 0;
    const generator = createScrambleGenerator({
      random: deterministicRandom,
      generators: {
        333() {
          calls += 1;
          return { eventId: '333', scramble: 'duplicate' };
        },
      },
    });

    await expect(generator.generateBatch('333', 2)).rejects.toThrow(
      '@cubegin/scramble-core: generated 1 unique scrambles after 100 attempts',
    );
    expect(calls).toBe(100);
  });
});

describe('createDefaultScrambleGenerator', () => {
  it('requires a cube count for multi-blind scrambles', async () => {
    const generator = createDefaultScrambleGenerator({ random: deterministicRandom });

    await expect(generator.generate('333mbld')).rejects.toThrow(
      "@cubegin/scramble-core: event '333mbld' requires multiBlindCubeCount",
    );
  });

  it('generates multi-blind scrambles with the requested cube count', async () => {
    const generator = createDefaultScrambleGenerator({ random: deterministicRandom });

    const scramble = await generator.generate('333mbld', { multiBlindCubeCount: 2 });

    expect(scramble.eventId).toBe('333mbld');
    expect(scramble.scramble.split(/\n/)).toHaveLength(2);
  });

  it('rejects invalid 5x5 blind orientation indexes from custom random sources', async () => {
    const generator = createDefaultScrambleGenerator({
      random: {
        nextInt(maxExclusive) {
          return maxExclusive;
        },
      },
    });

    await expect(generator.generate('555bld')).rejects.toThrow(
      '@cubegin/scramble-core: random source returned 24 for max 24',
    );
  });

  it('appends a 5x5 blind orientation sequence without repeating its axis at the tail', async () => {
    let calls = 0;
    const generator = createDefaultScrambleGenerator({
      random: {
        nextInt(maxExclusive) {
          calls += 1;
          return calls === 1 ? 1 : 0;
        },
      },
    });

    const scramble = await generator.generate('555bld');
    const moves = scramble.scramble.split(/\s+/);

    expect(scramble.eventId).toBe('555bld');
    expect(moves.at(-1)).toBe('3Uw');
    expect(moves.at(-2)).not.toMatch(/[UD]/);
  });
});

describe('createMathRandomSource', () => {
  it('throws for invalid max values', () => {
    const random = createMathRandomSource();

    for (const maxExclusive of [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => random.nextInt(maxExclusive)).toThrow(
        '@cubegin/scramble-core: random maxExclusive must be a positive safe integer',
      );
    }
  });

  it('returns values in the requested exclusive range', () => {
    const random = createMathRandomSource();

    expect(random.nextInt(1)).toBe(0);
  });
});
