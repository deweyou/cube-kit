import { createCubeDefinition, type CubeState } from '@cubegin/scramble-puzzle';
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

const expectCenterSolvedEdgePairingState = (state: CubeState, solved: CubeState): void => {
  const last = state.size - 1;
  let changedEdgeStickerCount = 0;

  for (let face = 0; face < state.image.length; face += 1) {
    for (let row = 0; row < state.size; row += 1) {
      for (let column = 0; column < state.size; column += 1) {
        const isCenter = row > 0 && row < last && column > 0 && column < last;
        const isEdge =
          (row === 0 || row === last || column === 0 || column === last) &&
          !((row === 0 || row === last) && (column === 0 || column === last));

        if (isCenter) {
          expect(state.image[face]?.[row]?.[column], `${state.size}x${state.size} center`).toBe(
            solved.image[face]?.[row]?.[column],
          );
        }
        if (isEdge && state.image[face]?.[row]?.[column] !== solved.image[face]?.[row]?.[column]) {
          changedEdgeStickerCount += 1;
        }
      }
    }
  }

  expect(changedEdgeStickerCount).toBeGreaterThan(0);
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
      const solved = cube.createSolvedState();
      const state = cube.applyAlgorithm(solved, first.scramble);

      expect(first).toEqual(second);
      expectCenterSolvedEdgePairingState(state, solved);
      expect(doesBigCubeTrainingStateMatch(scrambleTypeId, first.scramble)).toBe(true);

      const generator = createDefaultScrambleGenerator({ random: createSeededRandom(42) });
      for (let sample = 0; sample < 30; sample += 1) {
        const generated = await generator.generateType(scrambleTypeId);
        expectCenterSolvedEdgePairingState(cube.applyAlgorithm(solved, generated.scramble), solved);
        expect(doesBigCubeTrainingStateMatch(scrambleTypeId, generated.scramble)).toBe(true);
      }
    },
  );
});
