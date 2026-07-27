import { describe, expect, it } from 'vitest';
import { TRAINING_SCRAMBLE_TYPE_IDS, getScrambleTypeDefinition } from './catalog.js';
import { createDefaultScrambleGenerator, type TrainingScrambleResult } from './generator.js';
import type { RandomSource } from './random-source.js';

const createSeededRandom = (seed = 0x94c0ffee): RandomSource => {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state % maxExclusive;
    },
  };
};

describe('complete training catalog generation', () => {
  it('generates a unique two-item batch for every accepted training type', async () => {
    const generator = createDefaultScrambleGenerator({ random: createSeededRandom() });

    for (const scrambleTypeId of TRAINING_SCRAMBLE_TYPE_IDS) {
      const definition = getScrambleTypeDefinition(scrambleTypeId);
      let batch: readonly TrainingScrambleResult[];
      try {
        batch = await generator.generateTypeBatch(scrambleTypeId, 2);
      } catch (error) {
        throw new Error(`training batch failed for ${scrambleTypeId}`, { cause: error });
      }

      expect(batch).toHaveLength(2);
      expect(new Set(batch.map(({ scramble }) => scramble)).size).toBe(2);
      expect(
        batch.every(
          (result) =>
            result.scrambleTypeId === scrambleTypeId &&
            result.eventId === definition.baseEventId &&
            result.scramble.length > 0,
        ),
      ).toBe(true);
    }
  }, 120_000);
});
