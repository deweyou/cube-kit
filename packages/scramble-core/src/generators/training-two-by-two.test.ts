import { createCubeDefinition, type CubeState } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import { TRAINING_SCRAMBLE_TYPE_IDS } from '../catalog.js';
import { createDefaultScrambleGenerator } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import {
  doesTwoByTwoTrainingStateMatch,
  getTwoByTwoTrainingCaseDefinitions,
  type TwoByTwoTrainingScrambleTypeId,
} from './training-two-by-two.js';

const TWO_BY_TWO_TYPES = TRAINING_SCRAMBLE_TYPE_IDS.filter(
  (id): id is TwoByTwoTrainingScrambleTypeId => id.startsWith('222.'),
);

const createSeededRandom = (seed = 0x222): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

const twoByTwo = createCubeDefinition(2, ['222']);

const stateFromScramble = (scramble: string): CubeState =>
  twoByTwo.applyAlgorithm(twoByTwo.createSolvedState(), scramble);

const completeFaceCount = (state: CubeState): number =>
  state.image.filter((face) => face.flat().every((sticker) => sticker === face[0]?.[0])).length;

const maximumFaceColorCount = (state: CubeState): number =>
  Math.max(
    ...state.image.map((face) => {
      const counts = new Map<string, number>();
      face.flat().forEach((sticker) => counts.set(sticker, (counts.get(sticker) ?? 0) + 1));
      return Math.max(...counts.values());
    }),
  );

const hasNoAdjacentBar = (state: CubeState): boolean =>
  state.image.every((face) => {
    const [topLeft, topRight, bottomLeft, bottomRight] = face.flat();
    return (
      topLeft !== topRight &&
      topLeft !== bottomLeft &&
      topRight !== bottomRight &&
      bottomLeft !== bottomRight
    );
  });

describe('2x2 training scrambles', () => {
  it('covers every accepted 2x2 type with deterministic constrained states', async () => {
    expect(TWO_BY_TWO_TYPES).toHaveLength(10);

    for (const scrambleTypeId of TWO_BY_TWO_TYPES) {
      const first = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const second = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(first, scrambleTypeId).toEqual(second);
      expect(first.scramble.split(/\s+/)).toHaveLength(11);
      expect(doesTwoByTwoTrainingStateMatch(scrambleTypeId, first.scramble), scrambleTypeId).toBe(
        true,
      );
      expect(first.caseId === undefined).toBe(scrambleTypeId === '222.no_bar');
    }
  }, 60_000);

  it('honors exact stable cases', async () => {
    const [selectedCase] = getTwoByTwoTrainingCaseDefinitions('222.tcll_plus');
    const generated = await createDefaultScrambleGenerator({
      random: createSeededRandom(),
    }).generateType('222.tcll_plus', { enabledCaseIds: [selectedCase.id] });

    expect(generated.caseId).toBe(selectedCase.id);
    expect(doesTwoByTwoTrainingStateMatch('222.tcll_plus', generated.scramble)).toBe(true);
  });

  it('moves the trained bottom layer to the requested physical color', async () => {
    const generated = await createDefaultScrambleGenerator({
      random: createSeededRandom(),
    }).generateType('222.cll', {
      orientation: { bottomColor: 'white', frontColor: 'green' },
    });
    const state = stateFromScramble(generated.scramble);

    expect(generated.orientation).toEqual({
      bottomColor: 'white',
      frontColor: 'green',
    });
    expect(state.image[1]?.flat().every((sticker) => sticker === 'U')).toBe(true);
    expect(
      doesTwoByTwoTrainingStateMatch('222.cll', generated.scramble, generated.orientation),
    ).toBe(true);
  });

  it('matches independent sticker-level stage signatures', async () => {
    for (const scrambleTypeId of ['222.cll', '222.eg1', '222.eg2'] as const) {
      const generator = createDefaultScrambleGenerator({ random: createSeededRandom() });
      for (let sample = 0; sample < 12; sample += 1) {
        const generated = await generator.generateType(scrambleTypeId);
        expect(
          completeFaceCount(stateFromScramble(generated.scramble)),
          scrambleTypeId,
        ).toBeGreaterThan(0);
      }
    }

    const pbl = await createDefaultScrambleGenerator({
      random: createSeededRandom(),
    }).generateType('222.pbl');
    expect(completeFaceCount(stateFromScramble(pbl.scramble))).toBeGreaterThanOrEqual(2);

    for (const scrambleTypeId of [
      '222.tcll_plus',
      '222.tcll_minus',
      '222.ls',
      '222.teg1',
      '222.teg2',
    ] as const) {
      const generated = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      expect(maximumFaceColorCount(stateFromScramble(generated.scramble)), scrambleTypeId).toBe(3);
    }
  }, 30_000);

  it('generates visually bar-free no-bar states', async () => {
    const generator = createDefaultScrambleGenerator({ random: createSeededRandom() });

    for (let sample = 0; sample < 30; sample += 1) {
      const generated = await generator.generateType('222.no_bar');
      expect(hasNoAdjacentBar(stateFromScramble(generated.scramble)), generated.scramble).toBe(
        true,
      );
    }
  });
});
