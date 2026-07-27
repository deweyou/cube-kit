import { parseSkewbAlgorithm } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import { createDefaultScrambleGenerator } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import { doesSkewbTrainingStateMatch, getSkewbTrainingCaseDefinitions } from './training-skewb.js';

const createSeededRandom = (seed = 0x5ceb): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

describe('Skewb training scrambles', () => {
  it.each(['skewb.l2l', 'skewb.no_bar'] as const)(
    'generates deterministic constrained %s states',
    async (scrambleTypeId) => {
      const first = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const second = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(first).toEqual(second);
      expect(parseSkewbAlgorithm(first.scramble)).toHaveLength(11);
      expect(doesSkewbTrainingStateMatch(scrambleTypeId, first.scramble)).toBe(true);
    },
  );

  it('exposes and honors the complete structured L2L case set', async () => {
    const cases = getSkewbTrainingCaseDefinitions('skewb.l2l');
    const selectedCase = cases[42];
    expect(cases).toHaveLength(1_620);

    const generated = await createDefaultScrambleGenerator({
      random: createSeededRandom(),
    }).generateType('skewb.l2l', { enabledCaseIds: [selectedCase.id] });

    expect(generated.caseId).toBe(selectedCase.id);
    expect(doesSkewbTrainingStateMatch('skewb.l2l', generated.scramble)).toBe(true);
  });
});
