import { createMegaminxDefinition, parseMegaminxAlgorithm } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import { createDefaultScrambleGenerator } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import {
  doesMegaminxTrainingStateMatch,
  getMegaminxTrainingCaseDefinitions,
} from './training-megaminx.js';

const createSeededRandom = (seed = 0x6e61): RandomSource => {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

describe('Megaminx training scrambles', () => {
  it.each(['minx.subset.ru', 'minx.s2l', 'minx.lsll', 'minx.pll', 'minx.ll'] as const)(
    'generates deterministic constrained %s states',
    async (scrambleTypeId) => {
      const first = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const second = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(first).toEqual(second);
      expect(() => parseMegaminxAlgorithm(first.scramble)).not.toThrow();
      expect(() =>
        createMegaminxDefinition().applyAlgorithm(
          createMegaminxDefinition().createSolvedState(),
          first.scramble,
        ),
      ).not.toThrow();
      expect(doesMegaminxTrainingStateMatch(scrambleTypeId, first.scramble)).toBe(true);
    },
  );

  it('exposes stable LSLL, PLL, and LL classifications and honors selection', async () => {
    const expectedCounts = {
      'minx.lsll': 216,
      'minx.pll': 3_599,
      'minx.ll': 1_296,
    } as const;

    for (const scrambleTypeId of ['minx.lsll', 'minx.pll', 'minx.ll'] as const) {
      const cases = getMegaminxTrainingCaseDefinitions(scrambleTypeId);
      const selectedCase = cases[Math.floor(cases.length / 2)];
      expect(cases).toHaveLength(expectedCounts[scrambleTypeId]);

      const generated = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId, { enabledCaseIds: [selectedCase.id] });

      expect(generated.caseId).toBe(selectedCase.id);
      expect(doesMegaminxTrainingStateMatch(scrambleTypeId, generated.scramble)).toBe(true);
    }
  }, 30_000);
});
