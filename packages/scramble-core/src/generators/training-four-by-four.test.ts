import { createCubeDefinition } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import { TRAINING_SCRAMBLE_TYPE_IDS } from '../catalog.js';
import { createDefaultScrambleGenerator } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import {
  doesFourByFourTrainingStateMatch,
  getFourByFourTrainingCaseDefinitions,
  type FourByFourTrainingScrambleTypeId,
} from './training-four-by-four.js';

const FOUR_BY_FOUR_TYPES = TRAINING_SCRAMBLE_TYPE_IDS.filter(
  (id): id is FourByFourTrainingScrambleTypeId => id.startsWith('444.'),
);

const createSeededRandom = (seed = 0x444): RandomSource => {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

describe('4x4 training scrambles', () => {
  it('generates every accepted type as a parseable constrained state', async () => {
    const cube = createCubeDefinition(4, ['444']);
    expect(FOUR_BY_FOUR_TYPES).toHaveLength(14);

    for (const scrambleTypeId of FOUR_BY_FOUR_TYPES) {
      const generated = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const repeated = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(generated, scrambleTypeId).toEqual(repeated);
      expect(generated.scramble.length, scrambleTypeId).toBeGreaterThan(2);
      expect(
        () => cube.applyAlgorithm(cube.createSolvedState(), generated.scramble),
        scrambleTypeId,
      ).not.toThrow();
      expect(
        doesFourByFourTrainingStateMatch(scrambleTypeId, generated.scramble),
        scrambleTypeId,
      ).toBe(true);
    }
  }, 120_000);

  it('exposes and honors stable POLL and PPLL cases', async () => {
    const pollCases = getFourByFourTrainingCaseDefinitions('444.poll');
    const ppllCases = getFourByFourTrainingCaseDefinitions('444.ppll');
    expect(pollCases).toHaveLength(54);
    expect(ppllCases).toHaveLength(43);

    for (const [scrambleTypeId, selectedCase] of [
      ['444.poll', pollCases[17]],
      ['444.ppll', ppllCases[31]],
    ] as const) {
      const generated = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId, { enabledCaseIds: [selectedCase.id] });

      expect(generated.caseId).toBe(selectedCase.id);
      expect(doesFourByFourTrainingStateMatch(scrambleTypeId, generated.scramble)).toBe(true);
    }
  }, 60_000);
});
