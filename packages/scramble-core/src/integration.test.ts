import { describe, expect, it } from 'vitest';
import { WCA_EVENT_IDS } from '@cubegin/shared/wca';
import { createDefaultScrambleGenerator } from './generator.js';
import type { RandomSource } from './random-source.js';

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

describe('default scramble generator', () => {
  it('generates a non-empty scramble for every WCA event', async () => {
    const generator = createDefaultScrambleGenerator({ random: cyclingRandom() });

    for (const eventId of WCA_EVENT_IDS) {
      const result = await generator.generate(
        eventId,
        eventId === '333mbld' ? { multiBlindCubeCount: 3 } : undefined,
      );

      expect(result.eventId).toBe(eventId);
      expect(result.scramble.trim().length).toBeGreaterThan(0);
    }
  }, 120_000);

  it('generates unique batch strings', async () => {
    const generator = createDefaultScrambleGenerator({ random: createSeededRandom(0x555) });
    const batch = await generator.generateBatch('555', 5);

    expect(new Set(batch.map((item) => item.scramble)).size).toBe(5);
  });

  it('requires a multi-blind cube count for 333mbld', async () => {
    const generator = createDefaultScrambleGenerator({ random: cyclingRandom() });

    await expect(generator.generate('333mbld')).rejects.toThrow(
      "@cubegin/scramble-core: event '333mbld' requires multiBlindCubeCount",
    );
  });
});

const createSeededRandom = (seed: number): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

      return state % maxExclusive;
    },
  };
};
