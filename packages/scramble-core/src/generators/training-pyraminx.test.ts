import { createPyraminxDefinition, parsePyraminxAlgorithm } from '@cubegin/scramble-puzzle';
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

  it('scrambles only the four tips in four-tips practice states', async () => {
    const pyraminx = createPyraminxDefinition();
    const solved = pyraminx.createSolvedState();
    const generator = createDefaultScrambleGenerator({ random: createSeededRandom() });
    const bodyStickerIndexes = [1, 2, 4, 5, 7, 8] as const;
    const tipStickerIndexes = [0, 3, 6] as const;

    for (let sample = 0; sample < 30; sample += 1) {
      const generated = await generator.generateType('pyram.four_tips');
      const state = pyraminx.applyAlgorithm(solved, generated.scramble);

      for (let face = 0; face < state.image.length; face += 1) {
        for (const sticker of bodyStickerIndexes) {
          expect(state.image[face]?.[sticker]).toBe(solved.image[face]?.[sticker]);
        }
      }
      expect(
        state.image.some((face, faceIndex) =>
          tipStickerIndexes.some((sticker) => face[sticker] !== solved.image[faceIndex]?.[sticker]),
        ),
      ).toBe(true);
    }
  });
});
