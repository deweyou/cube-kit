import { describe, expect, it } from 'vitest';
import { TRAINING_SCRAMBLE_TYPE_IDS } from '../catalog.js';
import { createDefaultScrambleGenerator } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import {
  doesTwoByTwoTrainingStateMatch,
  getTwoByTwoTrainingCaseDefinitions,
  type TwoByTwoTrainingScrambleTypeId,
} from './training-two-by-two.js';

const TWO_BY_TWO_TYPES = TRAINING_SCRAMBLE_TYPE_IDS.filter(
  (id): id is TwoByTwoTrainingScrambleTypeId => id.startsWith('222.'),
);

const createSeededRandom = (seed = 0x222): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

describe('2x2 training scrambles', () => {
  it('covers every accepted 2x2 type with deterministic constrained states', async () => {
    expect(TWO_BY_TWO_TYPES).toHaveLength(10);

    for (const scrambleTypeId of TWO_BY_TWO_TYPES) {
      const first = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const second = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(first, scrambleTypeId).toEqual(second);
      expect(first.scramble.split(/\s+/)).toHaveLength(11);
      expect(doesTwoByTwoTrainingStateMatch(scrambleTypeId, first.scramble), scrambleTypeId).toBe(
        true,
      );
      expect(first.caseId === undefined).toBe(scrambleTypeId === '222.no_bar');
    }
  }, 60_000);

  it('honors exact stable cases', async () => {
    const [selectedCase] = getTwoByTwoTrainingCaseDefinitions('222.tcll_plus');
    const generated = await createDefaultScrambleGenerator({
      random: createSeededRandom(),
    }).generateType('222.tcll_plus', { enabledCaseIds: [selectedCase.id] });

    expect(generated.caseId).toBe(selectedCase.id);
    expect(doesTwoByTwoTrainingStateMatch('222.tcll_plus', generated.scramble)).toBe(true);
  });
});
