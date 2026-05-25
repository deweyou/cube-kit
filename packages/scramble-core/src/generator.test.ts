import { describe, expect, it } from 'vitest';
import { createScrambleGenerator } from './generator.js';
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
      "@cubekit/scramble-core: event '333' has no generator",
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
        '@cubekit/scramble-core: batch count must be a non-negative safe integer',
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
      '@cubekit/scramble-core: generated 1 unique scrambles after 100 attempts',
    );
    expect(calls).toBe(100);
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
        '@cubekit/scramble-core: random maxExclusive must be a positive safe integer',
      );
    }
  });

  it('returns values in the requested exclusive range', () => {
    const random = createMathRandomSource();

    expect(random.nextInt(1)).toBe(0);
  });
});
