import { describe, expect, it } from 'vitest';
import { createCubeDefinition, splitAlgorithm } from '@cubegin/scramble-puzzle';
import { getScrambleTypeDefinition, TRAINING_SCRAMBLE_TYPE_IDS } from '../catalog.js';
import { createDefaultScrambleGenerator } from '../generator.js';
import {
  doesThreeByThreeTrainingStateMatch,
  getThreeByThreeTrainingCaseDefinitions,
  type ThreeByThreeTrainingScrambleTypeId,
} from './training-three-by-three.js';
import type { RandomSource } from '../random-source.js';

const THREE_BY_THREE_TYPES = TRAINING_SCRAMBLE_TYPE_IDS.filter(
  (id): id is ThreeByThreeTrainingScrambleTypeId => id.startsWith('333.'),
);

const createSeededRandom = (seed = 0x333): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

describe('3x3 training scrambles', () => {
  it('covers the complete accepted 3x3 training catalog', () => {
    expect(THREE_BY_THREE_TYPES).toHaveLength(48);
  });

  it('generates deterministic, parseable, constrained scrambles for every type', async () => {
    const cube = createCubeDefinition(3, ['333']);

    for (const scrambleTypeId of THREE_BY_THREE_TYPES) {
      const first = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const second = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(first).toEqual(second);
      expect(first.scrambleTypeId).toBe(scrambleTypeId);
      expect(first.eventId).toBe('333');
      expect(first.scramble.trim().length).toBeGreaterThan(2);
      expect(() => cube.applyAlgorithm(cube.createSolvedState(), first.scramble)).not.toThrow();
      expect(
        doesThreeByThreeTrainingStateMatch(scrambleTypeId, first.scramble),
        scrambleTypeId,
      ).toBe(true);

      const definition = getScrambleTypeDefinition(scrambleTypeId);
      if (definition.caseSetId === undefined) {
        expect(first.caseId).toBeUndefined();
      } else {
        expect(
          getThreeByThreeTrainingCaseDefinitions(scrambleTypeId).some(
            ({ id }) => id === first.caseId,
          ),
        ).toBe(true);
      }
    }
  }, 120_000);

  it('honors enabled case ids and rejects unknown ids', async () => {
    const generator = createDefaultScrambleGenerator({ random: createSeededRandom() });
    const [selectedCase] = getThreeByThreeTrainingCaseDefinitions('333.pll');

    await expect(
      generator.generateType('333.pll', { enabledCaseIds: [selectedCase.id] }),
    ).resolves.toMatchObject({ caseId: selectedCase.id });
    await expect(
      generator.generateType('333.pll', { enabledCaseIds: ['333.pll.unknown'] }),
    ).rejects.toThrow("@cubegin/scramble-core: unknown case id '333.pll.unknown'");
  });

  it.each([
    ['333.subset.ru', /^(?:R|U)(?:2|')?$/],
    ['333.subset.lu', /^(?:L|U)(?:2|')?$/],
    ['333.subset.fru', /^(?:F|R|U)(?:2|')?$/],
    ['333.subset.rul', /^(?:R|U|L)(?:2|')?$/],
    ['333.subset.rrwu', /^(?:R|Rw|U)(?:2|')?$/],
    ['333.subset.mu', /^(?:M|U)(?:2|')?$/],
    ['333.subset.half_turn', /^(?:R|U|F|L|D|B)2$/],
    ['333.subset.domino', /^(?:(?:U|D)(?:2|')?|(?:R|F|L|B)2)$/],
  ] as const)(
    'keeps %s inside its accepted move generators',
    async (scrambleTypeId, movePattern) => {
      const generated = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(splitAlgorithm(generated.scramble).every((move) => movePattern.test(move))).toBe(true);
    },
  );
});
