import { createFtoDefinition, parseFtoAlgorithm } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import { createDefaultScrambleGenerator } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import { doesFtoTrainingStateMatch, getFtoTrainingCaseDefinitions } from './training-fto.js';

const TRAINING_TYPES = [
  'fto.l3t',
  'fto.l3t_lbt',
  'fto.tcp',
  'fto.edges_only',
  'fto.centers_only',
  'fto.corners_only',
] as const;

const createSeededRandom = (seed = 0x66746f): RandomSource => {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

describe('FTO training scrambles', () => {
  it.each(TRAINING_TYPES)(
    'generates deterministic solved-family constrained %s states',
    async (scrambleTypeId) => {
      const first = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const second = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(first).toEqual(second);
      expect(first.scramble.length).toBeGreaterThan(0);
      expect(() => parseFtoAlgorithm(first.scramble)).not.toThrow();
      expect(() =>
        createFtoDefinition().applyAlgorithm(
          createFtoDefinition().createSolvedState(),
          first.scramble,
        ),
      ).not.toThrow();
      expect(doesFtoTrainingStateMatch(scrambleTypeId, first.scramble)).toBe(true);
    },
    30_000,
  );

  it('exposes stable L3T, L3T plus LBT, and TCP cases and honors selection', async () => {
    const expectedCounts = {
      'fto.l3t': 12,
      'fto.l3t_lbt': 96,
      'fto.tcp': 6,
    } as const;

    for (const scrambleTypeId of ['fto.l3t', 'fto.l3t_lbt', 'fto.tcp'] as const) {
      const cases = getFtoTrainingCaseDefinitions(scrambleTypeId);
      const selectedCase = cases[Math.floor(cases.length / 2)];
      expect(cases).toHaveLength(expectedCounts[scrambleTypeId]);

      const generated = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId, { enabledCaseIds: [selectedCase.id] });

      expect(generated.caseId).toBe(selectedCase.id);
      expect(doesFtoTrainingStateMatch(scrambleTypeId, generated.scramble)).toBe(true);
    }
  }, 30_000);

  it('rejects empty and unknown FTO case filters', async () => {
    const generator = createDefaultScrambleGenerator({ random: createSeededRandom() });

    await expect(generator.generateType('fto.l3t', { enabledCaseIds: [] })).rejects.toThrow(
      'enabledCaseIds must contain at least one case id',
    );
    await expect(
      generator.generateType('fto.tcp', { enabledCaseIds: ['fto.tcp.unknown'] }),
    ).rejects.toThrow("unknown case id 'fto.tcp.unknown'");
  });
});
