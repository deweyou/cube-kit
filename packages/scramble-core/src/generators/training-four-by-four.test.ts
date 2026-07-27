import { createCubeDefinition, type CubeState } from '@cubegin/scramble-puzzle';
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

const expectCenterSolvedEdgePairingState = (state: CubeState, solved: CubeState): void => {
  let changedEdgeStickerCount = 0;

  for (let face = 0; face < state.image.length; face += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const isCenter = row > 0 && row < 3 && column > 0 && column < 3;
        const isEdge =
          (row === 0 || row === 3 || column === 0 || column === 3) &&
          !((row === 0 || row === 3) && (column === 0 || column === 3));

        if (isCenter) {
          expect(state.image[face]?.[row]?.[column]).toBe(solved.image[face]?.[row]?.[column]);
        }
        if (isEdge && state.image[face]?.[row]?.[column] !== solved.image[face]?.[row]?.[column]) {
          changedEdgeStickerCount += 1;
        }
      }
    }
  }

  expect(changedEdgeStickerCount).toBeGreaterThan(0);
};

const changedStickerCounts = (
  state: CubeState,
  solved: CubeState,
): { centers: number; edges: number; corners: number } => {
  const counts = { centers: 0, edges: 0, corners: 0 };

  for (let face = 0; face < state.image.length; face += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        if (state.image[face]?.[row]?.[column] === solved.image[face]?.[row]?.[column]) continue;

        const onRowBoundary = row === 0 || row === 3;
        const onColumnBoundary = column === 0 || column === 3;
        if (!onRowBoundary && !onColumnBoundary) counts.centers += 1;
        else if (onRowBoundary && onColumnBoundary) counts.corners += 1;
        else counts.edges += 1;
      }
    }
  }

  return counts;
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
  }, 300_000);

  it('keeps centers solved in edge-pairing practice states', async () => {
    const cube = createCubeDefinition(4, ['444']);
    const solved = cube.createSolvedState();
    const generator = createDefaultScrambleGenerator({ random: createSeededRandom(42) });

    for (let sample = 0; sample < 30; sample += 1) {
      const generated = await generator.generateType('444.edge_pairing');
      expectCenterSolvedEdgePairingState(cube.applyAlgorithm(solved, generated.scramble), solved);
      expect(doesFourByFourTrainingStateMatch('444.edge_pairing', generated.scramble)).toBe(true);
    }
  });

  it('matches representative stage boundaries in the sticker model', async () => {
    const cube = createCubeDefinition(4, ['444']);
    const solved = cube.createSolvedState();

    for (const scrambleTypeId of [
      '444.centers_only',
      '444.edges_only',
      '444.ell',
      '444.ll',
      '444.poll',
      '444.ppll',
    ] as const) {
      const generated = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const counts = changedStickerCounts(cube.applyAlgorithm(solved, generated.scramble), solved);

      if (scrambleTypeId === '444.centers_only') {
        expect(counts.centers).toBeGreaterThan(0);
        expect(counts.edges).toBe(0);
        expect(counts.corners).toBe(0);
      } else if (scrambleTypeId === '444.edges_only' || scrambleTypeId === '444.ell') {
        expect(counts.centers).toBe(0);
        expect(counts.edges).toBeGreaterThan(0);
        expect(counts.corners).toBe(0);
      } else {
        expect(counts.centers).toBe(0);
      }
    }
  }, 60_000);

  it('moves last-layer training onto the requested physical bottom color', async () => {
    const cube = createCubeDefinition(4, ['444']);
    const generated = await createDefaultScrambleGenerator({
      random: createSeededRandom(),
    }).generateType('444.poll', {
      orientation: { bottomColor: 'white', frontColor: 'green' },
    });
    const state = cube.applyAlgorithm(cube.createSolvedState(), generated.scramble);

    expect(generated.orientation).toEqual({
      bottomColor: 'white',
      frontColor: 'green',
    });
    expect(state.image[1]?.flat().every((sticker) => sticker === 'U')).toBe(true);
    expect(
      doesFourByFourTrainingStateMatch('444.poll', generated.scramble, generated.orientation),
    ).toBe(true);
  });

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
