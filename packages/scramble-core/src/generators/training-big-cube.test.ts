import { createCubeDefinition } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import { createDefaultScrambleGenerator } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import { doesBigCubeTrainingStateMatch } from './training-big-cube.js';

const createSeededRandom = (seed = 0xb16): RandomSource => {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

describe('big-cube edge-pairing templates', () => {
  it.each([
    ['555.edge_pairing', 5],
    ['666.edge_pairing', 6],
    ['777.edge_pairing', 7],
  ] as const)(
    'generates deterministic, size-correct %s templates',
    async (scrambleTypeId, size) => {
      const first = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const second = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const cube = createCubeDefinition(size, [scrambleTypeId.slice(0, 3) as never]);

      expect(first).toEqual(second);
      expect(() => cube.applyAlgorithm(cube.createSolvedState(), first.scramble)).not.toThrow();
      expect(doesBigCubeTrainingStateMatch(scrambleTypeId, first.scramble)).toBe(true);
    },
  );
});
