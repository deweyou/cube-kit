import { parseSquareOneAlgorithm } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import { createDefaultScrambleGenerator } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import {
  doesSquareOneTrainingStateMatch,
  getSquareOneTrainingCaseDefinitions,
  getSquareOneTrainingStateSnapshot,
} from './training-square-one.js';

const createSeededRandom = (seed = 0x5a1): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

describe('Square-1 training scrambles', () => {
  it.each(['sq1.cube_shape', 'sq1.csp', 'sq1.pbl'] as const)(
    'generates deterministic constrained %s states',
    async (scrambleTypeId) => {
      const first = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const second = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(first).toEqual(second);
      expect(() => parseSquareOneAlgorithm(first.scramble)).not.toThrow();
      expect(doesSquareOneTrainingStateMatch(scrambleTypeId, first.scramble)).toBe(true);

      const state = getSquareOneTrainingStateSnapshot(first.scramble);
      expect(state.shapeCoordinate & 1).toBe(state.parity);
      expect(state.pieces).toHaveLength(24);
    },
  );

  it('exposes and honors stable CSP shapes and PBL cases', async () => {
    const cspCases = getSquareOneTrainingCaseDefinitions('sq1.csp');
    const pblCases = getSquareOneTrainingCaseDefinitions('sq1.pbl');
    expect(cspCases).toHaveLength(90);
    expect(pblCases).toHaveLength(21);

    for (const [scrambleTypeId, selectedCase] of [
      ['sq1.csp', cspCases[12]],
      ['sq1.pbl', pblCases[8]],
    ] as const) {
      const generated = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId, { enabledCaseIds: [selectedCase.id] });

      expect(generated.caseId).toBe(selectedCase.id);
      expect(doesSquareOneTrainingStateMatch(scrambleTypeId, generated.scramble)).toBe(true);
    }
  });
});
