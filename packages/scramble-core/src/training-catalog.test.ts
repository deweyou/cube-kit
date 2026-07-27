import { describe, expect, it } from 'vitest';
import { TRAINING_SCRAMBLE_TYPE_IDS, getScrambleTypeDefinition } from './catalog.js';
import { createDefaultScrambleGenerator, type TrainingScrambleResult } from './generator.js';
import { doesFourByFourTrainingStateMatch } from './generators/training-four-by-four.js';
import { doesSkewbTrainingStateMatch } from './generators/training-skewb.js';
import { doesThreeByThreeTrainingStateMatch } from './generators/training-three-by-three.js';
import { doesTwoByTwoTrainingStateMatch } from './generators/training-two-by-two.js';
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
  }, 300_000);

  it('preserves every orientation-enabled training constraint after remapping', async () => {
    const generator = createDefaultScrambleGenerator({ random: createSeededRandom(42) });
    const supportedTypes = TRAINING_SCRAMBLE_TYPE_IDS.filter(
      (id) => getScrambleTypeDefinition(id).orientationTarget !== undefined,
    );

    for (const scrambleTypeId of supportedTypes) {
      const generated = await generator.generateType(scrambleTypeId, {
        orientation: { bottomColor: 'white' },
      });
      const orientation = generated.orientation;
      expect(orientation, scrambleTypeId).toBeDefined();
      expect(orientation?.bottomColor, scrambleTypeId).toBe('white');
      expect(orientation?.frontColor, scrambleTypeId).not.toBe('yellow');
      expect(orientation?.frontColor, scrambleTypeId).not.toBe('white');

      const matches = scrambleTypeId.startsWith('222.')
        ? doesTwoByTwoTrainingStateMatch(
            scrambleTypeId as Parameters<typeof doesTwoByTwoTrainingStateMatch>[0],
            generated.scramble,
            orientation,
          )
        : scrambleTypeId.startsWith('333.')
          ? doesThreeByThreeTrainingStateMatch(
              scrambleTypeId as Parameters<typeof doesThreeByThreeTrainingStateMatch>[0],
              generated.scramble,
              orientation,
            )
          : scrambleTypeId.startsWith('444.')
            ? doesFourByFourTrainingStateMatch(
                scrambleTypeId as Parameters<typeof doesFourByFourTrainingStateMatch>[0],
                generated.scramble,
                orientation,
              )
            : doesSkewbTrainingStateMatch('skewb.l2l', generated.scramble);

      expect(matches, scrambleTypeId).toBe(true);
    }
  }, 120_000);
});
