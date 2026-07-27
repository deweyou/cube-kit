import { parsePyraminxAlgorithm } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import { createDefaultScrambleGenerator } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import {
  doesPyraminxTrainingStateMatch,
  getPyraminxTrainingCaseDefinitions,
} from './training-pyraminx.js';

const createSeededRandom = (seed = 0x5a17): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

describe('Pyraminx training scrambles', () => {
  it.each(['pyram.l4e', 'pyram.four_tips', 'pyram.no_bar'] as const)(
    'generates deterministic constrained %s states',
    async (scrambleTypeId) => {
      const first = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const second = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(first).toEqual(second);
      expect(() => parsePyraminxAlgorithm(first.scramble)).not.toThrow();
      expect(doesPyraminxTrainingStateMatch(scrambleTypeId, first.scramble)).toBe(true);
    },
  );

  it('exposes and honors all 35 stable L4E cases', async () => {
    const cases = getPyraminxTrainingCaseDefinitions('pyram.l4e');
    const selectedCase = cases[20];
    expect(cases).toHaveLength(35);

    const generated = await createDefaultScrambleGenerator({
      random: createSeededRandom(),
    }).generateType('pyram.l4e', { enabledCaseIds: [selectedCase.id] });

    expect(generated.caseId).toBe(selectedCase.id);
    expect(doesPyraminxTrainingStateMatch('pyram.l4e', generated.scramble)).toBe(true);
  });
});
